# Inventory AI System — API Collection

**Share this with:** Backend / Frontend / QA  
**Base URL:** `http://localhost:8000/api/v1`  
**Interactive docs:** `http://localhost:8000/docs`  
**Postman import:** [postman_collection.json](./postman_collection.json)  
**Improvement guide:** [API_IMPROVEMENT_GUIDE.md](./API_IMPROVEMENT_GUIDE.md)

---

## How to use

1. Start backend: `uvicorn app.main:app --reload --port 8000` (from `backend/`)
2. Import `docs/postman_collection.json` into Postman (or Thunder Client / Insomnia)
3. Run **Auth → Login** first — access token is saved to `{{token}}`
4. Seed login (local):

| Email | Password |
|-------|----------|
| `admin@blulabs.in` | `Admin@12345` |

**Auth header (all protected routes):** `Authorization: Bearer {{token}}`

---

## Collection index

| # | Folder | Endpoints |
|---|--------|-----------|
| 1 | System | 1 |
| 2 | Auth | 4 |
| 3 | Inventory | 9 |
| 4 | Parties | 7 |
| 5 | Invoice Templates | 7 |
| 6 | Invoices | 6 |
| 7 | Billing | 3 |
| 8 | Voice & AI Drafts | 7 |
| 9 | Company Settings | 2 |
| 10 | User Profile | 3 |
| 11 | GST | 1 |
| 12 | Platform Admin | 7 |
| | **Total** | **~57** |

---

## 1. System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | App + DB health (host root, not under `/api/v1`) |

---

## 2. Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Register owner + create company; returns tokens |
| `POST` | `/auth/login` | No | Login; returns access + refresh tokens |
| `POST` | `/auth/refresh` | No | Refresh tokens using refresh token |
| `GET` | `/auth/me` | Yes | Current user + company summary |

### Login body

```json
{
  "email": "admin@blulabs.in",
  "password": "Admin@12345"
}
```

### Register body (SmartBill form)

```json
{
  "email": "owner@example.com",
  "password": "Owner@12345",
  "business_name": "Demo Store",
  "owner_name": "Demo Owner",
  "mobile": "9876543210",
  "gst_number": "29ABCDE1234F1Z5",
  "address": "Bengaluru"
}
```

---

## 3. Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/inventory/items` | Yes (write roles) | Create item |
| `GET` | `/inventory/items` | Yes | List items |
| `GET` | `/inventory/brands` | Yes | List brands |
| `POST` | `/inventory/brands` | Yes (write) | Create brand |
| `DELETE` | `/inventory/brands/{brand_id}` | Yes (write) | Delete brand |
| `GET` | `/inventory/categories` | Yes | List categories |
| `POST` | `/inventory/categories` | Yes (write) | Create category |
| `DELETE` | `/inventory/categories/{category_id}` | Yes (write) | Delete category |
| `POST` | `/inventory/catalog/bulk` | Yes (write) | Create brand and/or category together |

### Create item (sample)

```json
{
  "item_name": "Samsung Galaxy S25 Ultra",
  "item_code": "ITM-SAMSUNG-S25U",
  "sku": "SKU-SAMSUNG-S25U",
  "barcode": "8901000000001",
  "category": "Mobile Phones",
  "sub_category": "Flagship",
  "brand": "Samsung",
  "model_number": "S25 Ultra",
  "serial_number_required": false,
  "hsn_code": "85171200",
  "gst_percentage": 18,
  "purchase_price": 98000,
  "selling_price": 105000,
  "minimum_stock": 5,
  "current_stock": 25,
  "description": "Flagship smartphone",
  "status": "active"
}
```

---

## 4. Parties (customers / suppliers)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/parties` | Yes | Create party |
| `GET` | `/parties` | Yes | List (`search`, `party_type`) |
| `GET` | `/parties/{party_id}` | Yes | Get party |
| `PUT` | `/parties/{party_id}` | Yes | Update party |
| `DELETE` | `/parties/{party_id}` | Yes | Delete party |
| `GET` | `/parties/{party_id}/ledger` | Yes | Opening balance + running balance |
| `GET` | `/parties/{party_id}/transactions` | Yes | Related invoices |

`party_type`: `customer` | `supplier` | `both`

---

## 5. Invoice templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/invoice-templates` | Yes | Create template |
| `GET` | `/invoice-templates` | Yes | List templates |
| `GET` | `/invoice-templates/{template_id}` | Yes | Get template |
| `PUT` | `/invoice-templates/{template_id}` | Yes | Update template |
| `DELETE` | `/invoice-templates/{template_id}` | Yes | Delete template |
| `POST` | `/invoice-templates/{template_id}/duplicate` | Yes | Duplicate |
| `POST` | `/invoice-templates/{template_id}/activate` | Yes | Set active |

---

