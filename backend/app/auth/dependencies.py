from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database.session import get_db
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Roles that can use voice billing, templates list, and AI line validation.
VOICE_BILLING_ROLES = (
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
    UserRole.STORE_OPERATOR,
)


def _normalize_user_role(role: UserRole | str) -> UserRole:
    if isinstance(role, UserRole):
        return role
    return UserRole(role)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    token_tv = int(payload.get("tv", 1))
    if token_tv != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked. Please sign in again.")
    return user


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin access required")
    return current_user


def require_roles(*allowed_roles: UserRole):
    """Company register default is owner — grant owner access on all business routes.

    Routes that are platform-admin-only must use require_roles(UserRole.ADMIN) alone
    (no other roles in the tuple). See docs/RBAC_ROADMAP.md.
    """
    allowed = set(allowed_roles)
    if allowed != {UserRole.ADMIN}:
        allowed.add(UserRole.OWNER)

    def checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = _normalize_user_role(current_user.role)
        if user_role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return checker
