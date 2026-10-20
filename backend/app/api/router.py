from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.database.session import get_db
from app.inventory.routes import router as inventory_router
from app.billing.routes import router as billing_router
from app.customers.routes import router as parties_router
from app.purchase_invoice.routes import router as invoice_templates_router
from app.reports.routes import router as invoices_router
from app.voice.routes import router as voice_router
from app.admin.routes import router as admin_router
from app.companies.routes import router as companies_router
from app.gst.routes import router as gst_router
from app.users.routes import router as users_router
from app.api.auth_helpers import user_to_me_response
from app.models.company import Company
from app.models.user import User
from app.core.security import decode_token
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserMeResponse

api_router = APIRouter(prefix="/api/v1")


@api_router.post("/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    company = Company(
        business_name=payload.resolved_business_name(),
        owner_name=payload.resolved_name(),
        mobile=(payload.mobile or "").strip() or None,
        email=payload.email,
        gst_number=(payload.gst_number or "").strip() or None,
        address=(payload.address or "").strip() or None,
    )
    db.add(company)
    db.flush()

    user = User(
        name=payload.resolved_name(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        company_id=company.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    tv = user.token_version
    return TokenResponse(
        access_token=create_access_token(str(user.id), tv),
        refresh_token=create_refresh_token(str(user.id), tv),
    )


@api_router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    tv = user.token_version
    return TokenResponse(
        access_token=create_access_token(str(user.id), tv),
        refresh_token=create_refresh_token(str(user.id), tv),
    )


@api_router.post("/auth/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_payload = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.query(User).filter(User.id == token_payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token_tv = int(token_payload.get("tv", 1))
    if token_tv != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked. Please sign in again.",
        )

    tv = user.token_version
    return TokenResponse(
        access_token=create_access_token(str(user.id), tv),
        refresh_token=create_refresh_token(str(user.id), tv),
    )


@api_router.get("/auth/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.get(Company, current_user.company_id) if current_user.company_id else None
    return user_to_me_response(current_user, company)


api_router.include_router(inventory_router)
api_router.include_router(billing_router)
api_router.include_router(parties_router)
api_router.include_router(invoice_templates_router)
api_router.include_router(invoices_router)
api_router.include_router(voice_router)
api_router.include_router(admin_router)
api_router.include_router(companies_router)
api_router.include_router(gst_router)
api_router.include_router(users_router)
