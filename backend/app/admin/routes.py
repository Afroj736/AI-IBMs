from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.admin.schemas import (
    AdminBillListItem,
    AdminDashboardStats,
    AdminForceLogoutResponse,
    AdminMessageResponse,
    AdminUserDetail,
    AdminUserListItem,
    AdminUserUpdate,
)
from app.admin.service import AdminService
from app.auth.dependencies import require_platform_admin
from app.database.session import get_db
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Platform Admin"])


@router.get("/dashboard", response_model=AdminDashboardStats)
def admin_dashboard(
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).dashboard_stats()


@router.get("/users", response_model=list[AdminUserListItem])
def admin_list_users(
    role: UserRole | None = None,
    search: str | None = None,
    company_id: UUID | None = None,
    is_active: bool | None = None,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_users(role=role, search=search, company_id=company_id, is_active=is_active)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def admin_get_user(
    user_id: UUID,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    user = AdminService(db).get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=AdminUserDetail)
def admin_update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    try:
        user = AdminService(db).update_user(user_id, role=payload.role, is_active=payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/users/{user_id}/force-logout", response_model=AdminForceLogoutResponse)
def admin_force_logout(
    user_id: UUID,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    try:
        result = AdminService(db).force_logout(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return result


@router.post("/users/{user_id}/disable", response_model=AdminMessageResponse)
def admin_disable_user(
    user_id: UUID,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    try:
        user = AdminService(db).update_user(user_id, role=None, is_active=False)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    AdminService(db).force_logout(user_id)
    return AdminMessageResponse(message=f"User {user.email} disabled and logged out")


@router.get("/bills", response_model=list[AdminBillListItem])
def admin_list_bills(
    role: UserRole | None = None,
    user_id: UUID | None = None,
    search: str | None = None,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_bills(role=role, user_id=user_id, search=search)
