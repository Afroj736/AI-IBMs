export type TemplateType =
  | "retail_gst_invoice"
  | "tax_invoice"
  | "purchase_invoice"
  | "mobile_store_invoice"
  | "electronics_store_invoice";

export type TemplateStatus = "active" | "inactive";

export interface InvoiceTemplate {
  id: string;
  template_name: string;
  template_type: TemplateType;
  header_logo?: string | null;
  company_name: string;
  company_address?: string | null;
  gstin?: string | null;
  contact_number?: string | null;
  email?: string | null;
  show_qr: boolean;
  show_barcode: boolean;
  show_signature: boolean;
  footer_text?: string | null;
  terms_conditions?: string | null;
  template_json: Record<string, unknown>;
  status: TemplateStatus;
  created_at: string;
  updated_at: string;
}
