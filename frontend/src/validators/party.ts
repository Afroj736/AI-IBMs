import { z } from "zod";

export const partySchema = z.object({
  party_type: z.enum(["customer", "supplier", "both"]),
  name: z.string().min(2).max(160),
  business_name: z.string().optional(),
  gstin: z.string().optional(),
  pan_number: z.string().optional(),
  mobile: z.string().min(8).max(20),
  alternate_mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  billing_address: z.string().optional(),
  shipping_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  credit_limit: z.number().min(0),
  opening_balance: z.number(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active")
});

export type PartyFormValues = z.infer<typeof partySchema>;
