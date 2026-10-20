from pydantic import BaseModel, Field


class CompanyAddressSettings(BaseModel):
    line1: str = ""
    line2: str = ""
    city: str = ""
    state: str = ""
    country: str = "India"
    pincode: str = ""


class CompanySettingsPayload(BaseModel):
    business_type: str = "Private Limited Company"
    financial_year: str = "2024 - 2025"
    website: str = ""
    description: str = ""
    address: CompanyAddressSettings = Field(default_factory=CompanyAddressSettings)
    logo_data_url: str | None = None
    signature_data_url: str | None = None
    gstin: str = ""
    pan: str = ""
    default_gst_percent: str = "18%"
    state_code: str = ""
    bank_name: str = ""
    account_number: str = ""
    ifsc: str = ""
    upi_id: str = ""
    qr_data_url: str | None = None
    invoice_prefix: str = "RET"
    invoice_start_number: int = 1001
    invoice_counters: dict[str, int] = Field(
        default_factory=lambda: {"RET": 1001, "GST": 500, "PUR": 200, "AI": 1}
    )
    enable_discount: bool = True
    auto_round_off: bool = True
    item_wise_gst: bool = False
    auto_calculation: bool = True
    show_logo: bool = True
    show_signature: bool = False
    show_bank_details: bool = True
    show_footer_qr: bool = True
    whatsapp_connected: bool = False
    whatsapp_number: str = ""
    sender_email: str = ""


class CompanySettingsResponse(BaseModel):
    id: str
    business_name: str
    owner_name: str
    mobile: str | None = None
    email: str
    gst_number: str | None = None
    address: str | None = None
    settings: CompanySettingsPayload


class CompanySettingsUpdateRequest(BaseModel):
    business_name: str | None = None
    owner_name: str | None = None
    mobile: str | None = None
    email: str | None = None
    gst_number: str | None = None
    address: str | None = None
    settings: CompanySettingsPayload | None = None
