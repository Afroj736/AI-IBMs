-- Repeatable local seed data
-- Run after migrations on a clean or existing dev DB.

-- Roles are enum-based (`user_role`) in schema; no separate role table.
-- Prefer platform admin from admin/seed_admin.py (admin@blulabs.in / Admin@12345).
-- `.test` / `.local` emails are rejected by API EmailStr validation on login.
INSERT INTO users (name, email, hashed_password, role)
VALUES (
  'Local Admin',
  'admin@blulabs.in',
  '$2b$12$n5FBC.U8vpJVQxijlyYh7uBejrwk6jM2ms32DWzfW5z4Xu4fM4OB6',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO items (
  item_name, item_code, sku, barcode, category, sub_category, brand, model_number,
  serial_number_required, hsn_code, gst_percentage, purchase_price, selling_price,
  minimum_stock, current_stock, description, status
)
VALUES
(
  'Samsung Galaxy S25 Ultra', 'ITM-SAMSUNG-S25U', 'SKU-SAMSUNG-S25U', '8901000000001',
  'Mobile Phones', 'Flagship', 'Samsung', 'S25 Ultra', FALSE, '85171200', 18.00,
  98000.00, 105000.00, 5, 25, 'Seed item - Samsung flagship phone', 'active'
),
(
  'Apple AirPods Pro', 'ITM-APPLE-AIRPODSPRO', 'SKU-APPLE-AIRPODSPRO', '8901000000002',
  'Audio', 'Earbuds', 'Apple', 'AirPods Pro', FALSE, '85183000', 18.00,
  18000.00, 22000.00, 10, 40, 'Seed item - Apple earbuds', 'active'
),
(
  'Dell Latitude 5450', 'ITM-DELL-LAT5450', 'SKU-DELL-LAT5450', '8901000000003',
  'Laptops', 'Business', 'Dell', 'Latitude 5450', TRUE, '84713010', 18.00,
  62000.00, 75000.00, 3, 15, 'Seed item - Dell business laptop', 'active'
)
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO parties (
  party_code, party_type, name, business_name, gstin, pan_number, mobile, alternate_mobile, email,
  billing_address, shipping_address, city, state, country, pincode, credit_limit, opening_balance, notes, status
)
VALUES
(
  'PTY-RAJ-0001', 'customer', 'Raj Electronics', 'Raj Electronics',
  '06ABCDE1234F1Z5', 'ABCDE1234F', '9876543210', NULL, 'raj@electronics.test',
  'Shop 21, Main Market', 'Shop 21, Main Market', 'Gurugram', 'Haryana', 'India', '122001',
  500000.00, 0.00, 'Seed customer party', 'active'
)
ON CONFLICT (party_code) DO NOTHING;

INSERT INTO invoice_templates (
  template_name, template_type, header_logo, company_name, company_address, gstin,
  contact_number, email, show_qr, show_barcode, show_signature, footer_text,
  terms_conditions, template_json, status
)
VALUES
(
  'GST Tax Invoice', 'tax_invoice', NULL, 'Your Business Name',
  'Business Address, City, State, Pin Code', NULL, NULL, NULL,
  TRUE, FALSE, TRUE, 'Thank You For Your Business With Us!',
  'Subject to local jurisdiction.' || E'\n' || 'Interest applicable if delayed payment.' || E'\n' || 'Goods once sold will not be taken back.',
  '{"layout":"gst_tax_invoice_v1","invoice_prefix":"G","invoice_number_format":"{prefix}{number}","title":"TAX INVOICE","copy_label":"ORIGINAL RECIPIENT FOR TAX PAYMENT","show_billing_address":true,"show_shipping_address":true,"show_customer_gst":true,"show_amount_in_words":true,"show_bank_details":true,"show_qr_section":true,"show_declaration":true,"footer_message":"Thank You For Your Business With Us!"}'::jsonb,
  'active'
),
(
  'Retail GST Invoice', 'retail_gst_invoice', NULL, 'Your Business Name',
  'Business Address, City, State, Pin Code', NULL, NULL, NULL,
  TRUE, FALSE, TRUE, 'Thank You For Your Business With Us!',
  'Subject to local jurisdiction.' || E'\n' || 'Interest applicable if delayed payment.' || E'\n' || 'Goods once sold will not be taken back.',
  '{"layout":"retail_gst_invoice_v1","invoice_prefix":"R","invoice_number_format":"{prefix}{number}","title":"TAX INVOICE","copy_label":"ORIGINAL RECIPIENT FOR TAX PAYMENT","show_billing_address":true,"show_shipping_address":true,"show_customer_gst":true,"show_amount_in_words":true,"show_bank_details":true,"show_qr_section":true,"show_declaration":true,"footer_message":"Thank You For Your Business With Us!"}'::jsonb,
  'inactive'
)
ON CONFLICT (template_name) DO UPDATE SET
  template_type = EXCLUDED.template_type,
  company_name = EXCLUDED.company_name,
  company_address = EXCLUDED.company_address,
  show_qr = EXCLUDED.show_qr,
  show_barcode = EXCLUDED.show_barcode,
  show_signature = EXCLUDED.show_signature,
  footer_text = EXCLUDED.footer_text,
  terms_conditions = EXCLUDED.terms_conditions,
  template_json = EXCLUDED.template_json,
  status = EXCLUDED.status,
  updated_at = NOW();
