from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.inventory.catalog_service import (
    create_brand,
    create_catalog_bulk,
    create_category,
    delete_brand,
    delete_category,
    list_brands,
    list_categories,
)
from app.models.item import Item
from app.models.user import User, UserRole
from app.schemas.catalog import (
    BrandCreate,
    BrandResponse,
    CatalogBulkCreate,
    CatalogBulkResponse,
    CategoryCreate,
    CategoryResponse,
)
from app.schemas.item import ItemCreate, ItemResponse

router = APIRouter(prefix="/inventory", tags=["Inventory"])

CATALOG_WRITE_ROLES = (UserRole.ADMIN, UserRole.MANAGER, UserRole.STORE_OPERATOR)


@router.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STORE_OPERATOR)),
):
    existing = db.query(Item).filter((Item.item_code == payload.item_code) | (Item.sku == payload.sku)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item code or SKU already exists")

    item = Item(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items", response_model=list[ItemResponse])
def list_items(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Item).order_by(Item.created_at.desc()).all()


@router.get("/brands", response_model=list[BrandResponse])
def get_brands(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return list_brands(db)


@router.post("/brands", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def post_brand(
    payload: BrandCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CATALOG_WRITE_ROLES)),
):
    return create_brand(db, payload)


@router.delete("/brands/{brand_id}")
def remove_brand(
    brand_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CATALOG_WRITE_ROLES)),
):
    delete_brand(db, brand_id)
    return {"message": "Brand deleted successfully"}


@router.get("/categories", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return list_categories(db)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def post_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CATALOG_WRITE_ROLES)),
):
    return create_category(db, payload)


@router.delete("/categories/{category_id}")
def remove_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CATALOG_WRITE_ROLES)),
):
    delete_category(db, category_id)
    return {"message": "Category deleted successfully"}


@router.post("/catalog/bulk", response_model=CatalogBulkResponse, status_code=status.HTTP_201_CREATED)
def post_catalog_bulk(
    payload: CatalogBulkCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CATALOG_WRITE_ROLES)),
):
    return create_catalog_bulk(db, payload)
