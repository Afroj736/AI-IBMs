import io

import pytest
from fastapi import UploadFile
from fastapi.exceptions import HTTPException

from app.voice.service import MAX_SIZE_BYTES, VoiceService


class _Repo:
    def create_recording(self, recording):
        return recording


class _DB:
    def commit(self):
        pass

    def refresh(self, _):
        pass


@pytest.mark.asyncio
async def test_upload_rejects_invalid_content_type(monkeypatch):
    service = VoiceService(_DB())
    service.repo = _Repo()
    file = UploadFile(filename="bad.txt", file=io.BytesIO(b"data"), headers={"content-type": "text/plain"})
    with pytest.raises(HTTPException):
        await service.upload_and_transcribe(file)


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(monkeypatch):
    service = VoiceService(_DB())
    service.repo = _Repo()
    service._transcribe_with_whisper = lambda _: "ok"
    payload = b"x" * (MAX_SIZE_BYTES + 1)
    file = UploadFile(filename="big.webm", file=io.BytesIO(payload), headers={"content-type": "audio/webm"})
    with pytest.raises(HTTPException):
        await service.upload_and_transcribe(file)
