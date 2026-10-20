DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_recording_status') THEN
    CREATE TYPE voice_recording_status AS ENUM ('uploaded', 'transcribed', 'processed', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_draft_status') THEN
    CREATE TYPE invoice_draft_status AS ENUM ('draft', 'reviewed', 'confirmed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS voice_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES invoice_templates(id),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INT NOT NULL,
  transcript TEXT,
  status voice_recording_status NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voice_recording_id UUID REFERENCES voice_recordings(id),
  template_id UUID REFERENCES invoice_templates(id),
  party_id UUID NOT NULL REFERENCES parties(id),
  invoice_date DATE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes VARCHAR(500),
  status invoice_draft_status NOT NULL DEFAULT 'draft',
  is_new_party_created BOOLEAN NOT NULL DEFAULT FALSE,
  final_invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_draft_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES invoice_drafts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  item_name VARCHAR(160) NOT NULL,
  quantity INT NOT NULL,
  rate NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_new_item_created BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voice_recording_id UUID REFERENCES voice_recordings(id),
  draft_id UUID REFERENCES invoice_drafts(id),
  user_id UUID REFERENCES users(id),
  transcript TEXT,
  ai_output_json TEXT,
  validated_response_json TEXT,
  user_changes_json TEXT,
  final_invoice_id UUID REFERENCES invoices(id),
  status VARCHAR(32) NOT NULL DEFAULT 'draft_created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
