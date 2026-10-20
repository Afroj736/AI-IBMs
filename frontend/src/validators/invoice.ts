import { z } from "zod";

export const invoiceItemSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  discount: z.number().min(0).default(0)
});

export const invoiceSchema = z.object({
  party_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  invoice_date: z.string(),
  discount_amount: z.number().min(0).default(0),
  round_off: z.number().default(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1)
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
