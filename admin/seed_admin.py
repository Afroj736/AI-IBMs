"""
Create the first platform admin user (run once).

  cd admin
  pip install -r requirements.txt
  python seed_admin.py

Uses DATABASE_URL from ../backend/.env
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv

backend_root = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_root))
load_dotenv(backend_root / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.models.company import Company  # noqa: F401 — register ORM relationships
from app.models.user import User, UserRole

LEGACY_ADMIN_EMAIL = "admin@smartbill.local"
DEFAULT_EMAIL = os.getenv("ADMIN_EMAIL", "admin@blulabs.in")
DEFAULT_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@12345")
DEFAULT_NAME = os.getenv("ADMIN_NAME", "Platform Admin")


def _migrate_legacy_admin(db) -> None:
    """Rename old seed email (.local TLD is rejected by API EmailStr validation)."""
    if DEFAULT_EMAIL == LEGACY_ADMIN_EMAIL:
        return
    legacy = db.query(User).filter(User.email == LEGACY_ADMIN_EMAIL).first()
    if not legacy:
        return
    conflict = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
    if conflict and conflict.id != legacy.id:
        print(f"Legacy admin {LEGACY_ADMIN_EMAIL} exists but {DEFAULT_EMAIL} is taken.")
        print(f"Sign in with {DEFAULT_EMAIL} or set ADMIN_EMAIL in admin/.env")
        return
    legacy.email = DEFAULT_EMAIL
    legacy.role = UserRole.ADMIN
    legacy.is_active = True
    db.commit()
    print(f"Migrated admin email: {LEGACY_ADMIN_EMAIL} -> {DEFAULT_EMAIL}")


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set in backend/.env")
        sys.exit(1)

    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    _migrate_legacy_admin(db)

    existing = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
    if existing:
        if existing.role != UserRole.ADMIN:
            existing.role = UserRole.ADMIN
            existing.is_active = True
            db.commit()
            print(f"Updated existing user to admin: {DEFAULT_EMAIL}")
        else:
            print(f"Admin already exists: {DEFAULT_EMAIL}")
        return

    user = User(
        id=uuid.uuid4(),
        name=DEFAULT_NAME,
        email=DEFAULT_EMAIL,
        hashed_password=hash_password(DEFAULT_PASSWORD),
        role=UserRole.ADMIN,
        company_id=None,
        is_active=True,
        token_version=1,
    )
    db.add(user)
    db.commit()
    print("Platform admin created.")
    print(f"  Email:    {DEFAULT_EMAIL}")
    print(f"  Password: {DEFAULT_PASSWORD}")
    print("Sign in at the Streamlit admin portal.")


if __name__ == "__main__":
    main()
