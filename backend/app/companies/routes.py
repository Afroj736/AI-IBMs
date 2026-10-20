from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.companies.service import apply_settings_to_company, format_combined_address, merge_settings
from app.database.session import get_db
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.company_settings import CompanySettingsResponse, CompanySettingsUpdateRequest

router = APIRouter(prefix="/companies", tags=["Company Settings"])


def _get_or_create_user_company(db: Session, user: User) -> Company:
    """Return the user's company, creating one for legacy accounts missing company_id."""
    if user.company_id:
        company = db.get(Company, user.company_id)
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
    db.add(company)
    db.flush()
    user.company_id = company.id
    db.commit()
    db.refresh(company)
    db.refresh(user)
    return company


def _to_response(company: Company) -> CompanySettingsResponse:
    settings = merge_settings(company.settings if isinstance(company.settings, dict) else None)
    if company.gst_number and not settings.gstin:
        settings.gstin = company.gst_number
    if company.email and not settings.sender_email:
        settings.sender_email = company.email
    if company.mobile and not settings.whatsapp_number:
        settings.whatsapp_number = company.mobile
    return CompanySettingsResponse(
        id=str(company.id),
        business_name=company.business_name,
        owner_name=company.owner_name,
        mobile=company.mobile,
        email=company.email,
        gst_number=company.gst_number,
        address=company.address,
        settings=settings,
    )


@router.get("/settings", response_model=CompanySettingsResponse)
def get_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _to_response(_get_or_create_user_company(db, current_user))


@router.put("/settings", response_model=CompanySettingsResponse)
def update_company_settings(
    payload: CompanySettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STORE_OPERATOR)
    ),
):
    company = _get_or_create_user_company(db, current_user)

    if payload.business_name is not None:
        company.business_name = payload.business_name.strip()
    if payload.owner_name is not None:
        company.owner_name = payload.owner_name.strip()
    if payload.mobile is not None:
        company.mobile = payload.mobile.strip() or None
    if payload.email is not None:
        company.email = payload.email.strip()
    if payload.gst_number is not None:
        company.gst_number = payload.gst_number.strip().upper() or None
    if payload.address is not None:
        company.address = payload.address.strip() or None

    if payload.settings is not None:
        apply_settings_to_company(company, payload.settings)
        if payload.gst_number is None and payload.settings.gstin:
            company.gst_number = payload.settings.gstin.strip().upper() or None
        if payload.address is None and payload.settings.address:
            company.address = format_combined_address(payload.settings.address)

    db.commit()
    db.refresh(company)
    return _to_response(company)
