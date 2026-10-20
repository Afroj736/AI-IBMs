import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, pg_enum_values


class TemplateType(str, enum.Enum):
    RETAIL_GST_INVOICE = "retail_gst_invoice"
    TAX_INVOICE = "tax_invoice"
    PURCHASE_INVOICE = "purchase_invoice"
    MOBILE_STORE_INVOICE = "mobile_store_invoice"
    ELECTRONICS_STORE_INVOICE = "electronics_store_invoice"


class TemplateStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class InvoiceTemplate(Base):
    __tablename__ = "invoice_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    template_type: Mapped[TemplateType] = mapped_column(
        Enum(TemplateType, name="template_type", values_callable=pg_enum_values), nullable=False
    )
    header_logo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_name: Mapped[str] = mapped_column(String(160), nullable=False)
    company_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    show_qr: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_barcode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_signature: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    footer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[TemplateStatus] = mapped_column(
        Enum(TemplateStatus, name="template_status", values_callable=pg_enum_values),
        nullable=False,
        default=TemplateStatus.INACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
