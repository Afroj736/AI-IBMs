"use client";

import {
  ArrowLeft,
  Badge,
  Bell,
  Eye,
  EyeOff,
  History,
  Loader2,
  Lock,
  Palette,
  PersonStanding,
  TriangleAlert,
  Save,
  Shield,
  Smartphone
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  loadLocalProfileSettings,
  profileFromAuthUser,
  saveLocalProfileSettings
} from "@/lib/account-profile-fallback";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatUserRole, getInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { fetchCurrentUser } from "@/services/auth-service";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile
} from "@/services/account-settings-service";
import { useAuthStore } from "@/store/auth-store";
import {
  DEFAULT_PROFILE_SETTINGS,
  type AccountSettingsTab,
  type UserProfileResponse,
  type UserProfileSettingsPayload
} from "@/types/account-settings";

const TABS: { id: AccountSettingsTab; label: string; icon: typeof PersonStanding }[] = [
  { id: "personal", label: "Personal Info", icon: PersonStanding },
  { id: "account", label: "Account Info", icon: Badge },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "activity", label: "Active Sessions", icon: History }
];

function CapsLabel({ children }: { children: string }) {
  return (
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#45464d]">
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-2.5 text-[#191c1e] outline-none transition-all focus:ring-2 focus:ring-[#712ae2]/50";

function SectionCard({
  title,
  icon: Icon,
  children,
  className
}: {
  title: string;
  icon: typeof Lock;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[#e0e3e5]/30 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#e0e3e5]/20 px-6 py-4">
        <Icon className="h-5 w-5 text-[#712ae2]" />
        <h2 className="text-lg font-semibold text-[#191c1e]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function formatMemberSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

function userIdLabel(id: string): string {
  const short = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `#SB-${short}`;
}

function readImageFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.readAsDataURL(file);
}

export function AccountSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountSettingsTab>("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [settings, setSettings] = useState<UserProfileSettingsPayload>(DEFAULT_PROFILE_SETTINGS);
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const displayName = useMemo(() => {
    const parts = [settings.first_name, settings.last_name].filter(Boolean).join(" ");
    return parts || profile?.name || "User";
  }, [settings.first_name, settings.last_name, profile?.name]);

  const applyResponse = useCallback((data: UserProfileResponse) => {
    setProfile(data);
    setEmail(data.email);
    setSettings({ ...DEFAULT_PROFILE_SETTINGS, ...data.settings });
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setUsingLocalFallback(false);
    try {
      const data = await getMyProfile();
      applyResponse(data);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401) {
        toast.error(getApiErrorMessage(error, "Please sign in again"));
        router.push("/login");
        return;
      }
      if (status === 404) {
        try {
          const cached = useAuthStore.getState().user;
          const user = cached ?? (await fetchCurrentUser());
          applyResponse(profileFromAuthUser(user));
          setUsingLocalFallback(true);
          toast.warning(
            "Profile API is unavailable on the server. Showing your account data — restart the backend, then save again."
          );
          return;
        } catch {
          /* fall through */
        }
      }
      setLoadError(getApiErrorMessage(error, "Failed to load profile"));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const patchSettings = (patch: Partial<UserProfileSettingsPayload>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const patchNotifications = (patch: Partial<UserProfileSettingsPayload["notification_prefs"]>) => {
    setSettings((prev) => ({
      ...prev,
      notification_prefs: { ...prev.notification_prefs, ...patch }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullName = [settings.first_name, settings.last_name].filter(Boolean).join(" ").trim();
      if (usingLocalFallback) {
        saveLocalProfileSettings(settings);
        const cached = useAuthStore.getState().user;
        if (cached) {
          applyResponse({
            ...profileFromAuthUser(cached),
            name: fullName || displayName,
            email,
            settings
          });
        }
        toast.warning("Saved locally. Restart the backend to persist profile to the server.");
        return;
      }
      const updated = await updateMyProfile({
        name: fullName || displayName,
        email,
        settings
      });
      applyResponse(updated);
      setUsingLocalFallback(false);
      toast.success("Profile saved");
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        saveLocalProfileSettings(settings);
        setUsingLocalFallback(true);
        toast.warning("Saved locally. Restart the backend to persist profile to the server.");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Enter current and new password");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("New password must be at least 12 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changeMyPassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to change password"));
    } finally {
      setChangingPassword(false);
    }
  };

  const disabled = !editing || saving;
  const roleLabel = formatUserRole(profile?.role);
  const initials = getInitials(displayName);

  const actionButtons = (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4 pb-8">
      <Button
        type="button"
        variant="outline"
        className="h-11 shrink-0 rounded-lg border-[#76777d] px-8"
        onClick={() => setEditing((e) => !e)}
      >
        {editing ? "Lock Fields" : "Unlock Fields"}
      </Button>
      <Button
        type="button"
        className="h-11 shrink-0 rounded-lg bg-[#712ae2] px-10 shadow-lg shadow-[#712ae2]/20 hover:bg-[#712ae2]/90"
        disabled={disabled}
        onClick={() => void handleSave()}
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Changes
      </Button>
    </div>
  );

  const dangerZone = (
    <section className="mt-12 overflow-hidden rounded-xl border-2 border-[#ba1a1a]/20 bg-[#ffdad6]/5 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#ba1a1a]/10 px-6 py-4">
        <TriangleAlert className="h-5 w-5 text-[#ba1a1a]" />
        <h2 className="text-lg font-semibold text-[#ba1a1a]">Danger Zone</h2>
      </div>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="font-bold text-[#191c1e]">Deactivate Account</p>
            <p className="text-sm text-[#45464d]">Temporarily disable your profile.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-[#ba1a1a]/30 text-xs font-bold uppercase text-[#ba1a1a] hover:bg-[#ba1a1a]/5"
            onClick={() => toast.info("Contact your administrator to deactivate your account.")}
          >
            Deactivate
          </Button>
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-[#ba1a1a]/10 pt-4 md:flex-row md:items-center">
          <div>
            <p className="font-bold text-[#ba1a1a]">Delete Account</p>
            <p className="text-sm text-[#45464d]">Permanently remove all data.</p>
          </div>
          <Button
            type="button"
            className="bg-[#ba1a1a] text-xs font-bold uppercase hover:bg-[#ba1a1a]/90"
            onClick={() => toast.error("Account deletion is not enabled. Contact support.")}
          >
            Delete Permanently
          </Button>
        </div>
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb]">
        <Loader2 className="h-10 w-10 animate-spin text-[#712ae2]" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f9fb] p-6 text-center">
        <p className="max-w-md text-sm text-[#45464d]">{loadError ?? "Profile unavailable"}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/billing")}>
            Back to Billing
          </Button>
          <Button className="bg-[#712ae2] hover:bg-[#712ae2]/90" onClick={() => void loadProfile()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] font-sans text-[#191c1e] antialiased">
      <header className="fixed top-0 z-50 w-full border-b border-[#c6c6cd] bg-[#f2f4f6] shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3 md:px-10">
          <Link
            href="/billing"
            className="shrink-0 rounded-full p-1.5 transition hover:bg-[#e6e8ea] active:scale-95 sm:p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-[#000000] sm:h-6 sm:w-6" />
          </Link>
          <h1 className="shrink-0 text-lg font-bold text-[#000000] sm:text-xl md:text-2xl">
            Profile Settings
          </h1>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto sm:gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                    active
                      ? "bg-[#8a4cfc] text-white"
                      : "bg-[#eceef0] text-[#45464d] hover:bg-[#e0e3e5]"
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-[72px] sm:pt-20 md:px-10">
        {activeTab === "personal" && (
          <>
            <div className="flex flex-col items-center gap-8 rounded-xl border border-[#e0e3e5]/30 bg-white p-8 shadow-sm md:flex-row md:items-start">
              <div className="relative shrink-0 group">
                <div className="h-[140px] w-[140px] overflow-hidden rounded-full border-4 border-[#712ae2]/20">
                  {settings.avatar_data_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={displayName}
                      src={settings.avatar_data_url}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#712ae2] text-3xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                {editing && (
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readImageFile(file, (url) => patchSettings({ avatar_data_url: url }));
                      }}
                    />
                    <span className="text-xs font-bold uppercase text-white">Change photo</span>
                  </label>
                )}
              </div>
              <div className="flex-grow space-y-4 text-center md:text-left">
                <div>
                  <h2 className="text-2xl font-semibold">{displayName}</h2>
                  <p className="font-medium text-[#45464d]">
                    {roleLabel} • <span className="text-[#712ae2]">Admin Badge</span>
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 border-t border-[#e0e3e5]/20 pt-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#c6c6cd]">
                      Member Since
                    </p>
                    <p className="text-sm font-medium">{formatMemberSince(profile.member_since)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#c6c6cd]">
                      Last Login
                    </p>
                    <p className="text-sm font-medium">{profile.last_login_label}</p>
                  </div>
                </div>
              </div>
            </div>

            <SectionCard title="Personal Information" icon={PersonStanding}>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <div>
                  <CapsLabel>First Name</CapsLabel>
                  <input
                    className={inputClass}
                    disabled={disabled}
                    value={settings.first_name}
                    onChange={(e) => patchSettings({ first_name: e.target.value })}
                  />
                </div>
                <div>
                  <CapsLabel>Last Name</CapsLabel>
                  <input
                    className={inputClass}
                    disabled={disabled}
                    value={settings.last_name}
                    onChange={(e) => patchSettings({ last_name: e.target.value })}
                  />
                </div>
                <div>
                  <CapsLabel>Display Name</CapsLabel>
                  <input
                    className={inputClass}
                    disabled={disabled}
                    value={settings.display_name}
                    onChange={(e) => patchSettings({ display_name: e.target.value })}
                  />
                </div>
                <div>
                  <CapsLabel>Email Address</CapsLabel>
                  <input
                    className={inputClass}
                    type="email"
                    disabled={disabled}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <CapsLabel>Mobile</CapsLabel>
                  <input
                    className={inputClass}
                    disabled={disabled}
                    value={settings.mobile}
                    onChange={(e) => patchSettings({ mobile: e.target.value })}
                  />
                </div>
                <div>
                  <CapsLabel>Gender</CapsLabel>
                  <select
                    className={cn(inputClass, "appearance-none")}
                    disabled={disabled}
                    value={settings.gender}
                    onChange={(e) => patchSettings({ gender: e.target.value })}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <CapsLabel>Bio</CapsLabel>
                  <textarea
                    className={inputClass}
                    rows={3}
                    disabled={disabled}
                    value={settings.bio}
                    onChange={(e) => patchSettings({ bio: e.target.value })}
                  />
                </div>
              </div>
            </SectionCard>
            {dangerZone}
            {actionButtons}
          </>
        )}

        {activeTab === "account" && (
          <>
            <SectionCard title="Account Credentials" icon={Badge}>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                <div>
                  <CapsLabel>User ID</CapsLabel>
                  <p className="rounded-lg bg-[#e6e8ea]/40 px-3 py-2 font-mono text-sm font-bold">
                    {userIdLabel(profile.id)}
                  </p>
                </div>
                <div>
                  <CapsLabel>Username</CapsLabel>
                  <input
                    className={cn(inputClass, "font-bold")}
                    disabled={disabled}
                    value={settings.username}
                    onChange={(e) => patchSettings({ username: e.target.value })}
                  />
                </div>
                <div>
                  <CapsLabel>Department</CapsLabel>
                  <input
                    className={cn(inputClass, "font-bold")}
                    disabled={disabled}
                    value={settings.department}
                    onChange={(e) => patchSettings({ department: e.target.value })}
                  />
                </div>
              </div>
            </SectionCard>
            <div className="relative overflow-hidden rounded-xl border border-[#e0e3e5]/30 bg-white p-6 shadow-sm">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#712ae2]/5 blur-3xl" />
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                AI Usage Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <p className="text-xs font-medium text-[#45464d]">Automated Invoices</p>
                  <p className="text-xl font-bold text-[#712ae2]">—</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#e6e8ea]">
                  <div className="h-full w-0 rounded-full bg-[#712ae2]" />
                </div>
                <p className="text-[10px] text-[#76777d]">Usage stats will appear as you create invoices.</p>
              </div>
            </div>
            {actionButtons}
          </>
        )}

        {activeTab === "security" && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard title="Security" icon={Lock}>
                <div className="space-y-4 p-6">
                  <div className="relative">
                    <CapsLabel>Current Password</CapsLabel>
                    <input
                      className={cn(inputClass, "pr-10")}
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute bottom-2.5 right-3 text-[#76777d]"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div>
                    <CapsLabel>New Password</CapsLabel>
                    <input
                      className={inputClass}
                      type="password"
                      placeholder="Min. 12 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2 rounded-lg bg-[#f2f4f6] p-3">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#45464d]">
                      <span className={newPassword.length >= 12 ? "text-green-600" : "text-[#76777d]"}>
                        {newPassword.length >= 12 ? "✓" : "○"}
                      </span>
                      At least 12 characters
                    </p>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#45464d]">
                      <span className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "text-green-600" : "text-[#76777d]"}>
                        {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "✓" : "○"}
                      </span>
                      One special character
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-[#712ae2] hover:bg-[#712ae2]/90"
                    disabled={changingPassword}
                    onClick={() => void handleChangePassword()}
                  >
                    {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Password
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="Authentication" icon={Shield}>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <p className="font-bold">Two-Factor Authentication</p>
                      <p className="mt-1 text-sm text-[#45464d]">Add an extra layer of security.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={settings.two_factor_enabled}
                        disabled={disabled}
                        onChange={(e) =>
                          patchSettings({
                            two_factor_enabled: e.target.checked,
                            two_factor_method: e.target.checked ? settings.two_factor_method || "SMS" : ""
                          })
                        }
                      />
                      <div className="h-6 w-11 rounded-full bg-[#c6c6cd] after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#712ae2] peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                  {settings.two_factor_enabled && (
                    <div className="flex items-center gap-4 rounded-xl border border-[#712ae2]/20 bg-[#712ae2]/5 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#712ae2] text-white">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#712ae2]">Enabled</p>
                        <p className="text-sm font-medium">
                          {settings.two_factor_method || "SMS"} — configure with your admin
                        </p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl border-2 border-dashed border-[#c6c6cd] py-2.5 text-xs font-bold text-[#45464d] transition hover:bg-[#eceef0]"
                    onClick={() => toast.info("Backup methods coming soon.")}
                  >
                    Add Backup Method
                  </button>
                </div>
              </SectionCard>
            </div>
            {actionButtons}
          </>
        )}

        {activeTab === "notifications" && (
          <>
            <SectionCard title="Notification Preferences" icon={Bell}>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:gap-x-12">
                {(
                  [
                    ["email", "Email Notifications", "Weekly summaries and login alerts"],
                    ["push", "Push Notifications", "Real-time alerts"],
                    ["invoice_alerts", "Invoice Alerts", "Auto-generated invoice alerts"],
                    ["low_stock", "Low Stock Warning", "AI re-ordering sequence triggers"]
                  ] as const
                ).map(([key, title, desc]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="text-sm text-[#45464d]">{desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        disabled={disabled}
                        checked={settings.notification_prefs[key]}
                        onChange={(e) => patchNotifications({ [key]: e.target.checked })}
                      />
                      <div className="h-6 w-11 rounded-full bg-[#c6c6cd] after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#712ae2] peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
              </div>
            </SectionCard>
            {actionButtons}
          </>
        )}

        {activeTab === "appearance" && (
          <>
            <SectionCard title="Appearance" icon={Palette}>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                {(
                  [
                    ["light", "Light"],
                    ["dark", "Dark"],
                    ["system", "System"]
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      className="peer sr-only"
                      disabled={disabled}
                      checked={settings.appearance_theme === value}
                      onChange={() => patchSettings({ appearance_theme: value })}
                    />
                    <div className="rounded-xl border-2 border-[#e0e3e5]/30 p-4 transition peer-checked:border-[#712ae2] peer-checked:bg-[#712ae2]/5">
                      <div
                        className={cn(
                          "mb-3 h-24 rounded-lg border p-2 shadow-inner",
                          value === "light" && "border-slate-200 bg-white",
                          value === "dark" && "border-slate-800 bg-slate-900",
                          value === "system" &&
                            "flex items-center justify-center border-slate-200 bg-gradient-to-r from-white to-slate-900"
                        )}
                      >
                        {value !== "system" && (
                          <div className="space-y-1">
                            <div className="h-2 w-1/2 rounded bg-slate-200/80" />
                            <div className="h-2 w-full rounded bg-slate-200/80" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase">{label}</span>
                        {settings.appearance_theme === value && (
                          <span className="text-[#712ae2]">✓</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </SectionCard>
            {actionButtons}
          </>
        )}

        {activeTab === "activity" && (
          <>
            <SectionCard title="Active Sessions" icon={History}>
              <div className="flex items-center justify-between border-b border-[#e0e3e5]/20 px-6 py-4">
                <span />
                <button
                  type="button"
                  className="text-xs font-bold text-[#712ae2] hover:underline"
                  onClick={() => toast.info("Other sessions logout is not configured yet.")}
                >
                  Logout All Others
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between rounded-xl border border-[#e0e3e5]/10 bg-[#f2f4f6]/30 p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <History className="h-5 w-5 text-[#45464d]" />
                    </div>
                    <div>
                      <p className="font-bold">
                        This device{" "}
                        <span className="ml-2 rounded border border-[#712ae2]/30 px-1.5 py-0.5 text-[10px] font-black uppercase text-[#712ae2]">
                          Current
                        </span>
                      </p>
                      <p className="text-sm text-[#45464d]">Browser session</p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Recent Activity" icon={History}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#f2f4f6]/50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold uppercase text-[#45464d]">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase text-[#45464d]">Device</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase text-[#45464d]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e3e5]/10">
                    <tr>
                      <td className="px-6 py-4 text-sm">{profile.last_login_label}</td>
                      <td className="px-6 py-4 text-sm font-medium">This device</td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-green-100 px-2 py-1 text-[10px] font-bold uppercase text-green-700">
                          Success
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>
            {actionButtons}
          </>
        )}
      </main>
    </div>
  );
}
