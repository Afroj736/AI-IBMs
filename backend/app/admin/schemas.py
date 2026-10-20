from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.models.user import UserRole


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_companies: int
    total_invoices: int
    users_by_role: dict[str, int]


class AdminUserListItem(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    company_id: str | None = None
    company_name: str | None = None
    is_active: bool
    token_version: int
    created_at: datetime


class AdminUserDetail(AdminUserListItem):
    mobile: str | None = None


class AdminUserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None


class AdminForceLogoutResponse(BaseModel):
    user_id: str
    message: str
    token_version: int


class AdminBillListItem(BaseModel):
    id: str
    invoice_number: str
    grand_total: Decimal
    payment_status: str
    invoice_date: str
    party_name: str | None = None
    created_by_user_id: str | None = None
    created_by_name: str | None = None
    created_by_role: str | None = None
    created_by_email: str | None = None
    created_at: datetime


class AdminMessageResponse(BaseModel):
    message: str
