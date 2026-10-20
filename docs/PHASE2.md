# Phase 2 Implementation

## Delivered Modules

1. Party Management
2. Invoice Template Management
3. Billing Foundation

## Backend Endpoints

### Party Management
- `POST /api/v1/parties`
- `GET /api/v1/parties`
- `GET /api/v1/parties/{party_id}`
- `PUT /api/v1/parties/{party_id}`
- `DELETE /api/v1/parties/{party_id}`
- `GET /api/v1/parties/{party_id}/ledger`
- `GET /api/v1/parties/{party_id}/transactions`

### Invoice Template Management
- `POST /api/v1/invoice-templates`
- `GET /api/v1/invoice-templates`
- `GET /api/v1/invoice-templates/{template_id}`
- `PUT /api/v1/invoice-templates/{template_id}`
- `DELETE /api/v1/invoice-templates/{template_id}`
- `POST /api/v1/invoice-templates/{template_id}/duplicate`
- `POST /api/v1/invoice-templates/{template_id}/activate`

### Billing Foundation
- `POST /api/v1/invoices`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/{invoice_id}`
- `PUT /api/v1/invoices/{invoice_id}`
- `DELETE /api/v1/invoices/{invoice_id}`

## Key Billing Rules Enforced

- Stock is validated before invoice creation.
- Stock is reduced immediately after invoice commit.
- GST is computed in backend service per line item.
- Invoice number is automatically generated (`INV-000001` style).
