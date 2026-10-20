import { api } from "@/services/api";
import {
  clearTokens,
  hasStoredAccessToken,
  writeTokens
} from "@/services/auth-tokens";
import { useAuthStore, type AuthUser } from "@/store/auth-store";
import type { LoginRequestPayload } from "@/validators/login";
import type { RegisterRequestPayload } from "@/validators/register";

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type AuthMeResponse = AuthUser;

const PROFILE_STORAGE_KEY = "smartbill_user_profile";

export async function registerAccount(payload: RegisterRequestPayload): Promise<AuthTokenResponse> {
  const { data } = await api.post<AuthTokenResponse>("/auth/register", payload);
  return data;
}

export async function loginAccount(payload: LoginRequestPayload): Promise<AuthTokenResponse> {
  const { data } = await api.post<AuthTokenResponse>("/auth/login", payload);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  const { data } = await api.get<AuthMeResponse>("/auth/me");
  return data;
}

export async function refreshSessionTokens(refreshToken: string): Promise<AuthTokenResponse> {
  const { data } = await api.post<AuthTokenResponse>("/auth/refresh", {
    refresh_token: refreshToken
  });
  return data;
}

export function persistTokens(tokens: AuthTokenResponse) {
  writeTokens(tokens);
}

export function persistUserProfile(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(user));
}

export function loadPersistedUserProfile(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearPersistedTokens() {
  clearTokens();
}

/** Clear storage first so AuthHydrator does not re-login before tokens are removed. */
export function logoutSession() {
  clearPersistedTokens();
  useAuthStore.getState().clearAuth();
}

export function hasPersistedSession(): boolean {
  return hasStoredAccessToken();
}
