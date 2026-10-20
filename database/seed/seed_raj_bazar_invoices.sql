-- Sample invoices for Raj bazar (PTY-000011)
-- Party: dade8d95-26f9-4983-a79e-ef6d08070e0a

DO $$
DECLARE
  v_party_id UUID := 'dade8d95-26f9-4983-a79e-ef6d08070e0a';
  v_inv_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM parties WHERE id = v_party_id) THEN
    RAISE EXCEPTION 'Party Raj bazar (PTY-000011) not found';
  END IF;

  -- INV-000004 — Paid, recent accessories order
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-000004') THEN
    v_inv_id := uuid_generate_v4();
    INSERT INTO invoices (
      id, invoice_number, party_id, invoice_date,
      subtotal, cgst_amount, sgst_amount, igst_amount, grand_total,
      payment_status, notes, created_at
    ) VALUES (
      v_inv_id, 'INV-000004', v_party_id, CURRENT_DATE - 2,
      110000.00, 9900.00, 9900.00, 0, 129800.00,
      'paid', 'Wholesale electronics order - Raj Bazar', NOW() - INTERVAL '2 days'
    );
    INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, rate, discount, gst_percent, tax_amount, line_total)
    VALUES (
      v_inv_id, 'bd88ebfe-c8ab-49d9-91a0-85845a935c67', 'Apple AirPods Pro', 5, 22000.00, 0, 18.00, 19800.00, 129800.00
    );
  END IF;

  -- INV-000005 — Pending, monthly supply
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-000005') THEN
    v_inv_id := uuid_generate_v4();
    INSERT INTO invoices (
      id, invoice_number, party_id, invoice_date,
      subtotal, cgst_amount, sgst_amount, igst_amount, grand_total,
      payment_status, notes, created_at
    ) VALUES (
      v_inv_id, 'INV-000005', v_party_id, CURRENT_DATE - 15,
      220000.00, 19800.00, 19800.00, 0, 259600.00,
      'pending', 'Monthly supply - accessories', NOW() - INTERVAL '15 days'
    );
    INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, rate, discount, gst_percent, tax_amount, line_total)
    VALUES (
      v_inv_id, 'bd88ebfe-c8ab-49d9-91a0-85845a935c67', 'Apple AirPods Pro', 10, 22000.00, 0, 18.00, 39600.00, 259600.00
    );
  END IF;

  -- INV-000006 — Partial payment, laptop procurement
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-000006') THEN
    v_inv_id := uuid_generate_v4();
    INSERT INTO invoices (
      id, invoice_number, party_id, invoice_date,
      subtotal, cgst_amount, sgst_amount, igst_amount, grand_total,
      payment_status, notes, created_at
    ) VALUES (
      v_inv_id, 'INV-000006', v_party_id, CURRENT_DATE - 45,
      150000.00, 13500.00, 13500.00, 0, 177000.00,
      'partial', 'Laptop procurement for retail counter', NOW() - INTERVAL '45 days'
    );
    INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, rate, discount, gst_percent, tax_amount, line_total)
    VALUES (
      v_inv_id, '081b87cc-2ae0-4daf-a9ae-b7f615acb359', 'Dell Latitude 5450', 2, 75000.00, 0, 18.00, 27000.00, 177000.00
    );
  END IF;

  -- INV-000007 — Paid, bulk smartphone purchase
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-000007') THEN
    v_inv_id := uuid_generate_v4();
    INSERT INTO invoices (
      id, invoice_number, party_id, invoice_date,
      subtotal, cgst_amount, sgst_amount, igst_amount, grand_total,
      payment_status, notes, created_at
    ) VALUES (
      v_inv_id, 'INV-000007', v_party_id, CURRENT_DATE - 90,
      359000.00, 32310.00, 32310.00, 0, 423620.00,
      'paid', 'Bulk smartphone & accessory purchase', NOW() - INTERVAL '90 days'
    );
    INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, rate, discount, gst_percent, tax_amount, line_total)
    VALUES
      (v_inv_id, 'b2e3de41-ffae-4349-85fb-1bd6eab84b9b', 'Samsung Galaxy S25 Ultra', 3, 105000.00, 0, 18.00, 56700.00, 371700.00),
      (v_inv_id, 'bd88ebfe-c8ab-49d9-91a0-85845a935c67', 'Apple AirPods Pro', 2, 22000.00, 0, 18.00, 7920.00, 51920.00);
  END IF;
END $$;
