from sqlalchemy.orm import Session, joinedload

from app.models.invoice import Invoice
from app.models.party import Party


class InvoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        self.db.flush()
        return invoice

    def get_by_id(self, invoice_id):
        return self.db.query(Invoice).options(joinedload(Invoice.items)).filter(Invoice.id == invoice_id).first()

    def list(self, search: str | None = None):
        query = (
            self.db.query(Invoice)
            .options(joinedload(Invoice.items))
            .outerjoin(Party, Invoice.party_id == Party.id)
        )
        if search:
            term = f"%{search}%"
            query = query.filter(
                (Invoice.invoice_number.ilike(term))
                | (Party.name.ilike(term))
                | (Party.mobile.ilike(term))
            )
        return query.order_by(Invoice.created_at.desc()).all()

    def latest_invoice(self):
        # Use highest invoice number, not most recent created_at (seeded rows may be out of order).
        return self.db.query(Invoice).order_by(Invoice.invoice_number.desc()).first()

    def delete(self, invoice: Invoice):
        self.db.delete(invoice)
