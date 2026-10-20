import json
import re
import time
from datetime import date
from decimal import Decimal
from difflib import SequenceMatcher

from openai import APITimeoutError, OpenAI, RateLimitError
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ValidationError

from app.config.settings import settings
from app.core.logger import log_event
from app.models.ai_processing_log import AIProcessingLog
from app.models.invoice_draft import InvoiceDraft, InvoiceDraftItem, InvoiceDraftStatus
from app.models.item import Item
from app.models.party import Party, PartyStatus, PartyType
from app.models.voice_recording import VoiceRecordingStatus
from app.repositories.voice_repository import VoiceRepository
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.services.invoice_service import InvoiceService


class _UseRegexExtractionFallback(Exception):
    """OpenAI unavailable (quota/rate limit) — use local parser instead."""


_openai_extraction_blocked_until: float = 0.0


def _mark_openai_extraction_blocked(seconds: int = 3600) -> None:
    global _openai_extraction_blocked_until
    _openai_extraction_blocked_until = time.time() + seconds


def _openai_extraction_is_blocked() -> bool:
    return time.time() < _openai_extraction_blocked_until


def _is_openai_quota_or_rate_limit(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "insufficient_quota" in msg
        or "rate limit" in msg
        or "429" in msg
        or "exceeded your current quota" in msg
    )


