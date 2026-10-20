from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.database.session import get_db
from app.models.user import User
from app.schemas.user_profile import (
    ChangePasswordRequest,
    UserProfileResponse,
    UserProfileSettingsPayload,
    UserProfileUpdateRequest,
)
from app.users.service import merge_profile_settings, resolved_display_name

router = APIRouter(prefix="/users", tags=["Account Settings"])


def _to_response(user: User) -> UserProfileResponse:
    settings = merge_profile_settings(
        user.profile_settings if isinstance(getattr(user, "profile_settings", None), dict) else None,
        name=user.name,
        email=user.email,
    )
    return UserProfileResponse(
        id=str(user.id),
        name=resolved_display_name(user, settings),
        email=user.email,
        role=user.role,
        company_id=str(user.company_id) if user.company_id else None,
        member_since=user.created_at,
        last_login_label="Today",
        settings=settings,
    )


@router.get("/me/profile", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return _to_response(current_user)


@router.put("/me/profile", response_model=UserProfileResponse)
def update_my_profile(
    payload: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email is not None:
        email = payload.email.strip().lower()
        existing = db.query(User).filter(User.email == email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = email

    if payload.settings is not None:
        user.profile_settings = payload.settings.model_dump()
        if payload.name is None:
            user.name = resolved_display_name(user, payload.settings)

    if payload.name is not None:
        user.name = payload.name.strip()

    db.commit()
    db.refresh(user)
    return _to_response(user)


@router.post("/me/change-password")
def change_my_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )
    user.hashed_password = hash_password(payload.new_password)
    user.token_version = (user.token_version or 1) + 1
    db.commit()
    return {"message": "Password updated successfully"}
