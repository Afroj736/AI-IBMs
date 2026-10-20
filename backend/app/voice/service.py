import time
from pathlib import Path
from uuid import UUID

from openai import APITimeoutError, OpenAI, RateLimitError
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.logger import log_event
from app.models.voice_recording import VoiceRecording, VoiceRecordingStatus
from app.repositories.voice_repository import VoiceRepository
from app.voice.elevenlabs_stt import ElevenLabsSTTError, transcribe_file as elevenlabs_transcribe

UPLOAD_DIR = Path("uploads/voice")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SUPPORTED_TYPES = {"audio/wav", "audio/mpeg", "audio/webm", "audio/mp3", "audio/m4a", "audio/x-m4a"}
MAX_SIZE_BYTES = settings.voice_max_upload_mb * 1024 * 1024

RATE_LIMIT_USER_MESSAGE = (
    "Speech API rate limit reached on OpenAI and ElevenLabs. "
    "Wait a minute and try again, or check your API quotas."
)


def _retry_sleep(attempt: int, *, rate_limited: bool) -> None:
    if rate_limited:
        time.sleep(min(2**attempt * 2, 30))
    else:
        time.sleep(attempt)


class VoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VoiceRepository(db)
        self.client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds) if settings.openai_api_key else None

    async def upload_and_transcribe(self, audio_file: UploadFile, template_id: UUID | None = None) -> VoiceRecording:
        if audio_file.content_type not in SUPPORTED_TYPES:
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported audio format")

        payload = await audio_file.read()
        if len(payload) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file")
        if len(payload) > MAX_SIZE_BYTES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio exceeds max allowed size")

        file_name = audio_file.filename or "recording.webm"
        path = UPLOAD_DIR / file_name
        path.write_bytes(payload)
        mime_type = audio_file.content_type or "audio/webm"
        log_event("voice_upload_received", file_name=file_name, file_size=len(payload), mime_type=mime_type)
        transcript, transcript_source = self._transcribe_audio(path, mime_type)
        recording = VoiceRecording(
            template_id=template_id,
            file_name=file_name,
            file_path=str(path),
            mime_type=mime_type,
            file_size=len(payload),
            transcript=transcript,
            status=VoiceRecordingStatus.TRANSCRIBED,
        )
        self.repo.create_recording(recording)
        self.db.commit()
        self.db.refresh(recording)
        log_event(
            "voice_transcription_completed",
            recording_id=recording.id,
            transcript_len=len(transcript),
            transcript_source=transcript_source,
        )
        recording._transcript_source = transcript_source  # type: ignore[attr-defined]
        return recording

    def _transcription_models(self) -> list[str]:
        primary = settings.openai_transcription_model.strip()
        fallback = (settings.openai_transcription_fallback_model or "").strip()
        models: list[str] = []
        if primary:
            models.append(primary)
        if fallback and fallback not in models:
            models.append(fallback)
        return models or ["whisper-1"]

    def _transcribe_audio(self, file_path: Path, mime_type: str | None) -> tuple[str, str]:
        openai_failed = False
        openai_rate_limited = False

        if self.client:
            try:
                return self._transcribe_openai(file_path), "speech"
            except HTTPException as exc:
                if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                    openai_rate_limited = True
                    openai_failed = True
                elif exc.status_code in (
                    status.HTTP_502_BAD_GATEWAY,
                    status.HTTP_504_GATEWAY_TIMEOUT,
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                ):
                    openai_failed = True
                else:
                    raise
        else:
            openai_failed = True

        if openai_failed:
            elevenlabs_text = self._transcribe_elevenlabs(file_path, mime_type)
            if elevenlabs_text:
                return elevenlabs_text, "speech"

        fallback = self._dev_fallback_transcript("all_providers_failed")
        if fallback:
            return fallback, "dev_fallback"

        if openai_rate_limited:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMIT_USER_MESSAGE)
        if not self.client and not settings.elevenlabs_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No speech API configured. Set OPENAI_API_KEY or ELEVENLABS_API_KEY.",
            )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to transcribe audio")

    def _transcribe_elevenlabs(self, file_path: Path, mime_type: str | None) -> str | None:
        api_key = (settings.elevenlabs_api_key or "").strip()
        if not api_key:
            return None

        try:
            log_event("voice_transcription_trying_elevenlabs", file=file_path.name)
            return elevenlabs_transcribe(
                file_path,
                api_key=api_key,
                model_id=settings.elevenlabs_stt_model,
                mime_type=mime_type,
                timeout_seconds=settings.openai_timeout_seconds,
            )
        except ElevenLabsSTTError as exc:
            log_event("voice_transcription_elevenlabs_failed", error=str(exc), status=exc.status_code)
            if exc.status_code == 401:
                log_event("elevenlabs_stt_permission_hint", message=str(exc))
            return None
        except Exception as exc:
            log_event("voice_transcription_elevenlabs_failed", error=str(exc))
            return None

    def _transcribe_openai(self, file_path: Path) -> str:
        models = self._transcription_models()
        last_rate_limit = False

        for model_index, model in enumerate(models):
            try:
                return self._transcribe_openai_model(file_path, model)
            except HTTPException as exc:
                if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                    last_rate_limit = True
                    if model_index < len(models) - 1:
                        log_event(
                            "voice_transcription_fallback_model",
                            from_model=model,
                            to_model=models[model_index + 1],
                            file=file_path.name,
                        )
                        time.sleep(2)
                        continue
                raise

        if last_rate_limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMIT_USER_MESSAGE)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to transcribe audio")

    def _dev_fallback_transcript(self, reason: str) -> str | None:
        fallback = (settings.voice_fallback_transcript or "").strip()
        if settings.app_debug and fallback:
            log_event("voice_transcription_dev_fallback", reason=reason)
            return fallback
        return None

    def _transcribe_openai_model(self, file_path: Path, model: str) -> str:
        rate_limit_attempts = 0
        max_rate_limit_attempts = max(1, settings.openai_rate_limit_retries)

        for attempt in range(1, settings.openai_max_retries + 1):
            try:
                with file_path.open("rb") as audio_stream:
                    response = self.client.audio.transcriptions.create(
                        model=model,
                        file=audio_stream,
                    )
                transcript = (getattr(response, "text", None) or "").strip()
                if not transcript:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Speech recognition returned an empty transcript. Please record again clearly.",
                    )
                log_event("voice_transcription_model_success", model=model, file=file_path.name)
                return transcript
            except APITimeoutError:
                log_event("voice_transcription_timeout", model=model, attempt=attempt, file=file_path.name)
                if attempt == settings.openai_max_retries:
                    raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Transcription timed out")
                _retry_sleep(attempt, rate_limited=False)
            except RateLimitError:
                rate_limit_attempts += 1
                log_event("voice_transcription_rate_limited", model=model, attempt=attempt, file=file_path.name)
                if rate_limit_attempts >= max_rate_limit_attempts:
                    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMIT_USER_MESSAGE)
                _retry_sleep(rate_limit_attempts, rate_limited=True)
            except HTTPException:
                raise
            except Exception as exc:
                log_event(
                    "voice_transcription_failed",
                    model=model,
                    attempt=attempt,
                    file=file_path.name,
                    error=str(exc),
                )
                if attempt == settings.openai_max_retries:
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to transcribe audio") from exc
                _retry_sleep(attempt, rate_limited=False)

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected transcription failure")
