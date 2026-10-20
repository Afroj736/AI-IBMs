export type AccountSettingsTab =
  | "personal"
  | "account"
  | "security"
  | "notifications"
  | "appearance"
  | "activity";

export type NotificationPreferences = {
  email: boolean;
  push: boolean;
  invoice_alerts: boolean;
  low_stock: boolean;
};

export type UserProfileSettingsPayload = {
  first_name: string;
  last_name: string;
  display_name: string;
  mobile: string;
  gender: string;
  bio: string;
  avatar_data_url: string | null;
  department: string;
  username: string;
  notification_prefs: NotificationPreferences;
  appearance_theme: "light" | "dark" | "system";
  two_factor_enabled: boolean;
  two_factor_method: string;
};

export const DEFAULT_PROFILE_SETTINGS: UserProfileSettingsPayload = {
  first_name: "",
  last_name: "",
  display_name: "",
  mobile: "",
  gender: "Male",
  bio: "",
  avatar_data_url: null,
  department: "Central Administration",
  username: "",
  notification_prefs: {
    email: true,
    push: false,
    invoice_alerts: true,
    low_stock: true
  },
  appearance_theme: "light",
  two_factor_enabled: false,
  two_factor_method: ""
};

export type UserProfileResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string | null;
  member_since: string;
  last_login_label: string;
  settings: UserProfileSettingsPayload;
};
