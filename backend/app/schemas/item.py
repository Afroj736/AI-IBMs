from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    item_name: str = Field(min_length=2, max_length=160)
    item_code: str = Field(min_length=2, max_length=80)
    sku: str = Field(min_length=2, max_length=80)
    barcode: str | None = None
    category: str | None = None
    sub_category: str | None = None
    brand: str | None = None
    model_number: str | None = None
    serial_number_required: bool = False
    hsn_code: str | None = None
    gst_percentage: Decimal = Field(ge=0, le=100)
    purchase_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)
    minimum_stock: int = Field(ge=0)
    current_stock: int = Field(ge=0)
    description: str | None = None
    status: str = "active"


class ItemResponse(ItemCreate):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
