# Inventory AI System

Production-oriented starter for:
- AI-powered inventory management
- Purchase invoice management
- Retail + GST billing
- Voice-based item entry

## Monorepo Structure

- `frontend/` - Next.js 15 + TypeScript + Tailwind + Shadcn-ready UI
- `backend/` - FastAPI + SQLAlchemy + Alembic + JWT + OpenAI/Whisper integration points
- `database/` - SQL schema, seed scripts, migrations, ER docs
- `docs/` - API and architecture documentation

## Quick Start

### Backend

1. Create Python 3.13 virtual environment.
2. Install dependencies from `backend/requirements.txt`.
3. Copy `backend/.env.example` to `.env` and set values.
4. Run:
   - `uvicorn app.main:app --reload --port 8000`

### Frontend

1. Install dependencies in `frontend/`.
2. Run:
   - `npm run dev`

## Business Rule Guardrail

AI item entry and AI billing suggestions are restricted:
- AI can only create bill lines for items already present in inventory.
- AI can only auto-add missing items by creating draft records (status: inactive/pending review).
- Manual edit/update remains user-controlled from UI.
