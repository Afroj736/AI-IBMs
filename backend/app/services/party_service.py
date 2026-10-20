from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.party import Party
from app.repositories.party_repository import PartyRepository
from app.schemas.party import PartyCreate, PartyUpdate


class PartyService:
    GSTIN_CONFLICT_MESSAGE = "A party with this GST number is already available."

    def __init__(self, db: Session):
        self.db = db
        self.repo = PartyRepository(db)

    @staticmethod
    def _normalize_gstin(gstin: str | None) -> str | None:
        if gstin is None:
            return None
        normalized = gstin.strip().upper()
        return normalized or None

    def _ensure_gstin_available(self, gstin: str | None, exclude_party_id=None) -> None:
        normalized = self._normalize_gstin(gstin)
        if not normalized:
            return
        existing = self.repo.get_by_gstin(normalized, exclude_party_id=exclude_party_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=self.GSTIN_CONFLICT_MESSAGE,
            )

    def _generate_party_code(self) -> str:
        count = self.db.query(Party).count() + 1
        return f"PTY-{count:06d}"

    def create_party(self, payload: PartyCreate) -> Party:
        party_code = payload.party_code or self._generate_party_code()
        if self.repo.get_by_code(party_code):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Party code already exists")
        self._ensure_gstin_available(payload.gstin)
        data = payload.model_dump(exclude={"party_code"})
        if data.get("gstin"):
            data["gstin"] = self._normalize_gstin(data["gstin"])
        party = Party(**data, party_code=party_code)
        self.repo.create(party)
        self.db.commit()
        self.db.refresh(party)
        return party

    def update_party(self, party_id, payload: PartyUpdate) -> Party:
        party = self.repo.get_by_id(party_id)
        if not party:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Party not found")
        updates = payload.model_dump(exclude_unset=True)
        if "gstin" in updates:
            self._ensure_gstin_available(updates["gstin"], exclude_party_id=party_id)
            if updates["gstin"]:
                updates["gstin"] = self._normalize_gstin(updates["gstin"])
        for key, value in updates.items():
            setattr(party, key, value)
        self.db.commit()
        self.db.refresh(party)
        return party

    def delete_party(self, party_id):
        party = self.repo.get_by_id(party_id)
        if not party:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Party not found")
        self.repo.delete(party)
        self.db.commit()

    def get_party(self, party_id):
        party = self.repo.get_by_id(party_id)
        if not party:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Party not found")
        return party
