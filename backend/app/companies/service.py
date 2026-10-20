from app.models.company import Company
from app.schemas.company_settings import CompanyAddressSettings, CompanySettingsPayload


def default_company_settings() -> dict:
    return CompanySettingsPayload().model_dump()


def merge_settings(raw: dict | None) -> CompanySettingsPayload:
    base = CompanySettingsPayload()
    if not raw:
        return base
    merged = {**base.model_dump(), **raw}
    if isinstance(raw.get("address"), dict):
        merged["address"] = {**base.address.model_dump(), **raw["address"]}
    if isinstance(raw.get("invoice_counters"), dict):
        merged["invoice_counters"] = {**base.invoice_counters, **raw["invoice_counters"]}
    return CompanySettingsPayload.model_validate(merged)


def format_combined_address(addr: CompanyAddressSettings) -> str:
    parts = [addr.line1, addr.line2, addr.city, addr.state, addr.country, addr.pincode]
    return ", ".join(p.strip() for p in parts if p and p.strip())


def apply_settings_to_company(company: Company, payload: CompanySettingsPayload) -> None:
    company.settings = payload.model_dump()
    if payload.gstin:
        company.gst_number = payload.gstin.strip().upper() or company.gst_number
    addr = payload.address
    if any([addr.line1, addr.line2, addr.city, addr.state, addr.pincode]):
        company.address = format_combined_address(addr)
