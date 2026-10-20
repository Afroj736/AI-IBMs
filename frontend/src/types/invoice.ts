export type PaymentStatus = "pending" | "paid" | "partial" | "cancelled";

export interface InvoiceItemInput {
  item_id: string;
  quantity: number;
  discount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  party_id: string;
  template_id?: string | null;
  invoice_date: string;
  subtotal: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  grand_total: number;
  received_amount: number;
  payment_status: PaymentStatus;
  notes?: string | null;
  created_at: string;
  items: Array<{
    id: string;
    item_id: string;
    item_name: string;
    quantity: number;
    rate: number;
    discount: number;
    gst_percent: number;
    tax_amount: number;
    line_total: number;
  }>;
}
