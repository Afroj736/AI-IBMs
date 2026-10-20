from app.models.company import Company
from app.models.user import User
from app.schemas.auth import CompanyResponse, UserMeResponse


def company_to_response(company: Company) -> CompanyResponse:
    return CompanyResponse(
        id=str(company.id),
        business_name=company.business_name,
        owner_name=company.owner_name,
        mobile=company.mobile,
        email=company.email,
        gst_number=company.gst_number,
        address=company.address,
    )


def user_to_me_response(user: User, company: Company | None) -> UserMeResponse:
    return UserMeResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        company_id=str(user.company_id) if user.company_id else None,
        company=company_to_response(company) if company else None,
    )
