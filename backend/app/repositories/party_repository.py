from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.party import Party, PartyType


class PartyRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, party: Party) -> Party:
        self.db.add(party)
        self.db.flush()
        return party

    def get_by_id(self, party_id):
        return self.db.query(Party).filter(Party.id == party_id).first()

    def get_by_code(self, party_code: str):
        return self.db.query(Party).filter(Party.party_code == party_code).first()

    def get_by_gstin(self, gstin: str, exclude_party_id: UUID | None = None) -> Party | None:
        normalized = gstin.strip().upper()
        if not normalized:
            return None
        query = self.db.query(Party).filter(
            Party.gstin.isnot(None),
            func.upper(func.trim(Party.gstin)) == normalized,
        )
        if exclude_party_id is not None:
            query = query.filter(Party.id != exclude_party_id)
        return query.first()

    def list(self, search: str | None = None, party_type: PartyType | None = None):
        query = self.db.query(Party)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(Party.party_code.ilike(like), Party.name.ilike(like), Party.mobile.ilike(like)))
        if party_type:
            query = query.filter(Party.party_type == party_type)
        return query.order_by(Party.created_at.desc()).all()

    def delete(self, party: Party):
        self.db.delete(party)
