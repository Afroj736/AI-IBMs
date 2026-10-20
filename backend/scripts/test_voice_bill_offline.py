"""Test draft + confirm without OpenAI (fallback extraction)."""
from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv

backend_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_root))
load_dotenv(backend_root / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.ai_bill_service import AIBillService
from app.models.company import Company  # noqa: F401
from app.models.invoice_template import InvoiceTemplate  # noqa: F401
from app.models.invoice import Invoice  # noqa: F401
from app.models.party import Party  # noqa: F401
from app.models.item import Item  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.voice_recording import VoiceRecording, VoiceRecordingStatus

SAMPLE_TRANSCRIPT = """
Create invoice for Raj Electronics GSTIN 27AABCR1234F1Z5.
Samsung Galaxy S25 Ultra quantity 2 price 85000.
Apple AirPods Pro quantity 3 price 18000.
"""


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL missing")
        return 1

    engine = create_engine(url)
    Session = sessionmaker(bind=engine)
    db = Session()

    recording = VoiceRecording(
        id=uuid.uuid4(),
        file_name="test-offline.wav",
        file_path="uploads/voice/test-offline.wav",
        mime_type="audio/wav",
        file_size=1000,
        transcript=SAMPLE_TRANSCRIPT.strip(),
        status=VoiceRecordingStatus.TRANSCRIBED,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    print("recording_id:", recording.id)

    service = AIBillService(db)
    draft, meta = service.create_draft_from_recording(recording.id, template_id=None, user_id=None)
    print("draft created:", draft.id, "items:", len(draft.items), "grand_total:", draft.grand_total)
    print("new_party:", meta.get("new_party_created"), "party_id:", draft.party_id)

    result = service.confirm_draft_to_invoice(draft.id)
    print("INVOICE CREATED:", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
