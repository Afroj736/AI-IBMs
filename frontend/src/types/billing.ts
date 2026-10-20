export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type InvoiceType = "gst" | "retail";

export type InvoiceFilterTab = "all" | InvoiceStatus;

export interface BusinessInfo {
  id: string;
  name: string;
  logo_url?: string | null;
  gst_number: string;
  phone: string;
  email: string;
  address: string;
  signature_url?: string | null;
  seal_url?: string | null;
}

export interface PartyAddress {
  name: string;
  gst_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address: string;
}

export interface BillingLineItem {
  id: string;
  item_name: string;
  hsn_sac: string;
  serial_no?: string | null;
  imei?: string | null;
  barcode?: string | null;
  batch?: string | null;
  warranty?: string | null;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  amount: number;
}

export interface BillingTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  discount: number;
  round_off: number;
  grand_total: number;
  received_amount: number;
  balance_amount: number;
  amount_in_words: string;
}

export interface BillingInvoice {
  id: string;
  invoice_number: string;
  invoice_type?: InvoiceType;
  is_sample?: boolean;
  status: InvoiceStatus;
  customer_name: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  place_of_supply: string;
  amount: number;
  bill_to: PartyAddress;
  ship_to: PartyAddress;
  line_items: BillingLineItem[];
  totals: BillingTotals;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceDraftExtraction {
  customer: string;
  items: Array<{
    name: string;
    serial_numbers?: string[];
    quantity: number;
    rate: number;
  }>;
  transcript: string;
}

export interface VoiceDraft {
  id: string;
  title: string;
  created_at: string;
  extraction?: VoiceDraftExtraction;
}

export interface CreateInvoicePayload {
  customer_id?: string;
  customer_name: string;
  line_items: Omit<BillingLineItem, "id">[];
  notes?: string;
  status?: InvoiceStatus;
}

export interface InvoiceListParams {
  search?: string;
  status?: InvoiceFilterTab;
}
