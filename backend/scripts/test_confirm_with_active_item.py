"""Confirm voice draft after activating AI-created items."""
from __future__ import annotations

import os
import sys
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
from app.models.item import Item
from app.models.party import Party  # noqa: F401
from app.models.user import User  # noqa: F401

DRAFT_ID = "8301fee5-f7bc-4a48-abe3-a07a70f85222"


def main() -> int:
    engine = create_engine(os.environ["DATABASE_URL"])
    Session = sessionmaker(bind=engine)
    db = Session()

    draft = AIBillService(db).repo.get_draft(DRAFT_ID)
    if not draft:
        print("Draft not found:", DRAFT_ID)
        return 1

    for row in draft.items:
        item = db.get(Item, row.item_id)
        if item:
            item.status = "active"
            if item.current_stock < row.quantity:
                item.current_stock = row.quantity + 10
            print("activated:", item.item_name, "stock=", item.current_stock)

    party = db.get(Party, draft.party_id)
    if party and party.status != "active":
        party.status = "active"
        print("activated party:", party.name)

    db.commit()

    result = AIBillService(db).confirm_draft_to_invoice(draft.id)
    print("SUCCESS:", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