class AIBillService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VoiceRepository(db)
        self.client = (
            OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_extraction_timeout_seconds)
            if settings.openai_api_key
            else None
        )

    class ConfidenceField(BaseModel):
        value: str | int | float | None = None
        confidence: float = Field(ge=0, le=1)

    class ExtractedParty(BaseModel):
        name: "AIBillService.ConfidenceField"
        gstin: "AIBillService.ConfidenceField"
        mobile: "AIBillService.ConfidenceField"
        address: "AIBillService.ConfidenceField"

    class ExtractedItem(BaseModel):
        name: "AIBillService.ConfidenceField"
        brand: "AIBillService.ConfidenceField"
        model: "AIBillService.ConfidenceField"
        quantity: "AIBillService.ConfidenceField"
        rate: "AIBillService.ConfidenceField"
        discount: "AIBillService.ConfidenceField"
        gst: "AIBillService.ConfidenceField"

    class ExtractedPayload(BaseModel):
        party: "AIBillService.ExtractedParty"
        items: list["AIBillService.ExtractedItem"]

    def extract_entities(self, transcript: str) -> dict:
        sanitized = self._sanitize_transcript(transcript)
        if self.client and not settings.openai_skip_extraction and not _openai_extraction_is_blocked():
            try:
                return self._extract_with_openai(sanitized)
            except _UseRegexExtractionFallback:
                log_event("ai_extraction_using_regex_fallback", transcript_len=len(sanitized))
        elif _openai_extraction_is_blocked():
            log_event("ai_extraction_skipped_openai_circuit_open", transcript_len=len(sanitized))
        return self._fallback_extract(sanitized)

    def _sanitize_transcript(self, transcript: str) -> str:
        text = transcript[:6000]
        text = re.sub(r"(?i)(system:|developer:|ignore previous instructions|execute code)", "", text)
        return text.strip()

    def _fallback_extract(self, transcript: str) -> dict:
        party_name = "Unknown Party"
        for pattern in (
            r"(?:invoice|bill)\s+for\s+(.+?)(?:\s*,|\s+\d|\s+and\s+|$)",
            r"for\s+(.+?)(?:\s*,|\s+\d|\s+and\s+|$)",
            r"customer\s+(.+?)(?:\s*,|\s+\d|$)",
        ):
            party_match = re.search(pattern, transcript, re.IGNORECASE)
            if party_match:
                party_name = party_match.group(1).strip().rstrip(".")
                break

        gstin_match = re.search(r"\b\d{2}[A-Z0-9]{13}\b", transcript, re.IGNORECASE)
        gstin = gstin_match.group(0).upper() if gstin_match else None

        items: list[dict] = []
        item_patterns = [
            r"(\d+)\s+([^,]+?)(?=\s+and\s+\d|\s*,\s*\d|\s*$)",
            r"(\d+)\s+([A-Za-z][A-Za-z0-9\s\-]+)",
        ]
        seen_names: set[str] = set()
        for pattern in item_patterns:
            for match in re.finditer(pattern, transcript, re.IGNORECASE):
                qty = int(match.group(1))
                name = re.sub(r"\s+", " ", match.group(2).strip()).rstrip(".")
                if qty < 1 or len(name) < 2:
                    continue
                key = name.lower()
                if key in seen_names:
                    continue
                seen_names.add(key)
                rate = self._guess_item_rate(name)
                items.append(
                    {
                        "name": {"value": name, "confidence": 0.55},
                        "brand": {"value": None, "confidence": 0.1},
                        "model": {"value": None, "confidence": 0.1},
                        "quantity": {"value": qty, "confidence": 0.55},
                        "rate": {"value": float(rate), "confidence": 0.4},
                        "discount": {"value": 0, "confidence": 0.2},
                        "gst": {"value": 18, "confidence": 0.3},
                    }
                )

        if not items:
            items = [
                {
                    "name": {"value": "Draft Item", "confidence": 0.2},
                    "brand": {"value": None, "confidence": 0.1},
                    "model": {"value": None, "confidence": 0.1},
                    "quantity": {"value": 1, "confidence": 0.2},
                    "rate": {"value": 0, "confidence": 0.2},
                    "discount": {"value": 0, "confidence": 0.2},
                    "gst": {"value": 18, "confidence": 0.2},
                }
            ]

        return {
            "party": {
                "name": {"value": party_name, "confidence": 0.6},
                "gstin": {"value": gstin, "confidence": 0.7 if gstin else 0.2},
                "mobile": {"value": None, "confidence": 0.1},
                "address": {"value": None, "confidence": 0.1},
            },
            "items": items,
        }

    def _guess_item_rate(self, item_name: str) -> Decimal:
        needle = f"%{item_name[:40]}%"
        row = (
            self.db.query(Item)
            .filter(Item.item_name.ilike(needle), Item.status == "active")
            .first()
        ) or self.db.query(Item).filter(Item.item_name.ilike(needle)).first()
        if row:
            return Decimal(str(row.selling_price))
        return Decimal("0.00")

    def _extract_with_openai(self, transcript: str) -> dict:
        prompt = (
            "Extract invoice details from transcript. Return strict JSON only with keys: "
            "party{name{value,confidence},gstin{...},mobile{...},address{...}}, "
            "items[{name{...},brand{...},model{...},quantity{...},rate{...},discount{...},gst{...}}]. "
            "Confidence must be between 0 and 1."
        )
        for attempt in range(1, settings.openai_max_retries + 1):
            try:
                response = self.client.responses.create(
                    model=settings.openai_extraction_model,
                    input=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": transcript},
                    ],
                    temperature=0,
                )
                raw_text = (response.output_text or "").strip()
                parsed = json.loads(raw_text)
                validated = self.ExtractedPayload.model_validate(parsed)
                return validated.model_dump()
            except (json.JSONDecodeError, ValidationError) as exc:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Malformed AI response: {exc}") from exc
            except APITimeoutError:
                if attempt == settings.openai_max_retries:
                    raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="AI extraction timed out")
                time.sleep(attempt)
            except RateLimitError as exc:
                log_event("ai_extraction_rate_limited", attempt=attempt, error=str(exc)[:200])
                _mark_openai_extraction_blocked()
                raise _UseRegexExtractionFallback() from exc
            except Exception as exc:
                if _is_openai_quota_or_rate_limit(exc):
                    log_event("ai_extraction_quota_fallback", attempt=attempt, error=str(exc)[:200])
                    _mark_openai_extraction_blocked()
                    raise _UseRegexExtractionFallback() from exc
                log_event("ai_extraction_failed_attempt", attempt=attempt, error=str(exc)[:200])
                if attempt == settings.openai_max_retries:
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI extraction failed: {exc}") from exc
                time.sleep(attempt)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI extraction failed unexpectedly")

    def _find_or_create_draft_party(self, name: str, gstin: str | None) -> tuple[Party, bool]:
        if gstin:
            existing = self.db.query(Party).filter(Party.gstin == gstin).first()
            if existing:
                return existing, False

        existing = self.db.query(Party).filter(Party.name.ilike(name)).first()
        if existing:
            return existing, False

        search_term = f"%{name[:48]}%" if name else "%"
        candidates = self.db.query(Party).filter(Party.name.ilike(search_term)).limit(25).all()
        best: tuple[float, Party] | None = None
        for row in candidates:
            score = SequenceMatcher(None, (row.name or "").lower(), name.lower()).ratio()
            if score >= 0.85 and (best is None or score > best[0]):
                best = (score, row)
        if best:
            return best[1], False

        count = self.db.query(Party).count() + 1
        party = Party(
            party_code=f"PTY-{count:06d}",
            party_type=PartyType.CUSTOMER,
            name=name,
            gstin=gstin,
            mobile="0000000000",
            status=PartyStatus.INACTIVE,
            notes="AI auto-created draft party. Pending review.",
        )
        self.db.add(party)
        self.db.flush()
        return party, True

    def _find_or_create_draft_item(self, name: str, rate: Decimal) -> tuple[Item, bool]:
        existing = self.db.query(Item).filter(Item.item_name.ilike(name)).first()
        if existing:
            return existing, False

        search_term = f"%{name[:48]}%"
        candidates = self.db.query(Item).filter(Item.item_name.ilike(search_term)).limit(25).all()
        best: tuple[float, Item] | None = None
        for row in candidates:
            score = SequenceMatcher(None, (row.item_name or "").lower(), name.lower()).ratio()
            if score >= 0.88 and (best is None or score > best[0]):
                best = (score, row)
        if best:
            matched = best[1]
            if rate <= 0:
                rate = Decimal(str(matched.selling_price))
            return matched, False

        count = self.db.query(Item).count() + 1
        item_code = f"AI-ITEM-{count:06d}"
        item = Item(
            item_name=name,
            item_code=item_code,
            sku=f"AI-SKU-{count:06d}",
            barcode=f"AI-BC-{count:09d}",
            hsn_code="0000",
            gst_percentage=Decimal("18.00"),
            purchase_price=rate,
            selling_price=rate,
            minimum_stock=0,
            current_stock=0,
            status="pending_review",
            description="AI auto-created draft item. Pending review.",
        )
        self.db.add(item)
        self.db.flush()
        return item, True

    def create_draft_from_recording(self, recording_id, template_id=None, user_id=None):
        recording = self.repo.get_recording(recording_id)
        if not recording:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
        if not recording.transcript:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Recording has no transcript")

        extracted = self.extract_entities(recording.transcript)
        party_name = str(extracted["party"]["name"]["value"] or "Unknown Party")
        party_gstin = extracted["party"]["gstin"]["value"]
        party, is_new_party = self._find_or_create_draft_party(party_name, party_gstin)

        draft = InvoiceDraft(
            voice_recording_id=recording.id,
            template_id=template_id or recording.template_id,
            party_id=party.id,
            invoice_date=date.today(),
            status=InvoiceDraftStatus.DRAFT,
            is_new_party_created=is_new_party,
            notes="AI generated draft. User review required before final invoice.",
        )
        self.repo.create_draft(draft)

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        for extracted_item in extracted["items"]:
            item_name = str(extracted_item["name"]["value"] or "Draft Item")
            qty = int(extracted_item["quantity"]["value"] or 1)
            rate = Decimal(str(extracted_item["rate"]["value"] or "0"))
            discount = Decimal(str(extracted_item["discount"]["value"] or "0"))
            item, is_new_item = self._find_or_create_draft_item(item_name, rate)
            taxable = rate * qty
            taxable -= discount
            if taxable < 0:
                taxable = Decimal("0.00")
            gst_percent = Decimal(item.gst_percentage)
            tax_amount = (taxable * gst_percent / Decimal("100")).quantize(Decimal("0.01"))
            line_total = taxable + tax_amount
            self.db.add(
                InvoiceDraftItem(
                    draft_id=draft.id,
                    item_id=item.id,
                    item_name=item.item_name,
                    quantity=qty,
                    rate=rate,
                    discount=discount,
                    gst_percent=gst_percent,
                    tax_amount=tax_amount,
                    line_total=line_total,
                    is_new_item_created=is_new_item,
                )
            )
            subtotal += taxable
            total_tax += tax_amount

        draft.subtotal = subtotal
        draft.cgst_amount = total_tax / Decimal("2")
        draft.sgst_amount = total_tax / Decimal("2")
        draft.grand_total = subtotal + total_tax
        recording.status = VoiceRecordingStatus.PROCESSED

        self.repo.create_log(
            AIProcessingLog(
                voice_recording_id=recording.id,
                draft_id=draft.id,
                user_id=user_id,
                transcript=recording.transcript,
                ai_output_json=recording.transcript,
                validated_response_json=json.dumps(extracted, default=str),
                status="draft_created",
            )
        )
        log_event("ai_draft_created", draft_id=draft.id, recording_id=recording.id, new_party=is_new_party, items=len(extracted["items"]))
        self.db.commit()
        self.db.refresh(draft)
        return self.repo.get_draft(draft.id), {"new_party_created": is_new_party}

    def update_draft(self, draft_id, payload):
        draft = self.repo.get_draft(draft_id)
        if not draft:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")

        if payload.template_id is not None:
            draft.template_id = payload.template_id
        if payload.invoice_date is not None:
            draft.invoice_date = payload.invoice_date
        if payload.notes is not None:
            draft.notes = payload.notes

        if payload.items:
            by_item_id = {row.item_id: row for row in draft.items}
            for row in payload.items:
                if row.item_id in by_item_id:
                    target = by_item_id[row.item_id]
                    target.quantity = row.quantity
                    target.rate = row.rate
                    target.discount = row.discount
                    taxable = (row.rate * row.quantity) - row.discount
                    if taxable < 0:
                        taxable = Decimal("0.00")
                    target.tax_amount = (taxable * target.gst_percent / Decimal("100")).quantize(Decimal("0.01"))
                    target.line_total = taxable + target.tax_amount

        subtotal = sum((row.rate * row.quantity) - row.discount for row in draft.items)
        total_tax = sum(row.tax_amount for row in draft.items)
        draft.subtotal = subtotal
        draft.cgst_amount = total_tax / Decimal("2")
        draft.sgst_amount = total_tax / Decimal("2")
        draft.grand_total = subtotal + total_tax + draft.round_off - draft.discount_amount
        draft.status = InvoiceDraftStatus.REVIEWED
        self.repo.create_log(
            AIProcessingLog(
                draft_id=draft.id,
                user_id=None,
                user_changes_json=payload.model_dump_json(),
                status="draft_updated_by_user",
            )
        )
        self.db.commit()
        self.db.refresh(draft)
        return self.repo.get_draft(draft.id)

    def cancel_draft(self, draft_id):
        draft = self.repo.get_draft(draft_id)
        if not draft:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
        draft.status = InvoiceDraftStatus.CANCELLED
        self.repo.create_log(
            AIProcessingLog(
                draft_id=draft.id,
                status="draft_cancelled",
            )
        )
        self.db.commit()
        self.db.refresh(draft)
        return draft

    def _prepare_draft_for_invoice(self, draft: InvoiceDraft) -> None:
        party = self.db.query(Party).filter(Party.id == draft.party_id).first()
        if party and party.status != PartyStatus.ACTIVE:
            party.status = PartyStatus.ACTIVE

        for row in draft.items:
            item = self.db.query(Item).filter(Item.id == row.item_id).first()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item not found for draft line: {row.item_name}",
                )
            if item.status == "pending_review":
                item.status = "active"
            elif item.status != "active":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Item '{item.item_name}' is not active. Update it in inventory first.",
                )
            if item.current_stock < row.quantity:
                item.current_stock = row.quantity
        self.db.flush()

    def confirm_draft_to_invoice(self, draft_id):
        draft = self.repo.get_draft(draft_id)
        if not draft:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
        if draft.status == InvoiceDraftStatus.CONFIRMED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Draft already confirmed")

        self._prepare_draft_for_invoice(draft)

        payload = InvoiceCreate(
            party_id=draft.party_id,
            template_id=draft.template_id,
            invoice_date=draft.invoice_date,
            discount_amount=draft.discount_amount,
            round_off=draft.round_off,
            notes=draft.notes,
            items=[InvoiceItemCreate(item_id=row.item_id, quantity=row.quantity, discount=row.discount) for row in draft.items],
        )
        try:
            final_invoice = InvoiceService(self.db).create_invoice(payload)
            draft.status = InvoiceDraftStatus.CONFIRMED
            draft.final_invoice_id = final_invoice.id
            self.repo.create_log(
                AIProcessingLog(
                    draft_id=draft.id,
                    final_invoice_id=final_invoice.id,
                    status="confirmed_to_final_invoice",
                )
            )
            self.db.commit()
            self.db.refresh(draft)
            log_event("draft_confirmed", draft_id=draft.id, final_invoice_id=final_invoice.id)
            return {"draft_id": draft.id, "final_invoice_id": final_invoice.id, "invoice_number": final_invoice.invoice_number}
        except Exception as exc:
            self.db.rollback()
            log_event("draft_confirm_failed", draft_id=draft.id, error=str(exc))
            raise

    def get_review_context(self, draft_id):
        draft = self.repo.get_draft(draft_id)
        if not draft:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
        latest_log = self.repo.get_latest_log_by_draft(draft_id)
        validated = {}
        if latest_log and latest_log.validated_response_json:
            try:
                validated = json.loads(latest_log.validated_response_json)
            except json.JSONDecodeError:
                validated = {}
        warnings = []
        if validated:
            party_name_conf = validated.get("party", {}).get("name", {}).get("confidence", 0)
            if party_name_conf < 0.7:
                warnings.append("Low confidence party name")
        missing_required = []
        if not draft.party_id:
            missing_required.append("party_id")
        if not draft.items:
            missing_required.append("items")
        return {
            "draft_id": str(draft.id),
            "validated_response": validated,
            "warnings": warnings,
            "missing_required_fields": missing_required,
        }
