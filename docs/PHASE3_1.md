# Phase 3.1 - Production AI Hardening

## Completed Hardening Scope

- Real Whisper transcription via OpenAI client in `voice/service.py`
- Environment-driven OpenAI/voice config in `config/settings.py`
- Retry + timeout + error mapping for transcription and extraction
- Prompt-injection sanitization before AI extraction
- Strict JSON extraction with Pydantic validation
- Confidence-scored structured extraction fields
- Duplicate detection with GSTIN/mobile/name/item fuzzy checks
- Voice upload rate limiting and file size/type validation
- Structured logging for upload, transcription, draft creation, confirmation, and failures
- Enhanced audit trail with `user_id` and `validated_response_json`
- Review-context API for warnings/missing fields/validated response
- Transaction-safe confirm wrapper with rollback on failures
- Initial automated tests for extraction, upload validation, and draft confirmation guardrails

## New/Updated Endpoints

- `GET /api/v1/voice/drafts/{draft_id}/review-context`

## Notes

- Final invoice creation still routes through existing billing service (`InvoiceService`) as source of truth.
- Test files are generated under `backend/app/tests`; run after installing test dependencies.
