import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, pg_enum_values


class UserRole(str, enum.Enum):
    """Platform admin = cross-tenant. Owner = company creator from register. Staff = invited later."""

    ADMIN = "admin"
    OWNER = "owner"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    SALES_STAFF = "sales_staff"
    STORE_OPERATOR = "store_operator"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=pg_enum_values),
        nullable=False,
        default=UserRole.OWNER,
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")
    token_version: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
    profile_settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company: Mapped["Company | None"] = relationship("Company", back_populates="users")
