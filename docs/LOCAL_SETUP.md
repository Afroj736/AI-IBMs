# Local Development and Testing Setup

## Prerequisites

- Python 3.13+
- Node.js 20+ and npm
- PostgreSQL 15+ (with `psql` available on PATH)
- Git

## Environment Files

### Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Configure at minimum:
   - `DATABASE_URL`
   - `JWT_SECRET_KEY`
   - `JWT_REFRESH_SECRET_KEY`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`
   - `OPENAI_API_KEY`
   - `CORS_ORIGINS`

Notes:
- `SECRET_KEY` is also supported for backward compatibility.
- Environment loading is handled by `pydantic-settings` from `backend/.env`.

### Frontend

1. Copy `frontend/.env.local.example` to `frontend/.env.local`.
2. Configure:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
   - `NEXT_PUBLIC_APP_NAME=Inventory AI System`

## PostgreSQL Setup

### 1) Install PostgreSQL

- Windows: use official installer and include command-line tools.
- Verify:
  - `psql --version`

### 2) Create Database

```sql
CREATE DATABASE inventory_ai;
```

### 3) Run Migrations + Seed (single flow)

From repository root:

```powershell
cd database
./setup_local.ps1 -DbHost localhost -DbPort 5432 -DbName inventory_ai -DbUser postgres
```

This executes:
- `schema/init.sql`
- `migrations/002_phase2_party_templates_billing.sql`
- `migrations/003_phase3_voice_ai_drafts.sql`
- `seed/seed_local.sql`

### Migration Verification

Target migration files:
- `database/migrations/001_init.sql`
- `database/migrations/002_phase2_party_templates_billing.sql`
- `database/migrations/003_phase3_voice_ai_drafts.sql`

On clean DB, run scripts in this order:
1. `schema/init.sql` (or `migrations/001_init.sql`)
2. `migrations/002_phase2_party_templates_billing.sql`
3. `migrations/003_phase3_voice_ai_drafts.sql`

## Backend Setup and Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Startup Validation

Backend logs a structured startup event including:
- application environment
- route count
- database connectivity status

### Swagger

- [http://localhost:8000/docs](http://localhost:8000/docs)

### Health Endpoint

- [http://localhost:8000/health](http://localhost:8000/health)
- Returns:
  - `application_status`
  - `database_status`
  - `version`
  - `timestamp`

## Frontend Setup and Run

```powershell
cd frontend
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Home page shows backend/DB status indicator using `/health`.

## Seed Test Data

Seed file: `database/seed/seed_local.sql`

Includes sample data for:
- roles (enum-based via users)
- admin user (`admin@local.test`)
- categories and brands (seeded through item fields)
- items:
  - Samsung Galaxy S25 Ultra
  - Apple AirPods Pro
  - Dell Latitude 5450
- party:
  - Raj Electronics
- template:
  - Retail GST Invoice

## API Test Collection

Postman collection:
- `docs/postman_collection.json`

Covers:
- Authentication
- Inventory
- Parties
- Templates
- Invoices
- Voice + Draft APIs

## End-to-End Testing Checklist

### Authentication
- Register
- Login
- Logout (client-side token clear)
- Token refresh flow

### Inventory
- Create item
- Update item
- Delete item
- Search item
- Stock adjustment endpoint

### Party Management
- Create party
- Update party
- Delete party
- Search/filter party

### Billing
- Create invoice
- View invoice
- Verify GST split in totals
- Verify stock reduction
- Verify auto invoice number

### Templates
- Create template
- Edit template
- Activate template
- Preview template

### Voice Entry
- Upload audio
- Transcript generation
- Draft creation
- Draft review
- Draft confirmation
- Final invoice generation

## Validation Commands

### Backend compilation

```powershell
python -m compileall backend/app
```

### Backend tests

```powershell
pytest backend/app/tests -q
```

### Frontend build

```powershell
cd frontend
npm run build
```

## Troubleshooting

- **`Invalid token`**
  - Ensure `JWT_SECRET_KEY`/`JWT_REFRESH_SECRET_KEY` are set consistently.
- **CORS errors**
  - Add frontend origin to `CORS_ORIGINS`.
- **DB connection failed**
  - Validate `DATABASE_URL`, Postgres service, and credentials.
- **`pytest` not found**
  - Activate backend venv and run `pip install -r requirements.txt`.
- **Whisper/OpenAI errors**
  - Verify `OPENAI_API_KEY`, model names, and outbound network access.

## Final Validation Report Template

### Working Features
- [ ] Backend starts
- [ ] Frontend starts
- [ ] Migrations run from clean DB
- [ ] Seed execution succeeds
- [ ] Swagger available
- [ ] Health endpoint reports DB up
- [ ] Core module smoke tests pass

### Pending Features
- Fill after local run.

### Known Limitations
- OpenAI-dependent flows require valid API key and internet access.
- In-memory upload rate limiter resets on backend restart.

### Mocked Integrations
- None in local setup path (real OpenAI keys required for live transcription/extraction).

### Production Readiness Status
- Local development readiness: **Configured**
- Production readiness: **Needs deployment hardening (managed secrets, distributed rate-limit, monitoring stack)**
