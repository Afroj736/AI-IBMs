import { z } from "zod";

export const invoiceTemplateSchema = z.object({
  template_name: z.string().min(2).max(120),
  template_type: z.enum([
    "retail_gst_invoice",
    "tax_invoice",
    "purchase_invoice",
    "mobile_store_invoice",
    "electronics_store_invoice"
  ]),
  company_name: z.string().min(2).max(160),
  company_address: z.string().optional(),
  gstin: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  show_qr: z.boolean().default(false),
  show_barcode: z.boolean().default(false),
  show_signature: z.boolean().default(false),
  footer_text: z.string().optional(),
  terms_conditions: z.string().optional(),
  template_json: z.record(z.any()).default({}),
  status: z.enum(["active", "inactive"]).default("inactive")
});

export type InvoiceTemplateFormValues = z.infer<typeof invoiceTemplateSchema>;
