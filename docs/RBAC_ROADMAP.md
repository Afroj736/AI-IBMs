# SmartBill AI — RBAC roadmap

## Roles (current + planned)

| Role | Purpose |
|------|---------|
| **admin** | Platform super-admin. Sees all tenants/users, add/remove users, audit all role activity. (Future UI.) |
| **owner** | Default on **public register**. Created the company; can invite/manage staff for that company. (Future UI.) |
| **manager** | Company staff — operations leadership. (Future: invited by owner.) |
| **accountant** | Company staff — finance/ledger. |
| **sales_staff** | Company staff — sales/billing. |
| **store_operator** | Company staff — counter/retail operations. |

## Implemented now

- `owner` enum value in PostgreSQL and `UserRole.OWNER` in backend.
- `POST /api/v1/auth/register` defaults to **`owner`** (not `store_operator`).
- Owner included in API `require_roles(...)` alongside admin/manager where company operations need it.
- Frontend shows role from `/auth/me` (e.g. **Owner**).

## Admin portal (scaffold)

- Folder: `admin/` — Streamlit app
- API: `/api/v1/admin/*` — platform `admin` role only
- Force logout: bumps `users.token_version` (invalidates JWTs)
- Bills: `invoices.created_by_user_id` tracks creator when set from API

## Future (do not break register → owner)

1. **Admin console** (extend): audit log, add user, richer filters.
2. **Owner staff management**: owner invites users with role `manager` | `accountant` | `sales_staff` | `store_operator`.
3. **Tenant-scoped RBAC**: permissions filtered by `company_id`, not global role only.
4. **Activity by role**: admin dashboard for manager/accountant/sales/operator actions.

## Rules for new code

- Public register → always `owner` + new `company` row.
- Do not assign `admin` on public register.
- Platform `admin` is seeded or assigned manually only.
