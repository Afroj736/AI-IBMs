# Phase 3 - Voice + AI Draft Billing

## Workflow

1. User selects template on `/voice-entry`.
2. User records voice and uploads audio.
3. Whisper integration layer returns transcript.
4. AI extraction parses party and items.
5. System finds/creates draft party and draft items (`pending_review`/inactive).
6. Draft invoice is generated in `invoice_drafts`.
7. User reviews/edits draft.
8. User confirms to generate final invoice through existing billing service.

## New API Endpoints

- `POST /api/v1/voice/upload`
- `POST /api/v1/voice/drafts`
- `GET /api/v1/voice/drafts/{draft_id}`
- `PUT /api/v1/voice/drafts/{draft_id}`
- `POST /api/v1/voice/drafts/{draft_id}/confirm`
- `POST /api/v1/voice/drafts/{draft_id}/cancel`

## Guardrails

- AI never creates final invoice directly without user confirmation.
- AI never modifies inventory directly.
- Existing billing engine remains source of truth for stock and GST finalization.
