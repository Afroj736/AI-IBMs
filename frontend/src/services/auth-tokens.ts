const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const PROFILE_KEY = "smartbill_user_profile";

export interface StoredAuthTokens {
  access_token: string;
  refresh_token: string;
}

export function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function writeTokens(tokens: StoredAuthTokens) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

export function hasStoredAccessToken(): boolean {
  return !!readAccessToken();
}
