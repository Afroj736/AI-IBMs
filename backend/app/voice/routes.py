import time
from uuid import UUID
from collections import deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.ai.ai_bill_service import AIBillService
from app.auth.dependencies import VOICE_BILLING_ROLES, require_roles
from app.config.settings import settings
from app.core.logger import log_event
from app.database.session import get_db
from app.models.user import User, UserRole
from app.schemas.voice_entry import DraftCreateRequest, DraftResponse, DraftUpdateRequest, VoiceUploadResponse
from app.voice.service import VoiceService

router = APIRouter(prefix="/voice", tags=["Voice Entry"])
_voice_upload_rate_bucket: dict[str, deque[datetime]] = {}


def _enforce_upload_rate_limit(user_id: str):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=1)
    queue = _voice_upload_rate_bucket.setdefault(user_id, deque())
    while queue and queue[0] < cutoff:
        queue.popleft()
    if len(queue) >= settings.voice_upload_rate_limit_per_minute:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Voice upload rate limit exceeded")
    queue.append(now)


@router.post("/upload", response_model=VoiceUploadResponse)
async def upload_voice(
    audio_file: UploadFile = File(...),
    template_id: UUID | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    _enforce_upload_rate_limit(str(current_user.id))
    recording = await VoiceService(db).upload_and_transcribe(audio_file, template_id)
    log_event("voice_upload_api_success", user_id=current_user.id, recording_id=recording.id)
    transcript_source = getattr(recording, "_transcript_source", "speech")
    return VoiceUploadResponse(
        recording_id=recording.id,
        transcript=recording.transcript or "",
        status=recording.status,
        transcript_source=transcript_source,
    )


@router.post("/drafts", response_model=DraftResponse)
def create_draft_from_voice(
    payload: DraftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    started = time.perf_counter()
    draft, _meta = AIBillService(db).create_draft_from_recording(payload.recording_id, payload.template_id, current_user.id)
    log_event("voice_draft_api_timing", recording_id=str(payload.recording_id), seconds=round(time.perf_counter() - started, 3))
    return draft


@router.get("/drafts/{draft_id}", response_model=DraftResponse)
def get_draft(
    draft_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    draft = AIBillService(db).repo.get_draft(draft_id)
    if not draft:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    return draft


@router.put("/drafts/{draft_id}", response_model=DraftResponse)
def update_draft(
    draft_id: UUID,
    payload: DraftUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    return AIBillService(db).update_draft(draft_id, payload)


@router.post("/drafts/{draft_id}/confirm")
def confirm_draft(
    draft_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    return AIBillService(db).confirm_draft_to_invoice(draft_id)


@router.get("/drafts/{draft_id}/review-context")
def review_context(
    draft_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    return AIBillService(db).get_review_context(draft_id)


@router.post("/drafts/{draft_id}/cancel", response_model=DraftResponse)
def cancel_draft(
    draft_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, *VOICE_BILLING_ROLES)),
):
    return AIBillService(db).cancel_draft(draft_id)
