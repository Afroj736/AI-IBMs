"use client";

import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Palette,
  Receipt,
  Save,
  Settings2,
  Signature
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { fetchCurrentUser } from "@/services/auth-service";
import { getCompanySettings, updateCompanySettings } from "@/services/company-settings-service";
import type { AuthCompany } from "@/store/auth-store";
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettingsPayload,
  type CompanySettingsResponse,
  type CompanySettingsTab
} from "@/types/company-settings";

const TABS: { id: CompanySettingsTab; label: string; icon: typeof Building2 }[] = [
  { id: "business", label: "Business & Address", icon: Building2 },
  { id: "tax", label: "GST & Tax Info", icon: Receipt },
  { id: "banking", label: "Banking Details", icon: CreditCard },
  { id: "invoice", label: "Invoice Settings", icon: FileText },
  { id: "billing", label: "Billing & PDF", icon: Settings2 },
  { id: "communication", label: "WhatsApp & Email", icon: MessageCircle }
];

function CapsLabel({ children }: { children: string }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#45464d]">
      {children}
    </label>
  );
}

function Field({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <CapsLabel>{label}</CapsLabel>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border-none bg-[#f2f4f6] p-3 text-[#191c1e] outline-none transition-all focus:ring-2 focus:ring-[#712ae2]";

function GlassSection({
  title,
  icon: Icon,
  className,
  children
}: {
  title: string;
  icon: typeof Info;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#e0e3e5]/50 bg-white/80 p-6 shadow-[inset_0_0_20px_rgba(124,58,237,0.05),0_4px_12px_rgba(19,27,46,0.05)] backdrop-blur-md sm:p-8",
        className
      )}
    >
      <div className="mb-6 flex items-center gap-2 text-[#000000]">
        <Icon className="h-6 w-6" />
        <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function readImageFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.readAsDataURL(file);
}

export function CompanySettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CompanySettingsTab>("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<CompanySettingsPayload>(DEFAULT_COMPANY_SETTINGS);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyFromAuthCompany = useCallback((company: AuthCompany, userName: string, userEmail: string) => {
    setBusinessName(company.business_name);
    setOwnerName(company.owner_name || userName);
    setMobile(company.mobile ?? "");
    setEmail(company.email || userEmail);
    setSettings((prev) => ({
      ...prev,
      gstin: company.gst_number ?? "",
      sender_email: company.email || userEmail,
      whatsapp_number: company.mobile ?? "",
      address: {
        ...prev.address,
        line1: company.address ?? ""
      }
    }));
  }, []);

  const applyResponse = useCallback((data: CompanySettingsResponse) => {
    setBusinessName(data.business_name);
    setOwnerName(data.owner_name);
    setMobile(data.mobile ?? "");
    setEmail(data.email);
    const merged = { ...DEFAULT_COMPANY_SETTINGS, ...data.settings };
    if (data.gst_number && !merged.gstin) merged.gstin = data.gst_number;
    if (data.address && !merged.address.line1) {
      merged.address = { ...merged.address, line1: data.address };
    }
    setSettings(merged);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCompanySettings();
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
          const user = await fetchCurrentUser();
          if (user.company) {
            applyFromAuthCompany(user.company, user.name, user.email);
            toast.warning(
              "Company settings API is unavailable. Showing profile data — click Save after restarting the backend."
            );
            return;
          }
        } catch {
          /* ignore */
        }
      }

      setLoadError(
        getApiErrorMessage(
          error,
          status === 404
            ? "Company settings API not found. Restart the backend (port 8000), then retry."
            : "Failed to load company settings"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [applyFromAuthCompany, applyResponse, router]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const patchSettings = (patch: Partial<CompanySettingsPayload>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const patchAddress = (patch: Partial<CompanySettingsPayload["address"]>) => {
    setSettings((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCompanySettings({
        business_name: businessName,
        owner_name: ownerName,
        mobile: mobile || null,
        email,
        gst_number: settings.gstin || null,
        settings: { ...settings, sender_email: settings.sender_email || email }
      });
      applyResponse(updated);
      toast.success("Company settings saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const disabled = !editing || saving;

  const actionButtons = (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb]">
        <Loader2 className="h-10 w-10 animate-spin text-[#712ae2]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f9fb] p-6 text-center">
        <p className="max-w-md text-sm text-[#45464d]">{loadError}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/billing")}>
            Back to Billing
          </Button>
          <Button className="bg-[#712ae2] hover:bg-[#712ae2]/90" onClick={() => void loadSettings()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <header className="sticky top-0 z-50 w-full border-b border-[#c6c6cd] bg-[#f2f4f6] shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3 md:px-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 rounded-full p-1.5 transition hover:bg-[#e6e8ea] active:scale-95 sm:p-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <h1 className="shrink-0 text-lg font-bold tracking-tight text-[#000000] sm:text-xl md:text-2xl">
            Company Settings
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

      <div className="relative mx-auto max-w-[1440px]">
        <main className="w-full p-4 sm:p-6">
          <div className="mx-auto max-w-6xl pb-24 md:pb-8">
            {activeTab === "business" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                <GlassSection title="Business Information" icon={Info} className="h-full">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="Business Name" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </Field>
                    <Field label="Business Type">
                      <select
                        className={inputClass}
                        disabled={disabled}
                        value={settings.business_type}
                        onChange={(e) => patchSettings({ business_type: e.target.value })}
                      >
                        <option>Private Limited Company</option>
                        <option>Partnership</option>
                        <option>Sole Proprietorship</option>
                        <option>LLP</option>
                      </select>
                    </Field>
                    <Field label="Financial Year">
                      <select
                        className={inputClass}
                        disabled={disabled}
                        value={settings.financial_year}
                        onChange={(e) => patchSettings({ financial_year: e.target.value })}
                      >
                        <option>2024 - 2025</option>
                        <option>2023 - 2024</option>
                        <option>2025 - 2026</option>
                      </select>
                    </Field>
                    <Field label="Owner Name">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                      />
                    </Field>
                    <Field label="Mobile Number">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </Field>
                    <Field label="Email Address">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                    <Field label="Website">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.website}
                        onChange={(e) => patchSettings({ website: e.target.value })}
                      />
                    </Field>
                    <Field label="Description" className="sm:col-span-2">
                      <textarea
                        className={inputClass}
                        disabled={disabled}
                        rows={3}
                        value={settings.description}
                        onChange={(e) => patchSettings({ description: e.target.value })}
                      />
                    </Field>
                  </div>
                </GlassSection>

                <GlassSection title="Business Address" icon={MapPin} className="h-full">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="Address Line 1" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.address.line1}
                        onChange={(e) => patchAddress({ line1: e.target.value })}
                      />
                    </Field>
                    <Field label="Address Line 2" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.address.line2}
                        onChange={(e) => patchAddress({ line2: e.target.value })}
                      />
                    </Field>
                    <Field label="City">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.address.city}
                        onChange={(e) => patchAddress({ city: e.target.value })}
                      />
                    </Field>
                    <Field label="State">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.address.state}
                        onChange={(e) => patchAddress({ state: e.target.value })}
                      />
                    </Field>
                    <Field label="Country">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.address.country}
                        onChange={(e) => patchAddress({ country: e.target.value })}
                      />
                    </Field>
                    <Field label="Pincode">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.address.pincode}
                        onChange={(e) => patchAddress({ pincode: e.target.value })}
                      />
                    </Field>
                  </div>
                </GlassSection>
                </div>

                <GlassSection title="Logo & Branding" icon={Palette}>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div>
                      <CapsLabel>Business Logo</CapsLabel>
                      <div className="group relative aspect-square max-w-[180px] overflow-hidden rounded-xl border-2 border-dashed border-[#c6c6cd]">
                        {settings.logo_data_url ? (
                          <img
                            src={settings.logo_data_url}
                            alt="Logo"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[#f2f4f6] text-sm text-[#76777d]">
                            No logo
                          </div>
                        )}
                        {!disabled && (
                          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <span className="text-sm text-white">Change</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) readImageFile(file, (url) => patchSettings({ logo_data_url: url }));
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div>
                      <CapsLabel>Authorized Signature</CapsLabel>
                      <label
                        className={cn(
                          "flex aspect-[2/1] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c6c6cd] bg-[#f2f4f6] transition hover:bg-[#e0e3e5]",
                          disabled && "pointer-events-none opacity-60"
                        )}
                      >
                        {settings.signature_data_url ? (
                          <img
                            src={settings.signature_data_url}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain p-2"
                          />
                        ) : (
                          <>
                            <Signature className="h-8 w-8 text-[#76777d]" />
                            <p className="mt-1 text-xs text-[#76777d]">Upload Signature</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={disabled}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) readImageFile(file, (url) => patchSettings({ signature_data_url: url }));
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </GlassSection>
              </div>
            )}

            {activeTab === "tax" && (
              <div className="space-y-8">
                <GlassSection title="GST & Tax Info" icon={Receipt}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="GSTIN Number">
                      <input
                        className={cn(inputClass, "uppercase")}
                        disabled={disabled}
                        value={settings.gstin}
                        onChange={(e) => patchSettings({ gstin: e.target.value.toUpperCase() })}
                      />
                    </Field>
                    <Field label="PAN Number">
                      <input
                        className={cn(inputClass, "uppercase")}
                        disabled={disabled}
                        value={settings.pan}
                        onChange={(e) => patchSettings({ pan: e.target.value.toUpperCase() })}
                      />
                    </Field>
                    <Field label="Default GST %">
                      <select
                        className={inputClass}
                        disabled={disabled}
                        value={settings.default_gst_percent}
                        onChange={(e) => patchSettings({ default_gst_percent: e.target.value })}
                      >
                        <option>18%</option>
                        <option>12%</option>
                        <option>5%</option>
                        <option>28%</option>
                      </select>
                    </Field>
                    <Field label="State Code">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.state_code}
                        onChange={(e) => patchSettings({ state_code: e.target.value })}
                      />
                    </Field>
                  </div>
                </GlassSection>
              </div>
            )}

            {activeTab === "banking" && (
              <div className="space-y-8">
                <GlassSection title="Banking & Payments" icon={CreditCard}>
                  <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="Bank Name">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.bank_name}
                        onChange={(e) => patchSettings({ bank_name: e.target.value })}
                      />
                    </Field>
                    <Field label="Account Number">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.account_number}
                        onChange={(e) => patchSettings({ account_number: e.target.value })}
                      />
                    </Field>
                    <Field label="IFSC Code">
                      <input
                        className={cn(inputClass, "uppercase")}
                        disabled={disabled}
                        value={settings.ifsc}
                        onChange={(e) => patchSettings({ ifsc: e.target.value.toUpperCase() })}
                      />
                    </Field>
                    <Field label="UPI ID">
                      <input
                        className={inputClass}
                        disabled={disabled}
                        value={settings.upi_id}
                        onChange={(e) => patchSettings({ upi_id: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="QR Code Payment">
                    <label
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c6c6cd] bg-[#f2f4f6] p-8 transition hover:bg-[#e0e3e5]",
                        disabled && "pointer-events-none opacity-60"
                      )}
                    >
                      {settings.qr_data_url ? (
                        <img src={settings.qr_data_url} alt="QR" className="max-h-40 object-contain" />
                      ) : (
                        <>
                          <p className="text-[#45464d]">Click or drag QR image here to upload</p>
                          <p className="mt-1 text-xs text-[#76777d]">PNG, JPG up to 2MB</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={disabled}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) readImageFile(file, (url) => patchSettings({ qr_data_url: url }));
                        }}
                      />
                    </label>
                  </Field>
                </GlassSection>
              </div>
            )}

            {activeTab === "invoice" && (
              <div className="space-y-8">
                <GlassSection title="Invoice Numbering" icon={FileText}>
                  <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="Invoice Prefix">
                      <input
                        className={cn(inputClass, "uppercase")}
                        disabled={disabled}
                        value={settings.invoice_prefix}
                        onChange={(e) => patchSettings({ invoice_prefix: e.target.value })}
                      />
                    </Field>
                    <Field label="Starting Number">
                      <input
                        className={inputClass}
                        type="number"
                        disabled={disabled}
                        value={settings.invoice_start_number}
                        onChange={(e) =>
                          patchSettings({ invoice_start_number: Number(e.target.value) || 0 })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-[#c6c6cd]/30 pt-4 md:grid-cols-4">
                    {(["RET", "GST", "PUR", "AI"] as const).map((key) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-[#76777d]">
                          {key === "RET"
                            ? "Retail (RET)"
                            : key === "GST"
                              ? "GST (GST)"
                              : key === "PUR"
                                ? "Purchase (PUR)"
                                : "AI Voice (AI)"}
                        </label>
                        <input
                          className="w-full rounded-lg bg-[#f2f4f6] p-2 text-[#191c1e] outline-none focus:ring-2 focus:ring-[#712ae2]"
                          type="number"
                          disabled={disabled}
                          value={settings.invoice_counters[key] ?? 0}
                          onChange={(e) =>
                            patchSettings({
                              invoice_counters: {
                                ...settings.invoice_counters,
                                [key]: Number(e.target.value) || 0
                              }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </GlassSection>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <GlassSection title="Default Billing" icon={Settings2}>
                    <div className="space-y-4">
                      {(
                        [
                          ["enable_discount", "Enable Discount"],
                          ["auto_round_off", "Auto Round Off"],
                          ["item_wise_gst", "Item-wise GST"],
                          ["auto_calculation", "Auto Calculation"]
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between">
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={settings[key]}
                            onChange={(e) => patchSettings({ [key]: e.target.checked })}
                            className="h-5 w-10 accent-[#712ae2]"
                          />
                        </label>
                      ))}
                    </div>
                  </GlassSection>
                  <GlassSection title="PDF & Print" icon={FileText}>
                    <div className="space-y-4">
                      {(
                        [
                          ["show_logo", "Show Logo"],
                          ["show_signature", "Show Signature"],
                          ["show_bank_details", "Show Bank Details"],
                          ["show_footer_qr", "Show Footer QR"]
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between">
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={settings[key]}
                            onChange={(e) => patchSettings({ [key]: e.target.checked })}
                            className="h-5 w-10 accent-[#712ae2]"
                          />
                        </label>
                      ))}
                    </div>
                  </GlassSection>
                </div>
              </div>
            )}

            {activeTab === "communication" && (
              <div className="space-y-8">
                <GlassSection title="WhatsApp & Email Settings" icon={MessageCircle}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-[#c6c6cd]/30 bg-[#eceef0] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <MessageCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold">WhatsApp Business API</p>
                          <p className="text-xs text-[#76777d]">
                            {settings.whatsapp_connected
                              ? `Connected to ${settings.whatsapp_number || mobile}`
                              : "Not connected"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold uppercase tracking-wide text-[#ba1a1a]"
                        disabled={disabled}
                        onClick={() =>
                          patchSettings({
                            whatsapp_connected: !settings.whatsapp_connected,
                            whatsapp_number: settings.whatsapp_connected ? "" : mobile
                          })
                        }
                      >
                        {settings.whatsapp_connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                    <Field label="Sender Email">
                      <input
                        className={inputClass}
                        type="email"
                        disabled={disabled}
                        value={settings.sender_email || email}
                        onChange={(e) => patchSettings({ sender_email: e.target.value })}
                      />
                    </Field>
                  </div>
                </GlassSection>
              </div>
            )}

            {actionButtons}
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around rounded-t-xl bg-[#e6e8ea] px-4 py-2 shadow-md md:hidden">
        {TABS.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className="flex flex-col items-center text-[#45464d]"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold uppercase">{tab.id === "business" ? "Info" : "Tax"}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="flex flex-col items-center rounded-xl bg-[#131b2e] px-4 py-1 text-white"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          <Save className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase">Save</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center text-[#45464d]"
          onClick={() => setActiveTab("invoice")}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase">Invoice</span>
        </button>
      </div>

      <Link
        href="/billing"
        className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#712ae2] text-white shadow-2xl transition hover:scale-110 active:scale-95"
        aria-label="Voice billing"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden>
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 9a7 7 0 0 0 7-7h-2a5 5 0 0 1-10 0H5a7 7 0 0 0 7 7z" />
        </svg>
      </Link>
    </div>
  );
}
