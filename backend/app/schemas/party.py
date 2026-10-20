from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.party import PartyStatus, PartyType


class PartyBase(BaseModel):
    party_type: PartyType
    name: str = Field(min_length=2, max_length=160)
    business_name: str | None = None
    gstin: str | None = None
    pan_number: str | None = None
    mobile: str = Field(min_length=8, max_length=20)
    alternate_mobile: str | None = None
    email: str | None = None
    billing_address: str | None = None
    shipping_address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = "India"
    pincode: str | None = None
    credit_limit: Decimal = Field(default=Decimal("0.00"), ge=0)
    opening_balance: Decimal = Field(default=Decimal("0.00"))
    notes: str | None = None
    status: PartyStatus = PartyStatus.ACTIVE


class PartyCreate(PartyBase):
    party_code: str | None = None


class PartyUpdate(BaseModel):
    party_type: PartyType | None = None
    name: str | None = None
    business_name: str | None = None
    gstin: str | None = None
    pan_number: str | None = None
    mobile: str | None = None
    alternate_mobile: str | None = None
    email: str | None = None
    billing_address: str | None = None
    shipping_address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pincode: str | None = None
    credit_limit: Decimal | None = None
    opening_balance: Decimal | None = None
    notes: str | None = None
    status: PartyStatus | None = None


class PartyResponse(PartyBase):
    id: UUID
    party_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
