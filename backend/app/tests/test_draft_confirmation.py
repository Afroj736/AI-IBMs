from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.ai.ai_bill_service import AIBillService
from app.models.invoice_draft import InvoiceDraftStatus


class _Repo:
    def __init__(self, draft):
        self._draft = draft

    def get_draft(self, _):
        return self._draft

    def create_log(self, _):
        return None


class _DB:
    def __init__(self):
        self.rolled_back = False

    def commit(self):
        pass

    def refresh(self, _):
        pass

    def rollback(self):
        self.rolled_back = True


def test_confirm_rejects_already_confirmed(monkeypatch):
    draft = SimpleNamespace(
        id=uuid4(),
        status=InvoiceDraftStatus.CONFIRMED,
        party_id=uuid4(),
        template_id=None,
        invoice_date=None,
        discount_amount=0,
        round_off=0,
        notes=None,
        items=[],
    )
    service = AIBillService.__new__(AIBillService)
    service.db = _DB()
    service.repo = _Repo(draft)
    with pytest.raises(HTTPException):
        service.confirm_draft_to_invoice(draft.id)
