from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.invoice_template import TemplateStatus, TemplateType


class InvoiceTemplateBase(BaseModel):
    template_name: str = Field(min_length=2, max_length=120)
    template_type: TemplateType
    header_logo: str | None = None
    company_name: str = Field(min_length=2, max_length=160)
    company_address: str | None = None
    gstin: str | None = None
    contact_number: str | None = None
    email: str | None = None
    show_qr: bool = False
    show_barcode: bool = False
    show_signature: bool = False
    footer_text: str | None = None
    terms_conditions: str | None = None
    template_json: dict = Field(default_factory=dict)
    status: TemplateStatus = TemplateStatus.INACTIVE


class InvoiceTemplateCreate(InvoiceTemplateBase):
    pass


class InvoiceTemplateUpdate(BaseModel):
    template_name: str | None = None
    template_type: TemplateType | None = None
    header_logo: str | None = None
    company_name: str | None = None
    company_address: str | None = None
    gstin: str | None = None
    contact_number: str | None = None
    email: str | None = None
    show_qr: bool | None = None
    show_barcode: bool | None = None
    show_signature: bool | None = None
    footer_text: str | None = None
    terms_conditions: str | None = None
    template_json: dict | None = None
    status: TemplateStatus | None = None


class InvoiceTemplateResponse(InvoiceTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

