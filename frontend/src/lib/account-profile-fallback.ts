import type { AuthUser } from "@/store/auth-store";
import {
  DEFAULT_PROFILE_SETTINGS,
  type UserProfileResponse,
  type UserProfileSettingsPayload
} from "@/types/account-settings";

const PROFILE_SETTINGS_KEY = "smartbill_account_settings";

export function loadLocalProfileSettings(): Partial<UserProfileSettingsPayload> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(PROFILE_SETTINGS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<UserProfileSettingsPayload>;
  } catch {
    return {};
  }
}

export function saveLocalProfileSettings(settings: UserProfileSettingsPayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(settings));
}

export function profileFromAuthUser(user: AuthUser): UserProfileResponse {
  const parts = user.name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const local = loadLocalProfileSettings();

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    member_since: new Date().toISOString(),
    last_login_label: "Today",
    settings: {
      ...DEFAULT_PROFILE_SETTINGS,
      first_name: first,
      last_name: last,
      display_name: local.display_name || user.email.split("@")[0] || first,
      username: local.username || user.email.split("@")[0]?.replace(".", "_") || "",
      mobile: local.mobile ?? user.company?.mobile ?? "",
      bio: local.bio ?? "",
      gender: local.gender ?? DEFAULT_PROFILE_SETTINGS.gender,
      avatar_data_url: local.avatar_data_url ?? null,
      department: local.department ?? DEFAULT_PROFILE_SETTINGS.department,
      notification_prefs: {
        ...DEFAULT_PROFILE_SETTINGS.notification_prefs,
        ...local.notification_prefs
      },
      appearance_theme: local.appearance_theme ?? DEFAULT_PROFILE_SETTINGS.appearance_theme,
      two_factor_enabled: local.two_factor_enabled ?? false,
      two_factor_method: local.two_factor_method ?? ""
    }
  };
}
