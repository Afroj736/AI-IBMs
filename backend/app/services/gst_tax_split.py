from decimal import Decimal, ROUND_HALF_UP


def gst_state_code_from_gstin(gstin: str | None) -> str | None:
    value = (gstin or "").strip()
    if len(value) < 2:
        return None
    return value[:2].upper()


def _normalize_state(value: str | None) -> str:
    return (value or "").strip().lower()


def is_inter_state_supply(
    company_state: str,
    party_state: str,
    company_gstin: str | None = None,
    party_gstin: str | None = None,
) -> bool:
    company_code = gst_state_code_from_gstin(company_gstin)
    party_code = gst_state_code_from_gstin(party_gstin)
    if company_code and party_code:
        return company_code != party_code

    normalized_company = _normalize_state(company_state)
    normalized_party = _normalize_state(party_state)
    if not normalized_company or not normalized_party:
        return False
    return normalized_company != normalized_party


def split_gst_tax(tax_amount: Decimal, is_inter_state: bool) -> tuple[Decimal, Decimal, Decimal]:
    tax_amount = tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if tax_amount <= 0:
        return Decimal("0.00"), Decimal("0.00"), Decimal("0.00")
    if is_inter_state:
        return Decimal("0.00"), Decimal("0.00"), tax_amount
    cgst = (tax_amount / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    sgst = tax_amount - cgst
    return cgst, sgst, Decimal("0.00")
