from sqlalchemy.orm import Session

from app.models.invoice_template import InvoiceTemplate, TemplateStatus


class InvoiceTemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, template: InvoiceTemplate) -> InvoiceTemplate:
        self.db.add(template)
        self.db.flush()
        return template

    def get_by_id(self, template_id):
        return self.db.query(InvoiceTemplate).filter(InvoiceTemplate.id == template_id).first()

    def list(self):
        return self.db.query(InvoiceTemplate).order_by(InvoiceTemplate.created_at.desc()).all()

    def delete(self, template: InvoiceTemplate):
        self.db.delete(template)

    def deactivate_all(self):
        self.db.query(InvoiceTemplate).update({InvoiceTemplate.status: TemplateStatus.INACTIVE})
