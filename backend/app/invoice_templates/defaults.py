"""Default ready-to-use invoice template definitions based on standard GST tax invoice layout."""

from __future__ import annotations

from typing import Any


def _base_layout(invoice_prefix: str, layout: str, title: str) -> dict[str, Any]:
    return {
        "layout": layout,
        "invoice_prefix": invoice_prefix,
        "invoice_number_format": "{prefix}{number}",
        "title": title,
        "copy_label": "ORIGINAL RECIPIENT FOR TAX PAYMENT",
        "show_billing_address": True,
        "show_shipping_address": True,
        "show_customer_gst": True,
        "show_customer_state": True,
        "show_customer_pincode": True,
        "line_columns": [
            "sr",
            "description",
            "hsn",
            "rate",
            "quantity",
            "taxable",
            "gst",
            "total",
        ],
        "totals": [
            "sub_total",
            "cgst",
            "sgst",
            "freight",
            "discount",
            "grand_total",
            "received_amount",
            "balance_amount",
        ],
        "show_amount_in_words": True,
        "show_bank_details": True,
        "show_qr_section": True,
        "show_declaration": True,
        "declaration_label": "Declaration",
        "signature_label": "Authorized Signatory",
        "footer_message": "Thank You For Your Business With Us!",
    }


def gst_tax_invoice_defaults() -> dict[str, Any]:
    return {
        "template_name": "GST Tax Invoice",
        "template_type": "tax_invoice",
        "company_name": "Your Business Name",
        "company_address": "Business Address, City, State, Pin Code",
        "gstin": "",
        "contact_number": "",
        "email": "",
        "show_qr": True,
        "show_barcode": False,
        "show_signature": True,
        "footer_text": "Thank You For Your Business With Us!",
        "terms_conditions": (
            "Subject to local jurisdiction.\n"
            "Interest applicable if delayed payment.\n"
            "Goods once sold will not be taken back."
        ),
        "template_json": _base_layout("G", "gst_tax_invoice_v1", "TAX INVOICE"),
        "status": "active",
    }


def retail_gst_invoice_defaults() -> dict[str, Any]:
    return {
        "template_name": "Retail GST Invoice",
        "template_type": "retail_gst_invoice",
        "company_name": "Your Business Name",
        "company_address": "Business Address, City, State, Pin Code",
        "gstin": "",
        "contact_number": "",
        "email": "",
        "show_qr": True,
        "show_barcode": False,
        "show_signature": True,
        "footer_text": "Thank You For Your Business With Us!",
        "terms_conditions": (
            "Subject to local jurisdiction.\n"
            "Interest applicable if delayed payment.\n"
            "Goods once sold will not be taken back."
        ),
        "template_json": _base_layout("R", "retail_gst_invoice_v1", "TAX INVOICE"),
        "status": "inactive",
    }
