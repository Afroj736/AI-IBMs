from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.category import Category
from app.models.item import Item
from app.schemas.catalog import (
    BrandCreate,
    BrandResponse,
    CatalogBulkCreate,
    CatalogBulkResponse,
    CategoryCreate,
    CategoryResponse,
)


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().split())


def _brand_product_count(db: Session, brand_name: str) -> int:
    return (
        db.query(func.count(Item.id))
        .filter(func.lower(Item.brand) == brand_name.lower())
        .scalar()
        or 0
    )


def _category_stats(db: Session, category_name: str) -> tuple[int, int]:
    items = db.query(Item).filter(func.lower(Item.category) == category_name.lower()).all()
    subcategories = {i.sub_category.strip() for i in items if i.sub_category and i.sub_category.strip()}
    units = sum(i.current_stock for i in items)
    return len(subcategories), units


def _to_brand_response(db: Session, brand: Brand) -> BrandResponse:
    return BrandResponse(
        id=brand.id,
        name=brand.name,
        product_count=_brand_product_count(db, brand.name),
        created_at=brand.created_at,
    )


def _to_category_response(db: Session, category: Category) -> CategoryResponse:
    sub_count, unit_count = _category_stats(db, category.name)
    return CategoryResponse(
        id=category.id,
        name=category.name,
        subcategory_count=sub_count,
        unit_count=unit_count,
        created_at=category.created_at,
    )


def _find_brand_by_name(db: Session, name: str) -> Brand | None:
    normalized = _normalize_name(name)
    return db.query(Brand).filter(func.lower(Brand.name) == normalized.lower()).first()


def _find_category_by_name(db: Session, name: str) -> Category | None:
    normalized = _normalize_name(name)
    return db.query(Category).filter(func.lower(Category.name) == normalized.lower()).first()


def list_brands(db: Session) -> list[BrandResponse]:
    brands = db.query(Brand).order_by(Brand.name.asc()).all()
    return [_to_brand_response(db, brand) for brand in brands]


def list_categories(db: Session) -> list[CategoryResponse]:
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [_to_category_response(db, category) for category in categories]


def _create_brand_record(db: Session, name: str, *, allow_existing: bool = False) -> Brand:
    normalized = _normalize_name(name)
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Brand name is required")

    existing = _find_brand_by_name(db, normalized)
    if existing:
        if allow_existing:
            return existing
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Brand already exists")

    brand = Brand(name=normalized)
    db.add(brand)
    return brand


def _create_category_record(db: Session, name: str, *, allow_existing: bool = False) -> Category:
    normalized = _normalize_name(name)
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Category name is required")

    existing = _find_category_by_name(db, normalized)
    if existing:
        if allow_existing:
            return existing
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already exists")

    category = Category(name=normalized)
    db.add(category)
    return category


def create_brand(db: Session, payload: BrandCreate) -> BrandResponse:
    brand = _create_brand_record(db, payload.name)
    db.commit()
    db.refresh(brand)
    return _to_brand_response(db, brand)


def create_category(db: Session, payload: CategoryCreate) -> CategoryResponse:
    category = _create_category_record(db, payload.name)
    db.commit()
    db.refresh(category)
    return _to_category_response(db, category)


def create_catalog_bulk(db: Session, payload: CatalogBulkCreate) -> CatalogBulkResponse:
    brand_record = None
    category_record = None

    if payload.brand_name:
        brand_record = _create_brand_record(db, payload.brand_name, allow_existing=True)
    if payload.category_name:
        category_record = _create_category_record(db, payload.category_name, allow_existing=True)

    db.commit()

    if brand_record:
        db.refresh(brand_record)
    if category_record:
        db.refresh(category_record)

    return CatalogBulkResponse(
        brand=_to_brand_response(db, brand_record) if brand_record else None,
        category=_to_category_response(db, category_record) if category_record else None,
    )


def delete_brand(db: Session, brand_id: UUID) -> None:
    brand = db.get(Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    db.delete(brand)
    db.commit()


def delete_category(db: Session, category_id: UUID) -> None:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(category)
    db.commit()
