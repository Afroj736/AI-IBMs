from sqlalchemy.orm import Session, joinedload

from app.models.ai_processing_log import AIProcessingLog
from app.models.invoice_draft import InvoiceDraft
from app.models.voice_recording import VoiceRecording


class VoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_recording(self, recording: VoiceRecording) -> VoiceRecording:
        self.db.add(recording)
        self.db.flush()
        return recording

    def get_recording(self, recording_id):
        return self.db.query(VoiceRecording).filter(VoiceRecording.id == recording_id).first()

    def create_draft(self, draft: InvoiceDraft) -> InvoiceDraft:
        self.db.add(draft)
        self.db.flush()
        return draft

    def get_draft(self, draft_id):
        return self.db.query(InvoiceDraft).options(joinedload(InvoiceDraft.items)).filter(InvoiceDraft.id == draft_id).first()

    def create_log(self, log: AIProcessingLog) -> AIProcessingLog:
        self.db.add(log)
        self.db.flush()
        return log

    def get_latest_log_by_draft(self, draft_id):
        return self.db.query(AIProcessingLog).filter(AIProcessingLog.draft_id == draft_id).order_by(AIProcessingLog.created_at.desc()).first()
