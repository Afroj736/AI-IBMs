from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    """Supports SmartBill registration form and legacy { name, email, password }."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.OWNER

    # Legacy (tests / simple clients)
    name: str | None = Field(default=None, min_length=2, max_length=120)

    # SmartBill registration form
    business_name: str | None = Field(default=None, min_length=2, max_length=120)
    owner_name: str | None = Field(default=None, min_length=2, max_length=120)
    mobile: str | None = Field(default=None, max_length=15)
    gst_number: str | None = Field(default=None, max_length=15)
    address: str | None = Field(default=None, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def normalize_name_fields(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        owner = (data.get("owner_name") or "").strip() if data.get("owner_name") else ""
        legacy = (data.get("name") or "").strip() if data.get("name") else ""
        if owner and not legacy:
            data = {**data, "name": owner}
        elif legacy and not owner:
            data = {**data, "owner_name": legacy}
        return data

    @model_validator(mode="after")
    def require_display_name(self) -> "RegisterRequest":
        if self.owner_name or self.name:
            return self
        raise ValueError("owner_name or name is required")

    def resolved_name(self) -> str:
        return (self.owner_name or self.name or "").strip()

    def resolved_business_name(self) -> str:
        return (self.business_name or self.name or self.owner_name or "My Business").strip()


class CompanyResponse(BaseModel):
    id: str
    business_name: str
    owner_name: str
    mobile: str | None = None
    email: str
    gst_number: str | None = None
    address: str | None = None


class UserMeResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    company_id: str | None = None
    company: CompanyResponse | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
