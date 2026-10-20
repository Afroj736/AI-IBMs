from sqlalchemy.orm import Session

from app.models.item import Item


def can_ai_bill_item(db: Session, item_code: str, quantity: int) -> tuple[bool, str]:
    item = db.query(Item).filter(Item.item_code == item_code, Item.status == "active").first()
    if not item:
        return False, "Item not present in inventory."
    if item.current_stock < quantity:
        return False, "Insufficient stock for requested quantity."
    return True, "Allowed"


def ai_add_missing_item_as_draft(db: Session, item_code: str, item_name: str) -> Item:
    existing = db.query(Item).filter(Item.item_code == item_code).first()
    if existing:
        return existing

    item = Item(
        item_name=item_name,
        item_code=item_code,
        sku=f"DRAFT-{item_code}",
        gst_percentage=0,
        purchase_price=0,
        selling_price=0,
        minimum_stock=0,
        current_stock=0,
        status="pending_review",
        description="AI generated draft item. Requires manual review.",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
