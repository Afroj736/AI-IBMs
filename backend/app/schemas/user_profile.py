from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user import UserRole


class NotificationPreferences(BaseModel):
    email: bool = True
    push: bool = False
    invoice_alerts: bool = True
    low_stock: bool = True


class UserProfileSettingsPayload(BaseModel):
    first_name: str = ""
    last_name: str = ""
    display_name: str = ""
    mobile: str = ""
    gender: str = "Male"
    bio: str = ""
    avatar_data_url: str | None = None
    department: str = "Central Administration"
    username: str = ""
    notification_prefs: NotificationPreferences = Field(default_factory=NotificationPreferences)
    appearance_theme: str = "light"
    two_factor_enabled: bool = False
    two_factor_method: str = ""


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    company_id: str | None = None
    member_since: datetime
    last_login_label: str = "Today"
    settings: UserProfileSettingsPayload


class UserProfileUpdateRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    settings: UserProfileSettingsPayload | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)
