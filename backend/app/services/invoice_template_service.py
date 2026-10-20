from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.invoice_template import InvoiceTemplate, TemplateStatus
from app.repositories.invoice_template_repository import InvoiceTemplateRepository
from app.schemas.invoice_template import InvoiceTemplateCreate, InvoiceTemplateUpdate


class InvoiceTemplateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = InvoiceTemplateRepository(db)

    def create_template(self, payload: InvoiceTemplateCreate) -> InvoiceTemplate:
        template = InvoiceTemplate(**payload.model_dump())
        self.repo.create(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def update_template(self, template_id, payload: InvoiceTemplateUpdate) -> InvoiceTemplate:
        template = self.repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(template, key, value)
        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_template(self, template_id):
        template = self.repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        self.repo.delete(template)
        self.db.commit()

    def duplicate_template(self, template_id):
        source = self.repo.get_by_id(template_id)
        if not source:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        duplicate = InvoiceTemplate(
            **{
                "template_name": f"{source.template_name} Copy",
                "template_type": source.template_type,
                "header_logo": source.header_logo,
                "company_name": source.company_name,
                "company_address": source.company_address,
                "gstin": source.gstin,
                "contact_number": source.contact_number,
                "email": source.email,
                "show_qr": source.show_qr,
                "show_barcode": source.show_barcode,
                "show_signature": source.show_signature,
                "footer_text": source.footer_text,
                "terms_conditions": source.terms_conditions,
                "template_json": source.template_json,
                "status": TemplateStatus.INACTIVE,
            }
        )
        self.repo.create(duplicate)
        self.db.commit()
        self.db.refresh(duplicate)
        return duplicate

    def activate_template(self, template_id):
        template = self.repo.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        self.repo.deactivate_all()
        template.status = TemplateStatus.ACTIVE
        self.db.commit()
        self.db.refresh(template)
        return template
