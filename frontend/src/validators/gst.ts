/** Standard Indian GSTIN format: 15 alphanumeric characters */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const GSTIN_LENGTH = 15;

export function normalizeGSTIN(gstin: string): string {
  return gstin.trim().toUpperCase();
}

export function isValidGSTIN(gstin: string): boolean {
  const normalized = normalizeGSTIN(gstin);
  return normalized.length === GSTIN_LENGTH && GSTIN_REGEX.test(normalized);
}

/** PAN is embedded in GSTIN at positions 3–12 (0-indexed: 2–11). */
export function extractPANFromGSTIN(gstin: string): string {
  const normalized = normalizeGSTIN(gstin);
  if (normalized.length < 12) return "";
  return normalized.substring(2, 12);
}
