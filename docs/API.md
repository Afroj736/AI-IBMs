# API Overview

Base URL: `http://localhost:8000/api/v1`

**Share with the team**
- Full catalog: [API_COLLECTION.md](./API_COLLECTION.md)
- Postman import: [postman_collection.json](./postman_collection.json)
- Backend improvement guide: [API_IMPROVEMENT_GUIDE.md](./API_IMPROVEMENT_GUIDE.md)

System health:
- `GET http://localhost:8000/health`

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

## Inventory
- `POST /inventory/items`
- `GET /inventory/items`

## Billing
- `POST /billing/ai-validate-lines`
- `POST /billing/manual-update-stock/{item_code}?delta=10`

## Voice Entry + AI Draft Billing
- `POST /voice/upload`
- `POST /voice/drafts`
- `GET /voice/drafts/{draft_id}`
- `PUT /voice/drafts/{draft_id}`
- `POST /voice/drafts/{draft_id}/confirm`
- `POST /voice/drafts/{draft_id}/cancel`
- `GET /voice/drafts/{draft_id}/review-context`

## AI Guardrail Policy
- AI billing accepts only existing, active, in-stock items.
- Missing items can be created as `pending_review` draft records when enabled.
- Manual edit/update remains user-controlled via explicit endpoints/UI actions.
