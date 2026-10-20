from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class BrandResponse(BaseModel):
    id: UUID
    name: str
    product_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    subcategory_count: int = 0
    unit_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CatalogBulkCreate(BaseModel):
    brand_name: str | None = Field(default=None, max_length=120)
    category_name: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def require_at_least_one(self):
        brand = (self.brand_name or "").strip()
        category = (self.category_name or "").strip()
        if not brand and not category:
            raise ValueError("Provide at least a brand name or category name")
        self.brand_name = brand or None
        self.category_name = category or None
        return self


class CatalogBulkResponse(BaseModel):
    brand: BrandResponse | None = None
    category: CategoryResponse | None = None
