from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.config.settings import settings
from app.core.logger import log_event
from app.database.session import engine

APP_VERSION = "1.0.0"
app = FastAPI(title=settings.app_name, version=APP_VERSION)

print("CORS_ORIGINS =", settings.cors_origins)
print("CORS_ORIGINS_LIST =", settings.cors_origins_list)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.on_event("startup")
def startup_validation():
    db_status = "down"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "up"
    except Exception as exc:
        log_event("startup_validation_failed", error=str(exc))
    log_event(
        "startup_validation",
        app_name=settings.app_name,
        app_env=settings.app_env,
        db_status=db_status,
        route_count=len(app.routes),
        openai_skip_extraction=settings.openai_skip_extraction,
    )


@app.get("/health")
def health():
    db_status = "down"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "up"
    except Exception:
        db_status = "down"
    return {
        "application_status": "ok",
        "database_status": db_status,
        "version": APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
