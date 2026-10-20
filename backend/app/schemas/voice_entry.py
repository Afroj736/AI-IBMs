from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.invoice_draft import InvoiceDraftStatus
from app.models.voice_recording import VoiceRecordingStatus


class VoiceUploadResponse(BaseModel):
    recording_id: UUID
    transcript: str
    status: VoiceRecordingStatus
    transcript_source: Literal["speech", "dev_fallback"] = "speech"


class AIExtractParty(BaseModel):
    name: str
    gstin: str | None = None


class AIExtractItem(BaseModel):
    name: str
    qty: int = Field(gt=0)
    rate: Decimal = Field(ge=0)


class AIExtractResponse(BaseModel):
    party: AIExtractParty
    items: list[AIExtractItem]


class DraftCreateRequest(BaseModel):
    recording_id: UUID
    template_id: UUID | None = None


class DraftItemUpdate(BaseModel):
    item_id: UUID
    quantity: int = Field(gt=0)
    rate: Decimal = Field(ge=0)
    discount: Decimal = Field(default=Decimal("0.00"), ge=0)


class DraftUpdateRequest(BaseModel):
    template_id: UUID | None = None
    invoice_date: date | None = None
    notes: str | None = None
    items: list[DraftItemUpdate] = Field(default_factory=list)


class DraftItemResponse(BaseModel):
    id: UUID
    item_id: UUID
    item_name: str
    quantity: int
    rate: Decimal
    discount: Decimal
    gst_percent: Decimal
    tax_amount: Decimal
    line_total: Decimal
    is_new_item_created: bool

    class Config:
        from_attributes = True


class DraftResponse(BaseModel):
    id: UUID
    template_id: UUID | None
    party_id: UUID
    invoice_date: date
    subtotal: Decimal
    discount_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    round_off: Decimal
    grand_total: Decimal
    notes: str | None
    status: InvoiceDraftStatus
    is_new_party_created: bool
    final_invoice_id: UUID | None
    created_at: datetime
    updated_at: datetime
    items: list[DraftItemResponse]

    class Config:
        from_attributes = True
