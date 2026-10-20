export interface GSTDetails {
  gstin: string;
  legal_name: string;
  trade_name: string;
  pan: string;
  address: string;
  city?: string;
  state: string;
  pincode: string;
  taxpayer_type: string;
  registration_date: string;
  status: string;
}

export interface GSTPartyFieldMapping {
  name: string;
  business_name: string;
  gstin: string;
  pan_number: string;
  billing_address: string;
  city: string;
  state: string;
  pincode: string;
  business_type: string;
}
