"use client";

import { useEffect } from "react";

import {
  fetchCurrentUser,
  hasPersistedSession,
  loadPersistedUserProfile,
  persistUserProfile
} from "@/services/auth-service";
import { useAuthStore } from "@/store/auth-store";

export function AuthHydrator() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (typeof window === "undefined" || !hasPersistedSession()) {
      return;
    }

    const token = window.localStorage.getItem("access_token");
    const refresh = window.localStorage.getItem("refresh_token");
    if (!token || !refresh) {
      useAuthStore.getState().clearAuth();
      return;
    }

    const cached = loadPersistedUserProfile();
    if (cached && !accessToken) {
      setAuth({ accessToken: token, refreshToken: refresh, user: cached });
    }

    fetchCurrentUser()
      .then((user) => {
        persistUserProfile(user);
        if (accessToken) {
          setUser(user);
        } else {
          setAuth({ accessToken: token, refreshToken: refresh, user });
        }
      })
      .catch(() => {
        /* token invalid — leave store as-is until explicit logout */
      });
  }, [accessToken, setAuth, setUser]);

  return null;
}
