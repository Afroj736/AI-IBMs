# SmartBill AI — Admin Portal

Streamlit UI for **platform admins** (`role = admin`).

## Features (scaffold)

- Dashboard: user/company/invoice counts, users by role
- **Users**: list, filter by role/status/search, force logout, disable, change role
- **Bills**: list invoices with creator name, role, email (when recorded)

## Setup

### 1. Apply database migration

From project root (with backend venv):

```powershell
cd backend
.\.venv\Scripts\python -c "from pathlib import Path; from sqlalchemy import create_engine, text; import os; from dotenv import load_dotenv; load_dotenv(); engine=create_engine(os.environ['DATABASE_URL']); engine.begin().execute(text(Path('../database/migrations/006_admin_portal.sql').read_text()))"
```

### 2. Create platform admin

```powershell
cd admin
pip install -r requirements.txt
copy .env.example .env
python seed_admin.py
```

### 3. Run API (if not running)

```powershell
cd ..\backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### 4. Run admin portal

```powershell
cd admin
streamlit run app.py
```

Open http://localhost:8501 and sign in with the admin email/password.

## Admin API (`/api/v1/admin/*`)

Requires JWT from `/auth/login` with **admin** role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | Stats |
| GET | `/admin/users` | List users (filters: `role`, `search`, `is_active`) |
| GET | `/admin/users/{id}` | User detail |
| PATCH | `/admin/users/{id}` | Update role / active |
| POST | `/admin/users/{id}/force-logout` | Revoke all sessions |
| POST | `/admin/users/{id}/disable` | Disable + logout |
| GET | `/admin/bills` | List bills (filters: `role`, `user_id`, `search`) |

## Future

- Owner invites staff (not admin portal)
- Full audit log per role
- Tenant-scoped admin vs platform admin

See `docs/RBAC_ROADMAP.md`.
