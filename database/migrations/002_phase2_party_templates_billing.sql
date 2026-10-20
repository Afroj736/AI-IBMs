DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_type') THEN
    CREATE TYPE party_type AS ENUM ('customer', 'supplier', 'both');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_status') THEN
    CREATE TYPE party_status AS ENUM ('active', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_type') THEN
    CREATE TYPE template_type AS ENUM (
      'retail_gst_invoice',
      'tax_invoice',
      'purchase_invoice',
      'mobile_store_invoice',
      'electronics_store_invoice'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_status') THEN
    CREATE TYPE template_status AS ENUM ('active', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_code VARCHAR(50) NOT NULL UNIQUE,
  party_type party_type NOT NULL,
  name VARCHAR(160) NOT NULL,
  business_name VARCHAR(160),
  gstin VARCHAR(30),
  pan_number VARCHAR(20),
  mobile VARCHAR(20) NOT NULL,
  alternate_mobile VARCHAR(20),
  email VARCHAR(255),
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(120),
  state VARCHAR(120),
  country VARCHAR(120),
  pincode VARCHAR(20),
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status party_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name VARCHAR(120) NOT NULL UNIQUE,
  template_type template_type NOT NULL,
  header_logo VARCHAR(255),
  company_name VARCHAR(160) NOT NULL,
  company_address TEXT,
  gstin VARCHAR(30),
  contact_number VARCHAR(20),
  email VARCHAR(255),
  show_qr BOOLEAN NOT NULL DEFAULT FALSE,
  show_barcode BOOLEAN NOT NULL DEFAULT FALSE,
  show_signature BOOLEAN NOT NULL DEFAULT FALSE,
  footer_text TEXT,
  terms_conditions TEXT,
  template_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status template_status NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  party_id UUID NOT NULL REFERENCES parties(id),
  template_id UUID REFERENCES invoice_templates(id),
  invoice_date DATE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  notes VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  item_name VARCHAR(160) NOT NULL,
  quantity INT NOT NULL,
  rate NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
