import type { TemplateType } from "@/types/invoice-template";

export type ThemePreset = "minimal" | "dark_executive" | "creative";

export type ColumnToggle = {
  id: string;
  label: string;
  enabled: boolean;
  required?: boolean;
};

function baseLayout(invoicePrefix: string, layout: string) {
  return {
    layout,
    invoice_prefix: invoicePrefix,
    invoice_number_format: "{prefix}{number}",
    title: "TAX INVOICE",
    copy_label: "ORIGINAL RECIPIENT FOR TAX PAYMENT",
    description: "",
    theme: {
      preset: "minimal" as ThemePreset,
      primary_color: "#000000",
      secondary_color: "#712AE2",
      accent_color: "#4CD7F6",
      font_family: "Geist"
    },
    sections: {
      company_logo: true,
      client_address: true,
      serial_number: true,
      item_rate: true,
      tax_amount: true,
      hsn_sac: true,
      gst_summary: true,
      subtotal: true,
      round_off: true,
      received_amount: false,
      balance_due: true
    },
    line_columns: [
      { id: "sr", label: "Serial Number", enabled: true, required: true },
      { id: "description", label: "Item Name", enabled: true, required: true },
      { id: "hsn", label: "HSN/SAC", enabled: true },
      { id: "rate", label: "Rate", enabled: true, required: true },
      { id: "quantity", label: "Quantity", enabled: true, required: true },
      { id: "taxable", label: "Taxable", enabled: true },
      { id: "gst", label: "GST %", enabled: true },
      { id: "total", label: "Line Total", enabled: true, required: true }
    ] as ColumnToggle[],
    show_billing_address: true,
    show_shipping_address: true,
    show_customer_gst: true,
    show_customer_state: true,
    show_customer_pincode: true,
    totals: [
      "sub_total",
      "cgst",
      "sgst",
      "freight",
      "discount",
      "grand_total",
      "received_amount",
      "balance_amount"
    ],
    show_amount_in_words: true,
    show_bank_details: true,
    bank_details: "",
    show_qr_section: true,
    show_declaration: true,
    declaration_label: "Declaration",
    signature_label: "Authorized Signatory",
    footer_message: "Thank You For Your Business With Us!"
  };
}

const DEFAULT_TERMS =
  "Subject to local jurisdiction.\nInterest applicable if delayed payment.\nGoods once sold will not be taken back.";

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  tax_invoice: "GST Tax Invoice",
  retail_gst_invoice: "Retail GST Invoice",
  purchase_invoice: "Purchase Invoice",
  mobile_store_invoice: "Mobile Store Invoice",
  electronics_store_invoice: "Electronics Store Invoice"
};

export function getDefaultTemplateValues(type: TemplateType) {
  if (type === "tax_invoice") {
    return {
      template_name: "GST Tax Invoice",
      template_type: type,
      company_name: "Your Business Name",
      company_address: "Business Address, City, State, Pin Code",
      gstin: "",
      contact_number: "",
      email: "",
      show_qr: true,
      show_barcode: false,
      show_signature: true,
      footer_text: "Thank You For Your Business With Us!",
      terms_conditions: DEFAULT_TERMS,
      template_json: baseLayout("G", "gst_tax_invoice_v1"),
      status: "inactive" as const
    };
  }

  if (type === "retail_gst_invoice") {
    return {
      template_name: "Retail GST Invoice",
      template_type: type,
      company_name: "Your Business Name",
      company_address: "Business Address, City, State, Pin Code",
      gstin: "",
      contact_number: "",
      email: "",
      show_qr: true,
      show_barcode: false,
      show_signature: true,
      footer_text: "Thank You For Your Business With Us!",
      terms_conditions: DEFAULT_TERMS,
      template_json: baseLayout("R", "retail_gst_invoice_v1"),
      status: "inactive" as const
    };
  }

  return {
    template_name: "",
    template_type: type,
    company_name: "Your Business Name",
    company_address: "",
    gstin: "",
    contact_number: "",
    email: "",
    show_qr: false,
    show_barcode: false,
    show_signature: false,
    footer_text: "",
    terms_conditions: DEFAULT_TERMS,
    template_json: baseLayout("INV", "custom_invoice_v1"),
    status: "inactive" as const
  };
}
