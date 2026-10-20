from app.companies.service import merge_settings
from app.models.company import Company
from app.schemas.company_settings import CompanySettingsPayload

COUNTER_KEYS: dict[str, str] = {
    "retail": "RET",
    "gst": "GST",
    "purchase": "PUR",
    "ai": "AI",
}


def counter_key_for_type(invoice_type: str) -> str:
    return COUNTER_KEYS.get((invoice_type or "retail").lower(), "RET")


def prefix_for_type(settings: CompanySettingsPayload, invoice_type: str) -> str:
    key = counter_key_for_type(invoice_type)
    if key == "RET":
        raw = (settings.invoice_prefix or "RET").strip().upper()
        return raw or "RET"
    return key


def next_counter_value(settings: CompanySettingsPayload, invoice_type: str) -> int:
    key = counter_key_for_type(invoice_type)
    counters = settings.invoice_counters or {}
    if key in counters:
        return int(counters[key])
    return int(settings.invoice_start_number or 1001)


def peek_next_invoice_number(settings: CompanySettingsPayload, invoice_type: str) -> str:
    prefix = prefix_for_type(settings, invoice_type)
    number = next_counter_value(settings, invoice_type)
    return f"{prefix}{number}"


def allocate_invoice_number(company: Company, invoice_type: str) -> str:
    settings = merge_settings(company.settings if isinstance(company.settings, dict) else None)
    key = counter_key_for_type(invoice_type)
    prefix = prefix_for_type(settings, invoice_type)
    counters = dict(settings.invoice_counters)
    number = int(counters.get(key, settings.invoice_start_number or 1001))
    invoice_number = f"{prefix}{number}"
    counters[key] = number + 1
    updated = settings.model_copy(update={"invoice_counters": counters})
    company.settings = updated.model_dump()
    return invoice_number
