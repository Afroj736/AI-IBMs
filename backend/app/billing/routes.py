from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.service import ai_add_missing_item_as_draft, can_ai_bill_item
from app.auth.dependencies import VOICE_BILLING_ROLES, get_current_user, require_roles
from app.database.session import get_db
from app.models.company import Company
from app.models.item import Item
from app.models.user import User, UserRole

router = APIRouter(prefix="/billing", tags=["Retail Billing"])


class BusinessInfoResponse(BaseModel):
    id: str
    name: str
    gst_number: str
    phone: str
    email: str
    address: str
    logo_url: str | None = None
    signature_url: str | None = None
    seal_url: str | None = None


@router.get("/business", response_model=BusinessInfoResponse)
def get_business_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found for user")

    company = db.get(Company, current_user.company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return BusinessInfoResponse(
        id=str(company.id),
        name=company.business_name,
        gst_number=company.gst_number or "",
        phone=company.mobile or "",
        email=company.email,
        address=company.address or "",
    )


class BillLine(BaseModel):
    item_code: str
    quantity: int = Field(gt=0)


class AiBillRequest(BaseModel):
    lines: list[BillLine]
    create_missing_as_draft: bool = True


@router.post("/ai-validate-lines")
def validate_ai_bill_lines(
    payload: AiBillRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    rejected: list[dict] = []
    accepted: list[dict] = []

    for line in payload.lines:
        allowed, reason = can_ai_bill_item(db, line.item_code, line.quantity)
        if allowed:
            accepted.append({"item_code": line.item_code, "quantity": line.quantity})
            continue

        if "not present" in reason and payload.create_missing_as_draft:
            draft = ai_add_missing_item_as_draft(db, line.item_code, f"Draft-{line.item_code}")
            rejected.append({"item_code": line.item_code, "reason": f"{reason} Draft item created: {draft.id}"})
        else:
            rejected.append({"item_code": line.item_code, "reason": reason})

    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "No line can be billed by AI.", "rejected": rejected},
        )

    return {"accepted": accepted, "rejected": rejected}


@router.post("/manual-update-stock/{item_code}")
def manual_update_stock(
    item_code: str,
    delta: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STORE_OPERATOR)),
):
    item = db.query(Item).filter(Item.item_code == item_code).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    item.current_stock = max(0, item.current_stock + delta)
    db.commit()
    return {"item_code": item_code, "current_stock": item.current_stock}
