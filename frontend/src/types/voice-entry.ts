export interface VoiceDraftItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  rate: number;
  discount: number;
  gst_percent: number;
  tax_amount: number;
  line_total: number;
  is_new_item_created: boolean;
}

export interface VoiceDraft {
  id: string;
  template_id?: string | null;
  party_id: string;
  invoice_date: string;
  subtotal: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  grand_total: number;
  notes?: string | null;
  status: "draft" | "reviewed" | "confirmed" | "cancelled";
  is_new_party_created: boolean;
  final_invoice_id?: string | null;
  created_at: string;
  updated_at: string;
  items: VoiceDraftItem[];
}