## 6. Invoices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/invoices/next-number` | Yes | Peek next number (`type=retail` \| `gst`) |
| `POST` | `/invoices` | Yes | Create invoice |
| `GET` | `/invoices` | Yes | List (`search`) |
| `GET` | `/invoices/{invoice_id}` | Yes | Get invoice |
| `PUT` | `/invoices/{invoice_id}` | Yes | Update invoice |
| `DELETE` | `/invoices/{invoice_id}` | Yes | Delete invoice |

### Create invoice (sample)

```json
{
  "party_id": "{{partyId}}",
  "template_id": "{{templateId}}",
  "invoice_type": "retail",
  "invoice_date": "2026-10-20",
  "discount_amount": 0,
  "round_off": 0,
  "received_amount": 0,
  "notes": "Test invoice",
  "items": [
    {
      "item_id": "{{itemId}}",
      "quantity": 2,
      "discount": 0
    }
  ]
}
```

---

## 7. Billing helpers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/billing/business` | Yes | Company business info for invoices |
| `POST` | `/billing/ai-validate-lines` | Yes | AI guardrail: accept/reject bill lines |
| `POST` | `/billing/manual-update-stock/{item_code}?delta=` | Yes | Manual stock adjust |

### AI validate lines (sample)

```json
{
  "lines": [
    { "item_code": "ITM-SAMSUNG-S25U", "quantity": 2 }
  ],
  "create_missing_as_draft": true
}
```

**Guardrail:** AI bills only active, in-stock items. Missing items may become `pending_review` drafts.

---

## 8. Voice & AI drafts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/voice/upload` | Yes | Upload audio (`multipart`: `audio_file`, optional `template_id`) |
| `POST` | `/voice/drafts` | Yes | Create draft from recording |
| `GET` | `/voice/drafts/{draft_id}` | Yes | Get draft |
| `PUT` | `/voice/drafts/{draft_id}` | Yes | Update draft lines / notes |
| `GET` | `/voice/drafts/{draft_id}/review-context` | Yes | Review UI context |
| `POST` | `/voice/drafts/{draft_id}/confirm` | Yes | Confirm → final invoice |
| `POST` | `/voice/drafts/{draft_id}/cancel` | Yes | Cancel draft |

### Suggested flow

```text
Upload audio → Create draft → Review / Update → Confirm (or Cancel)
```

---

## 9. Company settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/companies/settings` | Yes | Get company + settings JSON |
| `PUT` | `/companies/settings` | Yes (owner/manager/…) | Update company settings |

---

## 10. User profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me/profile` | Yes | Get profile |
| `PUT` | `/users/me/profile` | Yes | Update profile |
| `POST` | `/users/me/change-password` | Yes | Change password (bumps token version) |

---

## 11. GST lookup

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/gst/lookup/{gstin}` | Yes | Lookup GSTIN details |

---

## 12. Platform admin (`admin` role only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/dashboard` | Admin | Platform stats |
| `GET` | `/admin/users` | Admin | List users (`role`, `search`, `company_id`, `is_active`) |
| `GET` | `/admin/users/{user_id}` | Admin | User detail |
| `PATCH` | `/admin/users/{user_id}` | Admin | Update role / active |
| `POST` | `/admin/users/{user_id}/force-logout` | Admin | Invalidate sessions |
| `POST` | `/admin/users/{user_id}/disable` | Admin | Disable + logout |
| `GET` | `/admin/bills` | Admin | List bills (`role`, `user_id`, `search`) |

---

## Postman variables

| Variable | Purpose |
|----------|---------|
| `host` | `http://localhost:8000` |
| `baseUrl` | `http://localhost:8000/api/v1` |
| `token` | Access JWT (auto-set on login/register) |
| `refreshToken` | Refresh JWT (auto-set on login/register) |
| `itemId` / `itemCode` | Inventory helpers |
| `partyId` | Party helpers |
| `templateId` | Template helpers |
| `invoiceId` | Invoice helpers |
| `recordingId` / `draftId` | Voice flow |
| `userId` / `brandId` / `categoryId` | Admin / catalog helpers |

---

## Quick curl examples

```bash
# Health
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@blulabs.in\",\"password\":\"Admin@12345\"}"

# Me (replace TOKEN)
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"

# List inventory
curl http://localhost:8000/api/v1/inventory/items \
  -H "Authorization: Bearer TOKEN"
```

---

## Related files to send together

| File | Audience |
|------|----------|
| `docs/API_COLLECTION.md` | Everyone (this catalog) |
| `docs/postman_collection.json` | Postman users |
| `docs/API_IMPROVEMENT_GUIDE.md` | Backend engineers |
| `docs/API.md` | Short overview |
| `docs/RBAC_ROADMAP.md` | Roles / permissions planning |

---

*Generated for local/dev sharing. Update sample bodies if request schemas change; keep OpenAPI at `/docs` as source of truth.*
