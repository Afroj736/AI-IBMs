from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.session import get_db
from app.models.user import User, UserRole
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.party_repository import PartyRepository
from app.schemas.party import PartyCreate, PartyResponse, PartyUpdate
from app.services.party_service import PartyService

router = APIRouter(prefix="/parties", tags=["Party Management"])

# Roles that can create/edit parties (owner is added automatically by require_roles).
PARTY_WRITE_ROLES = (
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
    UserRole.STORE_OPERATOR,
)

# Roles that can view party list, detail, ledger, and invoices.
PARTY_READ_ROLES = (
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
    UserRole.STORE_OPERATOR,
)


@router.post("", response_model=PartyResponse)
def create_party(
    payload: PartyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_WRITE_ROLES)),
):
    return PartyService(db).create_party(payload)


@router.get("", response_model=list[PartyResponse])
def list_parties(
    search: str | None = None,
    party_type: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_READ_ROLES)),
):
    repo = PartyRepository(db)
    parsed_type = None
    if party_type:
        from app.models.party import PartyType

        parsed_type = PartyType(party_type)
    return repo.list(search=search, party_type=parsed_type)


@router.get("/{party_id}", response_model=PartyResponse)
def get_party(
    party_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_READ_ROLES)),
):
    return PartyService(db).get_party(party_id)


@router.put("/{party_id}", response_model=PartyResponse)
def update_party(
    party_id: UUID,
    payload: PartyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_WRITE_ROLES)),
):
    return PartyService(db).update_party(party_id, payload)


@router.delete("/{party_id}")
def delete_party(
    party_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_WRITE_ROLES)),
):
    PartyService(db).delete_party(party_id)
    return {"message": "Party deleted successfully"}


@router.get("/{party_id}/ledger")
def party_ledger(
    party_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_READ_ROLES)),
):
    party = PartyService(db).get_party(party_id)
    invoices = InvoiceRepository(db).list()
    txns = [inv for inv in invoices if inv.party_id == party_id]
    balance = party.opening_balance + sum(inv.grand_total for inv in txns)
    return {"party_id": party_id, "opening_balance": party.opening_balance, "balance": balance, "transaction_count": len(txns)}


@router.get("/{party_id}/transactions")
def party_transactions(
    party_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *PARTY_READ_ROLES)),
):
    PartyService(db).get_party(party_id)
    invoices = [inv for inv in InvoiceRepository(db).list() if inv.party_id == party_id]
    return [
        {
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "date": inv.invoice_date,
            "grand_total": inv.grand_total,
            "payment_status": inv.payment_status.value
            if hasattr(inv.payment_status, "value")
            else str(inv.payment_status),
        }
        for inv in invoices
    ]
