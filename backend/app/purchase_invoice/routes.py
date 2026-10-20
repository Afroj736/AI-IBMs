from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import VOICE_BILLING_ROLES, require_roles
from app.database.session import get_db
from app.models.user import User, UserRole
from app.repositories.invoice_template_repository import InvoiceTemplateRepository
from app.schemas.invoice_template import InvoiceTemplateCreate, InvoiceTemplateResponse, InvoiceTemplateUpdate
from app.services.invoice_template_service import InvoiceTemplateService

router = APIRouter(prefix="/invoice-templates", tags=["Invoice Template Management"])


@router.post("", response_model=InvoiceTemplateResponse)
def create_template(
    payload: InvoiceTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)),
):
    return InvoiceTemplateService(db).create_template(payload)


@router.get("", response_model=list[InvoiceTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    return InvoiceTemplateRepository(db).list()


@router.get("/{template_id}", response_model=InvoiceTemplateResponse)
def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    template = InvoiceTemplateService(db).repo.get_by_id(template_id)
    if not template:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=InvoiceTemplateResponse)
def update_template(
    template_id: UUID,
    payload: InvoiceTemplateUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)),
):
    return InvoiceTemplateService(db).update_template(template_id, payload)


@router.delete("/{template_id}")
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    InvoiceTemplateService(db).delete_template(template_id)
    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/duplicate", response_model=InvoiceTemplateResponse)
def duplicate_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)),
):
    return InvoiceTemplateService(db).duplicate_template(template_id)


@router.post("/{template_id}/activate", response_model=InvoiceTemplateResponse)
def activate_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    return InvoiceTemplateService(db).activate_template(template_id)
