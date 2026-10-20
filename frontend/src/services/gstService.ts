import { api } from "@/services/api";
import type { GSTDetails, GSTPartyFieldMapping } from "@/types/gst";
import { extractPANFromGSTIN, normalizeGSTIN } from "@/validators/gst";

/**
 * Fetch GST registration details from the backend, which queries the official GST portal.
 */
export async function fetchGSTDetails(gstin: string): Promise<GSTDetails> {
  const normalized = normalizeGSTIN(gstin);
  const { data } = await api.get<GSTDetails>(`/gst/lookup/${encodeURIComponent(normalized)}`, {
    timeout: 60000
  });
  return data;
}

/** Map a GST API response to party form field values. */
export function mapGSTDetailsToPartyFields(details: GSTDetails): GSTPartyFieldMapping {
  return {
    name: details.legal_name,
    business_name: details.trade_name,
    gstin: details.gstin,
    pan_number: details.pan || extractPANFromGSTIN(details.gstin),
    billing_address: details.address,
    city: details.city ?? "",
    state: details.state,
    pincode: details.pincode,
    business_type: details.taxpayer_type
  };
}
