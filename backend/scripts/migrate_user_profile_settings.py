"""Add users.profile_settings JSONB column. Run once: python scripts/migrate_user_profile_settings.py"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

backend_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_root))
load_dotenv(backend_root / ".env")


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL missing")
        return 1
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS profile_settings JSONB DEFAULT '{}'::jsonb
                """
            )
        )
    print("users.profile_settings column ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
