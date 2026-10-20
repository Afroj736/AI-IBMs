export interface GstTaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  isInterState: boolean;
}

export function gstStateCodeFromGstin(gstin: string | null | undefined): string | null {
  const value = gstin?.trim();
  if (!value || value.length < 2) return null;
  return value.slice(0, 2).toUpperCase();
}

function normalizeState(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Intra-state (same state): CGST + SGST.
 * Inter-state (different state): IGST.
 * Prefers GSTIN state codes when both parties have a GSTIN.
 */
export function isInterStateSupply(
  companyState: string,
  partyState: string,
  companyGstin?: string | null,
  partyGstin?: string | null
): boolean {
  const companyCode = gstStateCodeFromGstin(companyGstin);
  const partyCode = gstStateCodeFromGstin(partyGstin);
  if (companyCode && partyCode) {
    return companyCode !== partyCode;
  }

  const normalizedCompany = normalizeState(companyState);
  const normalizedParty = normalizeState(partyState);
  if (!normalizedCompany || !normalizedParty) {
    return false;
  }
  return normalizedCompany !== normalizedParty;
}

export function splitGstTax(totalTax: number, isInterState: boolean): GstTaxBreakdown {
  if (totalTax <= 0) {
    return { cgst: 0, sgst: 0, igst: 0, totalTax: 0, isInterState };
  }

  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
      isInterState: true
    };
  }

  const cgst = Math.round((totalTax / 2) * 100) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;
  return {
    cgst,
    sgst,
    igst: 0,
    totalTax,
    isInterState: false
  };
}
