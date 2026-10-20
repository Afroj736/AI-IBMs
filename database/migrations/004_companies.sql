-- Companies table and user.company_id (SmartBill registration)

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(160) NOT NULL,
  owner_name VARCHAR(120) NOT NULL,
  mobile VARCHAR(15),
  email VARCHAR(255) NOT NULL,
  gst_number VARCHAR(15),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
