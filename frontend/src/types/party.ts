export type PartyType = "customer" | "supplier" | "both";
export type PartyStatus = "active" | "inactive";

export interface Party {
  id: string;
  party_code: string;
  party_type: PartyType;
  name: string;
  business_name?: string | null;
  gstin?: string | null;
  pan_number?: string | null;
  mobile: string;
  alternate_mobile?: string | null;
  email?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  credit_limit: number;
  opening_balance: number;
  notes?: string | null;
  status: PartyStatus;
  created_at: string;
  updated_at: string;
}
