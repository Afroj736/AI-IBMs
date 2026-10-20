export type CompanySettingsTab =
  | "business"
  | "tax"
  | "banking"
  | "invoice"
  | "billing"
  | "communication";

export interface CompanyAddressSettings {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface CompanySettingsPayload {
  business_type: string;
  financial_year: string;
  website: string;
  description: string;
  address: CompanyAddressSettings;
  logo_data_url: string | null;
  signature_data_url: string | null;
  gstin: string;
  pan: string;
  default_gst_percent: string;
  state_code: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  upi_id: string;
  qr_data_url: string | null;
  invoice_prefix: string;
  invoice_start_number: number;
  invoice_counters: Record<string, number>;
  enable_discount: boolean;
  auto_round_off: boolean;
  item_wise_gst: boolean;
  auto_calculation: boolean;
  show_logo: boolean;
  show_signature: boolean;
  show_bank_details: boolean;
  show_footer_qr: boolean;
  whatsapp_connected: boolean;
  whatsapp_number: string;
  sender_email: string;
}

export interface CompanySettingsResponse {
  id: string;
  business_name: string;
  owner_name: string;
  mobile: string | null;
  email: string;
  gst_number: string | null;
  address: string | null;
  settings: CompanySettingsPayload;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettingsPayload = {
  business_type: "Private Limited Company",
  financial_year: "2024 - 2025",
  website: "",
  description: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "India",
    pincode: ""
  },
  logo_data_url: null,
  signature_data_url: null,
  gstin: "",
  pan: "",
  default_gst_percent: "18%",
  state_code: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
  upi_id: "",
  qr_data_url: null,
  invoice_prefix: "RET",
  invoice_start_number: 1001,
  invoice_counters: { RET: 1001, GST: 500, PUR: 200, AI: 1 },
  enable_discount: true,
  auto_round_off: true,
  item_wise_gst: false,
  auto_calculation: true,
  show_logo: true,
  show_signature: false,
  show_bank_details: true,
  show_footer_qr: true,
  whatsapp_connected: false,
  whatsapp_number: "",
  sender_email: ""
};
