import sys
from pathlib import Path

from sqlalchemy import text

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.database.session import engine


def main():
    route_paths = sorted({route.path for route in app.routes})
    db_status = "down"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "up"
    except Exception:
        db_status = "down"

    print("=== Startup Validation ===")
    print(f"Route count: {len(route_paths)}")
    print(f"Database status: {db_status}")
    print("Routes:")
    for path in route_paths:
        print(f" - {path}")


if __name__ == "__main__":
    main()
