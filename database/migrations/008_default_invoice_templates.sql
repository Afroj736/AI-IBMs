-- Replace demo/sample templates with two ready-to-use GST and Retail layouts

DELETE FROM invoice_templates
WHERE template_name IN (
  'Retail GST Invoice',
  'GST Tax Invoice',
  'GST Professional',
  'Retail Basic',
  'Standard Purchase',
  'Creative Agency'
)
OR template_name LIKE 'Tmpl %';

INSERT INTO invoice_templates (
  template_name,
  template_type,
  header_logo,
  company_name,
  company_address,
  gstin,
  contact_number,
  email,
  show_qr,
  show_barcode,
  show_signature,
  footer_text,
  terms_conditions,
  template_json,
  status
)
VALUES
(
  'GST Tax Invoice',
  'tax_invoice',
  NULL,
  'Your Business Name',
  'Business Address, City, State, Pin Code',
  NULL,
  NULL,
  NULL,
  TRUE,
  FALSE,
  TRUE,
  'Thank You For Your Business With Us!',
  'Subject to local jurisdiction.' || E'\n' || 'Interest applicable if delayed payment.' || E'\n' || 'Goods once sold will not be taken back.',
  jsonb_build_object(
    'layout', 'gst_tax_invoice_v1',
    'invoice_prefix', 'G',
    'invoice_number_format', '{prefix}{number}',
    'title', 'TAX INVOICE',
    'copy_label', 'ORIGINAL RECIPIENT FOR TAX PAYMENT',
    'show_billing_address', true,
    'show_shipping_address', true,
    'show_customer_gst', true,
    'show_customer_state', true,
    'show_customer_pincode', true,
    'line_columns', jsonb_build_array('sr', 'description', 'hsn', 'rate', 'quantity', 'taxable', 'gst', 'total'),
    'totals', jsonb_build_array('sub_total', 'cgst', 'sgst', 'freight', 'discount', 'grand_total', 'received_amount', 'balance_amount'),
    'show_amount_in_words', true,
    'show_bank_details', true,
    'show_qr_section', true,
    'show_declaration', true,
    'declaration_label', 'Declaration',
    'signature_label', 'Authorized Signatory',
    'footer_message', 'Thank You For Your Business With Us!'
  ),
  'active'
),
(
  'Retail GST Invoice',
  'retail_gst_invoice',
  NULL,
  'Your Business Name',
  'Business Address, City, State, Pin Code',
  NULL,
  NULL,
  NULL,
  TRUE,
  FALSE,
  TRUE,
  'Thank You For Your Business With Us!',
  'Subject to local jurisdiction.' || E'\n' || 'Interest applicable if delayed payment.' || E'\n' || 'Goods once sold will not be taken back.',
  jsonb_build_object(
    'layout', 'retail_gst_invoice_v1',
    'invoice_prefix', 'R',
    'invoice_number_format', '{prefix}{number}',
    'title', 'TAX INVOICE',
    'copy_label', 'ORIGINAL RECIPIENT FOR TAX PAYMENT',
    'show_billing_address', true,
    'show_shipping_address', true,
    'show_customer_gst', true,
    'show_customer_state', true,
    'show_customer_pincode', true,
    'line_columns', jsonb_build_array('sr', 'description', 'hsn', 'rate', 'quantity', 'taxable', 'gst', 'total'),
    'totals', jsonb_build_array('sub_total', 'cgst', 'sgst', 'freight', 'discount', 'grand_total', 'received_amount', 'balance_amount'),
    'show_amount_in_words', true,
    'show_bank_details', true,
    'show_qr_section', true,
    'show_declaration', true,
    'declaration_label', 'Declaration',
    'signature_label', 'Authorized Signatory',
    'footer_message', 'Thank You For Your Business With Us!'
  ),
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
