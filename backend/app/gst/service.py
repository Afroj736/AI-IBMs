from __future__ import annotations

import re
from typing import Any

import ddddocr
import httpx

GSTIN_PATTERN = re.compile(
    r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
)

GST_STATE_CODES: dict[str, str] = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
}

PORTAL_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://services.gst.gov.in",
    "Referer": "https://services.gst.gov.in/services/searchtp",
}

CAPTCHA_URL = "https://services.gst.gov.in/services/captcha"
SEARCH_URL = "https://services.gst.gov.in/services/api/search/taxpayerDetails"
MAX_ATTEMPTS = 25


class GSTLookupError(Exception):
    pass


def normalize_gstin(gstin: str) -> str:
    return gstin.strip().upper()


def is_valid_gstin(gstin: str) -> bool:
    normalized = normalize_gstin(gstin)
    return len(normalized) == 15 and bool(GSTIN_PATTERN.match(normalized))


def extract_pan_from_gstin(gstin: str) -> str:
    normalized = normalize_gstin(gstin)
    return normalized[2:12] if len(normalized) >= 12 else ""


def _state_from_portal_payload(gstin: str, payload: dict[str, Any]) -> str:
    stj = str(payload.get("stj") or "")
    match = re.search(r"State\s*-\s*([^,]+)", stj, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return GST_STATE_CODES.get(gstin[:2], "")


def _pincode_from_address(address: str) -> str:
    match = re.search(r"\b(\d{6})\b", address)
    return match.group(1) if match else ""


def _city_from_address(address: str, state: str) -> str:
    if not address:
        return ""
    parts = [part.strip() for part in address.split(",") if part.strip()]
    if not parts:
        return ""
    if state and parts[-1].replace(" ", "").isdigit():
        parts = parts[:-1]
    if state and parts and parts[-1].lower() == state.lower():
        parts = parts[:-1]
    return parts[-1] if parts else ""


def _address_from_payload(payload: dict[str, Any]) -> str:
    pradr = payload.get("pradr")
    if isinstance(pradr, dict):
        return str(pradr.get("adr") or "").strip()
    if isinstance(pradr, str):
        return pradr.strip()
    return ""


def _ocr_candidates(image: bytes) -> list[str]:
    candidates: list[str] = []
    for ranges in (None, 0, 6):
        try:
            ocr = ddddocr.DdddOcr(show_ad=False)
            if ranges is not None:
                ocr.set_ranges(ranges)
            text = re.sub(r"[^a-zA-Z0-9]", "", ocr.classification(image))
            if text and text not in candidates:
                candidates.append(text)
        except Exception:
            continue
    return candidates


def _map_portal_response(gstin: str, payload: dict[str, Any]) -> dict[str, str]:
    address = _address_from_payload(payload)
    state = _state_from_portal_payload(gstin, payload)
    return {
        "gstin": normalize_gstin(gstin),
        "legal_name": str(payload.get("lgnm") or "").strip(),
        "trade_name": str(payload.get("tradeNam") or payload.get("lgnm") or "").strip(),
        "pan": extract_pan_from_gstin(gstin),
        "address": address,
        "city": _city_from_address(address, state),
        "state": state,
        "pincode": _pincode_from_address(address),
        "taxpayer_type": str(payload.get("dty") or payload.get("ctb") or "").strip(),
        "registration_date": str(payload.get("rgdt") or "").strip(),
        "status": str(payload.get("sts") or "").strip(),
    }


def lookup_gst_details(gstin: str) -> dict[str, str]:
    normalized = normalize_gstin(gstin)
    if not is_valid_gstin(normalized):
        raise GSTLookupError("Please enter a valid GST number.")

    with httpx.Client(timeout=30, follow_redirects=True, headers=PORTAL_HEADERS) as client:
        for _ in range(MAX_ATTEMPTS):
            captcha_response = client.get(CAPTCHA_URL)
            captcha_response.raise_for_status()

            candidates = _ocr_candidates(captcha_response.content)
            captcha_variants: list[str] = []
            for text in candidates:
                for variant in (text, text.upper(), text.lower()):
                    if variant and variant not in captcha_variants:
                        captcha_variants.append(variant)

            for captcha_text in captcha_variants:
                search_response = client.post(
                    SEARCH_URL,
                    json={"gstin": normalized, "captcha": captcha_text},
                )
                if not search_response.headers.get("content-type", "").startswith("application/json"):
                    continue

                payload = search_response.json()
                if payload.get("lgnm"):
                    return _map_portal_response(normalized, payload)

    raise GSTLookupError("Unable to fetch GST details. Please enter details manually.")
