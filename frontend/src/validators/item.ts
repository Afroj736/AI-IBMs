import { z } from "zod";

export const itemSchema = z.object({
  item_name: z.string().min(2).max(160),
  item_code: z.string().min(2).max(80),
  sku: z.string().min(2).max(80),
  barcode: z.string().optional(),
  category: z.string().optional(),
  sub_category: z.string().optional(),
  brand: z.string().optional(),
  model_number: z.string().optional(),
  serial_number_required: z.boolean().default(false),
  hsn_code: z.string().optional(),
  gst_percentage: z.number().min(0).max(100),
  purchase_price: z.number().min(0),
  selling_price: z.number().min(0),
  minimum_stock: z.number().int().min(0),
  current_stock: z.number().int().min(0),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "pending_review"]).default("active")
});

export type ItemFormValues = z.infer<typeof itemSchema>;
