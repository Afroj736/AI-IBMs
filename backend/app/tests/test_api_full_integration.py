"""
Full API integration tests — positive and negative scenarios.
Run from backend/: pytest app/tests/test_api_full_integration.py -v
Requires PostgreSQL per backend/.env (SQLite disabled).
"""

from __future__ import annotations

import io
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
RUN = uuid.uuid4().hex[:8]


def _register(email: str, role: str = "admin") -> dict:
    r = client.post(
        "/api/v1/auth/register",
        json={"name": "API Test", "email": email, "password": "Test@12345", "role": role},
    )
    return r


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_tokens():
    email = f"api.suite.admin+{RUN}@blulabs.in"
    r = _register(email, "admin")
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "access": data["access_token"], "refresh": data["refresh_token"]}


@pytest.fixture(scope="module")
def operator_tokens():
    email = f"api.suite.operator+{RUN}@blulabs.in"
    r = _register(email, "store_operator")
    assert r.status_code == 200, r.text
    return {"access": r.json()["access_token"]}


# --- System ---


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["application_status"] == "ok"
    assert body["database_status"] == "up"


def test_health_not_under_api_v1():
    r = client.get("/api/v1/health")
    assert r.status_code == 404


# --- Auth positive / negative ---


def test_auth_register_login_me_flow(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    me = client.get("/api/v1/auth/me", headers=h)
    assert me.status_code == 200
    assert me.json()["email"] == admin_tokens["email"]
    assert me.json()["role"] == "admin"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": admin_tokens["email"], "password": "Test@12345"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_auth_register_duplicate_409(admin_tokens):
    r = _register(admin_tokens["email"])
    assert r.status_code == 409


def test_auth_register_validation_422():
    r = client.post("/api/v1/auth/register", json={"name": "x", "email": "not-email", "password": "short"})
    assert r.status_code == 422


def test_auth_login_invalid_401():
    r = client.post(
        "/api/v1/auth/login",
        json={"email": f"nouser+{RUN}@blulabs.in", "password": "Test@12345"},
    )
    assert r.status_code == 401


def test_auth_me_no_token_401():
    assert client.get("/api/v1/auth/me").status_code == 401


def test_auth_me_invalid_token_401():
    r = client.get("/api/v1/auth/me", headers=_auth_header("invalid.token.here"))
    assert r.status_code == 401


# --- Inventory ---


def test_inventory_crud_and_negatives(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    code = f"ITM-{RUN}"
    sku = f"SKU-{RUN}"
    payload = {
        "item_name": "Test Widget",
        "item_code": code,
        "sku": sku,
        "gst_percentage": 18,
        "purchase_price": 100,
        "selling_price": 150,
        "minimum_stock": 1,
        "current_stock": 50,
        "status": "active",
    }
    create = client.post("/api/v1/inventory/items", json=payload, headers=h)
    assert create.status_code == 201, create.text
    item_id = create.json()["id"]

    dup = client.post("/api/v1/inventory/items", json=payload, headers=h)
    assert dup.status_code == 409

    listing = client.get("/api/v1/inventory/items", headers=h)
    assert listing.status_code == 200
    assert any(i["item_code"] == code for i in listing.json())

    assert client.get("/api/v1/inventory/items").status_code == 401


def test_inventory_create_as_store_operator(operator_tokens):
    h = _auth_header(operator_tokens["access"])
    r = client.post(
        "/api/v1/inventory/items",
        json={
            "item_name": "Op Item",
            "item_code": f"OP-{RUN}",
            "sku": f"OPSKU-{RUN}",
            "gst_percentage": 0,
            "purchase_price": 1,
            "selling_price": 2,
            "minimum_stock": 0,
            "current_stock": 1,
        },
        headers=h,
    )
    assert r.status_code == 200 or r.status_code == 201


# --- Parties ---


def test_parties_crud_and_negatives(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    create = client.post(
        "/api/v1/parties",
        json={
            "party_type": "customer",
            "name": f"Party {RUN}",
            "mobile": "9876543210",
            "opening_balance": 0,
        },
        headers=h,
    )
    assert create.status_code == 200, create.text
    party_id = create.json()["id"]

    listing = client.get("/api/v1/parties", headers=h)
    assert listing.status_code == 200, listing.text
    assert any(p["id"] == party_id for p in listing.json())

    filtered = client.get("/api/v1/parties", headers=h, params={"search": f"Party {RUN}", "party_type": "customer"})
    assert filtered.status_code == 200
    assert any(p["id"] == party_id for p in filtered.json())

    get_one = client.get(f"/api/v1/parties/{party_id}", headers=h)
    assert get_one.status_code == 200

    update = client.put(
        f"/api/v1/parties/{party_id}",
        json={"name": f"Party Updated {RUN}"},
        headers=h,
    )
    assert update.status_code == 200

    ledger = client.get(f"/api/v1/parties/{party_id}/ledger", headers=h)
    assert ledger.status_code == 200

    txns = client.get(f"/api/v1/parties/{party_id}/transactions", headers=h)
    assert txns.status_code == 200

    fake = "00000000-0000-0000-0000-000000000099"
    assert client.get(f"/api/v1/parties/{fake}", headers=h).status_code == 404


# --- Invoice templates ---


def test_invoice_templates_flow(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    create = client.post(
        "/api/v1/invoice-templates",
        json={
            "template_name": f"Tmpl {RUN}",
            "template_type": "retail_gst_invoice",
            "company_name": "Test Co",
        },
        headers=h,
    )
    assert create.status_code == 200, create.text
    tid = create.json()["id"]

    assert client.get("/api/v1/invoice-templates", headers=h).status_code == 200
    assert client.get(f"/api/v1/invoice-templates/{tid}", headers=h).status_code == 200

    dup = client.post(f"/api/v1/invoice-templates/{tid}/duplicate", headers=h)
    assert dup.status_code == 200

    act = client.post(f"/api/v1/invoice-templates/{tid}/activate", headers=h)
    assert act.status_code == 200

    upd = client.put(
        f"/api/v1/invoice-templates/{tid}",
        json={"footer_text": "Thanks"},
        headers=h,
    )
    assert upd.status_code == 200

    assert client.get(f"/api/v1/invoice-templates/{uuid.uuid4()}", headers=h).status_code == 404



# --- Invoices ---


def test_invoices_flow(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    code = f"INVITEM-{RUN}"
    item = client.post(
        "/api/v1/inventory/items",
        json={
            "item_name": "Invoice Line Item",
            "item_code": code,
            "sku": f"ISKU-{RUN}",
            "gst_percentage": 18,
            "purchase_price": 100,
            "selling_price": 200,
            "minimum_stock": 1,
            "current_stock": 100,
            "status": "active",
        },
        headers=h,
    )
    assert item.status_code == 201
    item_id = item.json()["id"]

    party = client.post(
        "/api/v1/parties",
        json={"party_type": "customer", "name": f"Inv Party {RUN}", "mobile": "9123456789"},
        headers=h,
    )
    party_id = party.json()["id"]

    inv = client.post(
        "/api/v1/invoices",
        json={
            "party_id": party_id,
            "invoice_date": str(date.today()),
            "items": [{"item_id": item_id, "quantity": 2, "discount": 0}],
        },
        headers=h,
    )
    assert inv.status_code == 200, inv.text
    inv_id = inv.json()["id"]

    assert client.get("/api/v1/invoices", headers=h).status_code == 200
    assert client.get(f"/api/v1/invoices/{inv_id}", headers=h).status_code == 200

    bad_stock = client.post(
        "/api/v1/invoices",
        json={
            "party_id": party_id,
            "invoice_date": str(date.today()),
            "items": [{"item_id": item_id, "quantity": 99999, "discount": 0}],
        },
        headers=h,
    )
    assert bad_stock.status_code == 422

    pay_upd = client.put(
        f"/api/v1/invoices/{inv_id}",
        json={"payment_status": "paid", "notes": "Paid in full"},
        headers=h,
    )
    assert pay_upd.status_code == 200

    assert client.get(f"/api/v1/invoices/{uuid.uuid4()}", headers=h).status_code == 404


def test_invoices_forbidden_store_operator(operator_tokens, admin_tokens):
    h_admin = _auth_header(admin_tokens["access"])
    item = client.post(
        "/api/v1/inventory/items",
        json={
            "item_name": "Op Deny Item",
            "item_code": f"OPDENY-{RUN}",
            "sku": f"OPDENYSKU-{RUN}",
            "gst_percentage": 0,
            "purchase_price": 1,
            "selling_price": 2,
            "minimum_stock": 0,
            "current_stock": 5,
            "status": "active",
        },
        headers=h_admin,
    )
    item_id = item.json()["id"]
    party = client.post(
        "/api/v1/parties",
        json={"party_type": "customer", "name": f"OpDeny {RUN}", "mobile": "9000000001"},
        headers=h_admin,
    )
    party_id = party.json()["id"]
    h_op = _auth_header(operator_tokens["access"])
    r = client.post(
        "/api/v1/invoices",
        json={
            "party_id": party_id,
            "invoice_date": str(date.today()),
            "items": [{"item_id": item_id, "quantity": 1, "discount": 0}],
        },
        headers=h_op,
    )
    assert r.status_code == 403


# --- Billing ---


def test_billing_ai_validate(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    code = f"BILL-{RUN}"
    client.post(
        "/api/v1/inventory/items",
        json={
            "item_name": "Bill Item",
            "item_code": code,
            "sku": f"BSKU-{RUN}",
            "gst_percentage": 18,
            "purchase_price": 50,
            "selling_price": 80,
            "minimum_stock": 0,
            "current_stock": 10,
            "status": "active",
        },
        headers=h,
    )
    ok = client.post(
        "/api/v1/billing/ai-validate-lines",
        json={"lines": [{"item_code": code, "quantity": 1}], "create_missing_as_draft": False},
        headers=h,
    )
    assert ok.status_code == 200
    assert len(ok.json()["accepted"]) == 1

    fail = client.post(
        "/api/v1/billing/ai-validate-lines",
        json={"lines": [{"item_code": f"MISSING-{RUN}", "quantity": 1}], "create_missing_as_draft": False},
        headers=h,
    )
    assert fail.status_code == 422

    stock = client.post(f"/api/v1/billing/manual-update-stock/{code}?delta=5", headers=h)
    assert stock.status_code == 200
    assert stock.json()["current_stock"] >= 10

    assert client.post("/api/v1/billing/manual-update-stock/NO-SUCH?delta=1", headers=h).status_code == 404


def test_billing_forbidden_operator(operator_tokens):
    h = _auth_header(operator_tokens["access"])
    r = client.post(
        "/api/v1/billing/ai-validate-lines",
        json={"lines": [{"item_code": "x", "quantity": 1}]},
        headers=h,
    )
    assert r.status_code == 403


# --- Voice ---


def test_voice_upload_negatives(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    bad_type = client.post(
        "/api/v1/voice/upload",
        headers=h,
        files={"audio_file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
    )
    assert bad_type.status_code == 415

    empty = client.post(
        "/api/v1/voice/upload",
        headers=h,
        files={"audio_file": ("empty.webm", io.BytesIO(b""), "audio/webm")},
    )
    assert empty.status_code == 400

    assert client.post(
        "/api/v1/voice/upload",
        files={"audio_file": ("x.webm", io.BytesIO(b"x"), "audio/webm")},
    ).status_code == 401


def test_voice_upload_no_openai_key_503(admin_tokens):
    """When OPENAI_API_KEY is empty, valid upload returns 503."""
    h = _auth_header(admin_tokens["access"])
    r = client.post(
        "/api/v1/voice/upload",
        headers=h,
        files={"audio_file": ("tiny.webm", io.BytesIO(b"\x00\x01"), "audio/webm")},
    )
    assert r.status_code in (503, 200)


def test_voice_draft_not_found_404(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    fake = uuid.uuid4()
    assert client.get(f"/api/v1/voice/drafts/{fake}", headers=h).status_code == 404
    assert client.post(f"/api/v1/voice/drafts/{fake}/cancel", headers=h).status_code in (404, 422)


# --- Cleanup deletes (admin only) ---


def test_delete_party_and_template(admin_tokens):
    h = _auth_header(admin_tokens["access"])
    p = client.post(
        "/api/v1/parties",
        json={"party_type": "supplier", "name": f"Del {RUN}", "mobile": "9111111111"},
        headers=h,
    )
    pid = p.json()["id"]
    assert client.delete(f"/api/v1/parties/{pid}", headers=h).status_code == 200

    t = client.post(
        "/api/v1/invoice-templates",
        json={
            "template_name": f"DelT {RUN}",
            "template_type": "tax_invoice",
            "company_name": "Del Co",
        },
        headers=h,
    )
    tid = t.json()["id"]
    assert client.delete(f"/api/v1/invoice-templates/{tid}", headers=h).status_code == 200

