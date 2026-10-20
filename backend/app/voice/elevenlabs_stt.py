"""ElevenLabs Scribe speech-to-text fallback."""

from pathlib import Path

import httpx

from app.core.logger import log_event

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


class ElevenLabsSTTError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _mime_to_suffix(mime_type: str | None, file_path: Path) -> str:
    if file_path.suffix:
        return file_path.suffix
    mapping = {
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/m4a": ".m4a",
        "audio/x-m4a": ".m4a",
    }
    return mapping.get(mime_type or "", ".webm")


def transcribe_file(
    file_path: Path,
    *,
    api_key: str,
    model_id: str = "scribe_v2",
    mime_type: str | None = None,
    timeout_seconds: int = 120,
) -> str:
    suffix = _mime_to_suffix(mime_type, file_path)
    upload_name = file_path.name if file_path.suffix else f"{file_path.stem}{suffix}"
    content_type = mime_type or "application/octet-stream"

    with file_path.open("rb") as audio_file:
        response = httpx.post(
            ELEVENLABS_STT_URL,
            headers={"xi-api-key": api_key},
            files={"file": (upload_name, audio_file, content_type)},
            data={"model_id": model_id, "language_code": "eng"},
            timeout=timeout_seconds,
        )

    if response.status_code == 429:
        log_event("elevenlabs_stt_rate_limited", file=upload_name)
        raise ElevenLabsSTTError("ElevenLabs rate limit exceeded", status_code=429)

    if response.status_code >= 400:
        detail = response.text[:300]
        log_event("elevenlabs_stt_failed", status=response.status_code, detail=detail)
        if response.status_code == 401 and "speech_to_text" in detail:
            raise ElevenLabsSTTError(
                "ElevenLabs API key is missing speech_to_text permission. "
                "Enable Scribe / Speech-to-Text for this key in the ElevenLabs dashboard.",
                status_code=401,
            )
        raise ElevenLabsSTTError(
            f"ElevenLabs transcription failed ({response.status_code})",
            status_code=response.status_code,
        )

    payload = response.json()
    text = (payload.get("text") or "").strip()
    if not text:
        raise ElevenLabsSTTError("ElevenLabs returned an empty transcript")

    log_event(
        "elevenlabs_stt_success",
        model=model_id,
        file=upload_name,
        transcript_len=len(text),
    )
    return text
