from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, Field

from app.models.invoice import PaymentStatus

InvoiceTypeLiteral = Literal["gst", "retail"]


class InvoiceItemCreate(BaseModel):
    item_id: UUID
    quantity: int = Field(gt=0)
    discount: Decimal = Field(default=Decimal("0.00"), ge=0)
    rate: Decimal | None = Field(default=None, ge=0)
    gst_percent: Decimal | None = Field(default=None, ge=0)


class NextInvoiceNumberResponse(BaseModel):
    invoice_number: str
    prefix: str
    sequence: int
    invoice_type: InvoiceTypeLiteral


class InvoiceCreate(BaseModel):
    party_id: UUID
    template_id: UUID | None = None
    invoice_type: InvoiceTypeLiteral = "retail"
    invoice_date: date
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    round_off: Decimal = Decimal("0.00")
    received_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: str | None = None
    items: list[InvoiceItemCreate] = Field(min_length=1)


class InvoiceUpdate(BaseModel):
    invoice_date: date | None = None
    template_id: UUID | None = None
    discount_amount: Decimal | None = Field(default=None, ge=0)
    round_off: Decimal | None = None
    received_amount: Decimal | None = Field(default=None, ge=0)
    payment_status: PaymentStatus | None = None
    notes: str | None = None
    items: list[InvoiceItemCreate] | None = Field(default=None, min_length=1)


class InvoiceItemResponse(BaseModel):
    id: UUID
    item_id: UUID
    item_name: str
    quantity: int
    rate: Decimal
    discount: Decimal
    gst_percent: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    party_id: UUID
    template_id: UUID | None
    invoice_date: date
    subtotal: Decimal
    discount_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    round_off: Decimal
    grand_total: Decimal
    received_amount: Decimal
    payment_status: PaymentStatus
    notes: str | None
    created_at: datetime
    items: list[InvoiceItemResponse]

    class Config:
        from_attributes = True
