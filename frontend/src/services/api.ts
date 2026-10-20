import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  clearTokens,
  readAccessToken,
  readRefreshToken,
  writeTokens,
  type StoredAuthTokens
} from "@/services/auth-tokens";
import { useAuthStore } from "@/store/auth-store";
import { resolveApiV1BaseUrl } from "@/utils/api-base";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  timeout: 10000
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const refreshToken = readRefreshToken() ?? useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  const { data } = await axios.post<StoredAuthTokens>(
    `${resolveApiV1BaseUrl()}/auth/refresh`,
    { refresh_token: refreshToken },
    { timeout: 15000 }
  );

  writeTokens(data);
  useAuthStore.getState().setSessionTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token
  });

  return data.access_token;
}

function queueRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .catch(() => {
        clearTokens();
        useAuthStore.getState().clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = resolveApiV1BaseUrl();
    const token = readAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (!original || original._retry) {
      return Promise.reject(error);
    }

    const url = original.url ?? "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (error.response?.status !== 401 || isAuthRoute || typeof window === "undefined") {
      return Promise.reject(error);
    }

    original._retry = true;
    const newToken = await queueRefresh();
    if (!newToken) {
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);
