import { create } from "zustand";

type UserRole = "admin" | "owner" | "manager" | "accountant" | "sales_staff" | "store_operator";

export interface AuthCompany {
  id: string;
  business_name: string;
  owner_name: string;
  mobile: string | null;
  email: string;
  gst_number: string | null;
  address: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  company: AuthCompany | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (input: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  setSessionTokens: (input: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAuth: ({ accessToken, refreshToken, user }) =>
    set({ accessToken, refreshToken, user }),
  setSessionTokens: ({ accessToken, refreshToken }) =>
    set({ accessToken, refreshToken }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ accessToken: null, refreshToken: null, user: null })
}));
