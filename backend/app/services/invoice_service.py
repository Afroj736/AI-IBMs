from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.companies.service import merge_settings
from app.models.company import Company
from app.models.invoice import Invoice, InvoiceItem, PaymentStatus
from app.models.item import Item
from app.models.party import Party
from app.models.user import User
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, NextInvoiceNumberResponse
from app.services.gst_tax_split import is_inter_state_supply, split_gst_tax
from app.services.invoice_numbering import (
    allocate_invoice_number,
    next_counter_value,
    peek_next_invoice_number,
    prefix_for_type,
)


def _derive_payment_status(grand_total: Decimal, received_amount: Decimal) -> PaymentStatus:
    received = max(Decimal("0.00"), received_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    grand = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if received <= 0:
        return PaymentStatus.PENDING
    if received >= grand:
        return PaymentStatus.PAID
    return PaymentStatus.PARTIAL


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = InvoiceRepository(db)

    def _get_user_company(self, user: User) -> Company:
        if user.company_id:
            company = self.db.get(Company, user.company_id)
            if company:
                return company

        company = Company(
            business_name=f"{user.name} Business",
            owner_name=user.name,
            mobile=None,
            email=user.email,
            gst_number=None,
            address=None,
            settings={},
        )
        self.db.add(company)
        self.db.flush()
        user.company_id = company.id
        self.db.commit()
        self.db.refresh(company)
        self.db.refresh(user)
        return company

    def peek_next_invoice_number(self, user: User, invoice_type: str) -> NextInvoiceNumberResponse:
        company = self._get_user_company(user)
        settings = merge_settings(company.settings if isinstance(company.settings, dict) else None)
        normalized_type = invoice_type if invoice_type in {"gst", "retail"} else "retail"
        prefix = prefix_for_type(settings, normalized_type)
        sequence = next_counter_value(settings, normalized_type)
        return NextInvoiceNumberResponse(
            invoice_number=peek_next_invoice_number(settings, normalized_type),
            prefix=prefix,
            sequence=sequence,
            invoice_type=normalized_type,
        )

    def _calc_tax(self, taxable: Decimal, gst_percent: Decimal, *, is_inter_state: bool):
        tax_amount = (taxable * gst_percent / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        cgst, sgst, igst = split_gst_tax(tax_amount, is_inter_state)
        return tax_amount, cgst, sgst, igst

    def create_invoice(
        self,
        payload: InvoiceCreate,
        created_by_user_id: Optional[UUID] = None,
        *,
        created_by_user: Optional[User] = None,
    ) -> Invoice:
        party = self.db.query(Party).filter(Party.id == payload.party_id).first()
        if not party:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Party not found")

        invoice_number = "INV-000001"
        company_state = ""
        company_gstin: str | None = None
        if created_by_user is not None:
            company = self._get_user_company(created_by_user)
            invoice_number = allocate_invoice_number(company, payload.invoice_type)
            settings = merge_settings(company.settings if isinstance(company.settings, dict) else None)
            company_state = settings.address.state or ""
            company_gstin = settings.gstin or company.gst_number
        else:
            latest = self.repo.latest_invoice()
            if latest:
                try:
                    number = int(latest.invoice_number.split("-")[-1]) + 1
                except ValueError:
                    number = 1
                invoice_number = f"INV-{number:06d}"

        is_inter_state = is_inter_state_supply(
            company_state,
            party.state or "",
            company_gstin,
            party.gstin,
        )

        invoice = Invoice(
            invoice_number=invoice_number,
            party_id=payload.party_id,
            template_id=payload.template_id,
            invoice_date=payload.invoice_date,
            discount_amount=payload.discount_amount,
            round_off=payload.round_off,
            notes=payload.notes,
            created_by_user_id=created_by_user_id,
        )
        self.repo.create(invoice)

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")

        for entry in payload.items:
            item = self.db.query(Item).filter(Item.id == entry.item_id, Item.status == "active").first()
            if not item:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item not found: {entry.item_id}")
            if item.current_stock < entry.quantity:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Insufficient stock: {item.item_name}")

            rate = Decimal(item.selling_price)
            discount = Decimal(entry.discount)
            taxable = (rate * entry.quantity) - discount
            if taxable < 0:
                taxable = Decimal("0.00")
            tax_amount, cgst, sgst, igst = self._calc_tax(
                taxable,
                Decimal(item.gst_percentage),
                is_inter_state=is_inter_state,
            )
            line_total = taxable + tax_amount

            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                item_id=item.id,
                item_name=item.item_name,
                quantity=entry.quantity,
                rate=rate,
                discount=discount,
                gst_percent=Decimal(item.gst_percentage),
                tax_amount=tax_amount,
                line_total=line_total,
            )
            self.db.add(invoice_item)

            item.current_stock -= entry.quantity
            subtotal += taxable
            total_tax += tax_amount
            invoice.cgst_amount += cgst
            invoice.sgst_amount += sgst
            invoice.igst_amount += igst

        invoice.subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        invoice.grand_total = (invoice.subtotal - invoice.discount_amount + total_tax + invoice.round_off).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        received = min(payload.received_amount, invoice.grand_total).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        invoice.received_amount = received
        invoice.payment_status = _derive_payment_status(invoice.grand_total, received)
        self.db.commit()
        self.db.refresh(invoice)
        return self.repo.get_by_id(invoice.id)

    def _company_tax_context(self, user: Optional[User]) -> tuple[str, str | None]:
        if user is None:
            return "", None
        company = self._get_user_company(user)
        settings = merge_settings(company.settings if isinstance(company.settings, dict) else None)
        return settings.address.state or "", settings.gstin or company.gst_number

    def update_invoice(
        self,
        invoice_id,
        payload: InvoiceUpdate,
        *,
        updated_by_user: Optional[User] = None,
    ) -> Invoice:
        invoice = self.repo.get_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

        party = self.db.query(Party).filter(Party.id == invoice.party_id).first()
        if not party:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Party not found")

        items_payload = payload.items
        data = payload.model_dump(exclude_unset=True)
        data.pop("items", None)
        received_amount = data.pop("received_amount", None)
        payment_status = data.pop("payment_status", None)

        for key, value in data.items():
            setattr(invoice, key, value)

        if items_payload is not None:
            for line in list(invoice.items):
                item = self.db.query(Item).filter(Item.id == line.item_id).first()
                if item:
                    item.current_stock += line.quantity
                self.db.delete(line)
            self.db.flush()

            company_state, company_gstin = self._company_tax_context(updated_by_user)
            is_inter_state = is_inter_state_supply(
                company_state,
                party.state or "",
                company_gstin,
                party.gstin,
            )

            subtotal = Decimal("0.00")
            total_tax = Decimal("0.00")
            invoice.cgst_amount = Decimal("0.00")
            invoice.sgst_amount = Decimal("0.00")
            invoice.igst_amount = Decimal("0.00")

            for entry in items_payload:
                item = self.db.query(Item).filter(Item.id == entry.item_id, Item.status == "active").first()
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Item not found: {entry.item_id}",
                    )
                if item.current_stock < entry.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Insufficient stock: {item.item_name}",
                    )

                rate = Decimal(entry.rate) if entry.rate is not None else Decimal(item.selling_price)
                gst_percent = (
                    Decimal(entry.gst_percent)
                    if entry.gst_percent is not None
                    else Decimal(item.gst_percentage)
                )
                discount = Decimal(entry.discount)
                taxable = (rate * entry.quantity) - discount
                if taxable < 0:
                    taxable = Decimal("0.00")
                tax_amount, cgst, sgst, igst = self._calc_tax(
                    taxable,
                    gst_percent,
                    is_inter_state=is_inter_state,
                )
                line_total = taxable + tax_amount

                invoice_item = InvoiceItem(
                    invoice_id=invoice.id,
                    item_id=item.id,
                    item_name=item.item_name,
                    quantity=entry.quantity,
                    rate=rate,
                    discount=discount,
                    gst_percent=gst_percent,
                    tax_amount=tax_amount,
                    line_total=line_total,
                )
                self.db.add(invoice_item)

                item.current_stock -= entry.quantity
                subtotal += taxable
                total_tax += tax_amount
                invoice.cgst_amount += cgst
                invoice.sgst_amount += sgst
                invoice.igst_amount += igst

            invoice.subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            invoice.grand_total = (
                invoice.subtotal - invoice.discount_amount + total_tax + invoice.round_off
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if received_amount is not None:
            received = min(
                Decimal(received_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                invoice.grand_total,
            )
            invoice.received_amount = received
            invoice.payment_status = _derive_payment_status(invoice.grand_total, received)
        elif payment_status is not None:
            invoice.payment_status = payment_status
            if payment_status == PaymentStatus.PAID:
                invoice.received_amount = invoice.grand_total
            elif payment_status == PaymentStatus.PENDING:
                invoice.received_amount = Decimal("0.00")
            elif payment_status == PaymentStatus.CANCELLED:
                invoice.received_amount = Decimal("0.00")
        elif items_payload is not None:
            capped = min(invoice.received_amount, invoice.grand_total).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            invoice.received_amount = capped
            invoice.payment_status = _derive_payment_status(invoice.grand_total, capped)

        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def delete_invoice(self, invoice_id):
        invoice = self.repo.get_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        for line in invoice.items:
            item = self.db.query(Item).filter(Item.id == line.item_id).first()
            if item:
                item.current_stock += line.quantity
        self.repo.delete(invoice)
        self.db.commit()
