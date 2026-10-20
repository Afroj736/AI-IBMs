from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.session import get_db
from app.models.user import User, UserRole
from app.repositories.invoice_repository import InvoiceRepository
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceUpdate, NextInvoiceNumberResponse
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Billing Foundation"])

INVOICE_READ_ROLES = (
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
    UserRole.STORE_OPERATOR,
)
INVOICE_WRITE_ROLES = INVOICE_READ_ROLES
INVOICE_DELETE_ROLES = (UserRole.MANAGER, UserRole.ACCOUNTANT)


@router.get("/next-number", response_model=NextInvoiceNumberResponse)
def get_next_invoice_number(
    type: str = "retail",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, *INVOICE_READ_ROLES)),
):
    normalized = type if type in {"gst", "retail"} else "retail"
    return InvoiceService(db).peek_next_invoice_number(current_user, normalized)


@router.post("", response_model=InvoiceResponse)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, *INVOICE_WRITE_ROLES)),
):
    return InvoiceService(db).create_invoice(
        payload,
        created_by_user_id=current_user.id,
        created_by_user=current_user,
    )


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *INVOICE_READ_ROLES)),
):
    return InvoiceRepository(db).list(search=search)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *INVOICE_READ_ROLES)),
):
    invoice = InvoiceService(db).repo.get_by_id(invoice_id)
    if not invoice:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: UUID,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, *INVOICE_WRITE_ROLES)),
):
    return InvoiceService(db).update_invoice(invoice_id, payload, updated_by_user=current_user)


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *INVOICE_DELETE_ROLES, UserRole.SALES_STAFF, UserRole.STORE_OPERATOR)),
):
    InvoiceService(db).delete_invoice(invoice_id)
    return {"message": "Invoice deleted successfully"}
