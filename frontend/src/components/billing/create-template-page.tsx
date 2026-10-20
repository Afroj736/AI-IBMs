"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  ChevronRight,
  Eye,
  GripVertical,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { CreateTemplateLivePreview } from "@/components/billing/create-template-live-preview";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getDefaultTemplateValues,
  TEMPLATE_TYPE_LABELS,
  type ColumnToggle,
  type ThemePreset
} from "@/lib/default-invoice-templates";
import { cn } from "@/lib/utils";
import { activateTemplate, createTemplate } from "@/services/template-service";
import type { TemplateType } from "@/types/invoice-template";
import { type InvoiceTemplateFormValues, invoiceTemplateSchema } from "@/validators/invoice-template";

const TEMPLATE_TYPES: TemplateType[] = [
  "retail_gst_invoice",
  "tax_invoice",
  "purchase_invoice",
  "mobile_store_invoice",
  "electronics_store_invoice"
];

const THEME_PRESETS: { id: ThemePreset; label: string; swatch: string }[] = [
  { id: "minimal", label: "Minimal", swatch: "bg-white" },
  { id: "dark_executive", label: "Dark Executive", swatch: "bg-[#131b2e]" },
  { id: "creative", label: "Creative", swatch: "bg-[#8a4cfc]" }
];

const inputClass =
  "w-full rounded-lg border-none bg-[#f2f4f6] p-2.5 text-sm text-[#191c1e] outline-none focus:ring-2 focus:ring-[#8a4cfc]/40";

function CapsLabel({ children }: { children: string }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-wider text-[#45464d]">
      {children}
    </label>
  );
}

function Panel({
  step,
  title,
  active = false,
  children
}: {
  step: number;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#e2e8f0]/80 bg-white/80 p-4 backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
            active ? "bg-[#000000] text-white" : "bg-[#e0e3e5] text-[#191c1e]"
          )}
        >
          {step}
        </div>
        <h2 className="text-sm font-semibold text-[#000000]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-10 rounded-full p-0.5 transition-colors",
        checked ? "bg-[#712ae2]" : "bg-[#c6c6cd]"
      )}
    >
      <div
        className={cn(
          "h-4 w-4 rounded-full bg-white transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

function CreateTemplateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type");
  const initialType =
    requestedType && TEMPLATE_TYPES.includes(requestedType as TemplateType)
      ? (requestedType as TemplateType)
      : "retail_gst_invoice";
  const isPresetFlow = initialType === "tax_invoice" || initialType === "retail_gst_invoice";

  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [columnSearch, setColumnSearch] = useState("");

  const form = useForm<InvoiceTemplateFormValues>({
    resolver: zodResolver(invoiceTemplateSchema),
    defaultValues: getDefaultTemplateValues(initialType)
  });

  useEffect(() => {
    form.reset(getDefaultTemplateValues(initialType));
  }, [form, initialType]);

  const values = form.watch();

  const templateJson = useMemo(
    () => (values.template_json ?? {}) as Record<string, unknown>,
    [values.template_json]
  );
  const theme = (templateJson.theme as Record<string, string>) ?? {};
  const sections = (templateJson.sections as Record<string, boolean>) ?? {};
  const lineColumns = (templateJson.line_columns as ColumnToggle[]) ?? [];

  const updateJson = useCallback(
    (patch: Record<string, unknown>) => {
      form.setValue("template_json", { ...templateJson, ...patch }, { shouldDirty: true });
    },
    [form, templateJson]
  );

  const updateTheme = (patch: Record<string, string>) => {
    updateJson({ theme: { ...theme, ...patch } });
  };

  const updateSection = (key: string, value: boolean) => {
    updateJson({ sections: { ...sections, [key]: value } });
  };

  const updateColumn = (id: string, enabled: boolean) => {
    const next = lineColumns.map((col) => (col.id === id ? { ...col, enabled } : col));
    updateJson({ line_columns: next });
  };

  const filteredColumns = lineColumns.filter((col) =>
    col.label.toLowerCase().includes(columnSearch.trim().toLowerCase())
  );

  const saveTemplate = async (publish: boolean) => {
    setSaving(publish ? "publish" : "draft");
    try {
      const payload: InvoiceTemplateFormValues = {
        ...form.getValues(),
        status: publish ? "active" : "inactive",
        email: form.getValues().email || undefined
      };
      const created = await createTemplate(payload);
      if (publish) {
        await activateTemplate(created.id);
      }
      toast.success(publish ? "Template published successfully" : "Template saved as draft");
      router.push("/purchase-invoices");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save template"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <BillingPageShell>
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#45464d]">
            <Link href="/billing" className="hover:text-[#000000]">
              Billing
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/purchase-invoices" className="hover:text-[#000000]">
              Invoice Templates
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#000000]">Create Template</span>
          </nav>
          <h1 className="text-xl font-semibold text-[#000000]">Create New Invoice Template</h1>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="custom-scrollbar flex max-h-[calc(100vh-180px)] flex-col gap-4 overflow-y-auto pr-1 lg:col-span-5">
            <Panel step={1} title="Basic Info" active>
              <div className="space-y-3">
                <div className="space-y-1">
                  <CapsLabel>Template Name</CapsLabel>
                  <input
                    className={inputClass}
                    placeholder="e.g. GST Professional 2026"
                    {...form.register("template_name")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <CapsLabel>Type</CapsLabel>
                    {isPresetFlow ? (
                      <div className="rounded-lg bg-[#f2f4f6] p-2.5 text-sm font-medium text-[#191c1e]">
                        {TEMPLATE_TYPE_LABELS[initialType]}
                      </div>
                    ) : (
                      <select className={inputClass} {...form.register("template_type")}>
                        {TEMPLATE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {TEMPLATE_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CapsLabel>Set as Default</CapsLabel>
                    <div className="mt-2 flex items-center gap-2">
                      <ToggleSwitch
                        checked={values.status === "active"}
                        onChange={(checked) =>
                          form.setValue("status", checked ? "active" : "inactive", {
                            shouldDirty: true
                          })
                        }
                      />
                      <span className="text-xs text-[#45464d]">Active</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <CapsLabel>Company Name</CapsLabel>
                  <input className={inputClass} {...form.register("company_name")} />
                </div>
                <div className="space-y-1">
                  <CapsLabel>Company Address</CapsLabel>
                  <textarea
                    className={cn(inputClass, "resize-none")}
                    rows={2}
                    {...form.register("company_address")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <CapsLabel>GSTIN</CapsLabel>
                    <input className={inputClass} {...form.register("gstin")} />
                  </div>
                  <div className="space-y-1">
                    <CapsLabel>Invoice Prefix</CapsLabel>
                    <input
                      className={inputClass}
                      value={String(templateJson.invoice_prefix ?? "")}
                      onChange={(e) => updateJson({ invoice_prefix: e.target.value.toUpperCase() })}
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <CapsLabel>Description</CapsLabel>
                  <textarea
                    className={cn(inputClass, "resize-none")}
                    rows={2}
                    placeholder="Briefly describe this template's use case..."
                    value={String(templateJson.description ?? "")}
                    onChange={(e) => updateJson({ description: e.target.value })}
                  />
                </div>
              </div>
            </Panel>

            <Panel step={2} title="Theme Design">
              <div className="space-y-4">
                <div className="space-y-2">
                  <CapsLabel>Presets</CapsLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => updateTheme({ preset: preset.id })}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition",
                          theme.preset === preset.id
                            ? "border-[#8a4cfc] bg-[#e6e8ea]"
                            : "border-[#c6c6cd] hover:border-[#712ae2]"
                        )}
                      >
                        <div className={cn("h-8 w-full rounded shadow-sm", preset.swatch)} />
                        <span className="text-[10px] font-semibold">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "primary_color", label: "Primary", fallback: "#000000" },
                    { key: "secondary_color", label: "Secondary", fallback: "#712AE2" },
                    { key: "accent_color", label: "Accent", fallback: "#4CD7F6" }
                  ].map((color) => (
                    <div key={color.key} className="space-y-1">
                      <CapsLabel>{color.label}</CapsLabel>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme[color.key] ?? color.fallback}
                          onChange={(e) => updateTheme({ [color.key]: e.target.value })}
                          className="h-8 w-8 cursor-pointer rounded border border-[#c6c6cd]"
                        />
                        <span className="font-mono text-[10px]">
                          {(theme[color.key] ?? color.fallback).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel step={3} title="Section Toggles">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "company_logo", label: "Company Logo", formKey: null },
                  { key: "client_address", label: "Client Address", formKey: null },
                  { key: "hsn_sac", label: "HSN/SAC Code", formKey: null },
                  { key: "tax_amount", label: "Tax Amount", formKey: null },
                  { key: "show_qr", label: "QR Code Payment", formKey: "show_qr" as const },
                  { key: "show_signature", label: "Authorized Signatory", formKey: "show_signature" as const }
                ].map((item) => {
                  const checked =
                    item.formKey != null
                      ? Boolean(values[item.formKey])
                      : sections[item.key] !== false;
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#191c1e]">{item.label}</span>
                      <ToggleSwitch
                        checked={checked}
                        onChange={(next) => {
                          if (item.formKey) {
                            form.setValue(item.formKey, next, { shouldDirty: true });
                          } else {
                            updateSection(item.key, next);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel step={4} title="Tax & Totals">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-[#f2f4f6] p-3">
                  <div>
                    <p className="text-xs font-bold">GST Summary</p>
                    <p className="text-[10px] text-[#45464d]">Breakdown CGST / SGST / IGST</p>
                  </div>
                  <ToggleSwitch
                    checked={sections.gst_summary !== false}
                    onChange={(next) => updateSection("gst_summary", next)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "subtotal", label: "Subtotal" },
                    { key: "round_off", label: "Round Off" },
                    { key: "received_amount", label: "Received Amount" },
                    { key: "balance_due", label: "Balance Due" }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={sections[item.key] !== false}
                        onChange={(e) => updateSection(item.key, e.target.checked)}
                        className="rounded border-[#c6c6cd] text-[#712ae2] focus:ring-[#712ae2]"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel step={5} title="Payment & Footer">
              <div className="space-y-3">
                <div className="space-y-1">
                  <CapsLabel>Bank Details</CapsLabel>
                  <input
                    className={inputClass}
                    placeholder="HDFC Bank - 5010041..."
                    value={String(templateJson.bank_details ?? "")}
                    onChange={(e) => updateJson({ bank_details: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <CapsLabel>Terms & Conditions</CapsLabel>
                  <textarea
                    className={cn(inputClass, "resize-none")}
                    rows={3}
                    {...form.register("terms_conditions")}
                  />
                </div>
                <div className="space-y-1">
                  <CapsLabel>Footer Message</CapsLabel>
                  <input className={inputClass} {...form.register("footer_text")} />
                </div>
              </div>
            </Panel>

            <Panel step={6} title="Item Table Design">
              <div className="space-y-3">
                <input
                  className={inputClass}
                  placeholder="Search columns..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                />
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {filteredColumns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between rounded-lg border border-[#c6c6cd]/40 bg-[#f2f4f6]/50 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-[#76777d]" />
                        <span className="text-xs font-medium">{col.label}</span>
                      </div>
                      <ToggleSwitch
                        checked={col.enabled}
                        onChange={(next) => updateColumn(col.id, next)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </section>

          <section className="lg:col-span-7 lg:sticky lg:top-20">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#45464d]">
                <Eye className="h-3.5 w-3.5 text-[#712ae2]" />
                Live AI Preview
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => (z >= 1 ? 0.85 : z + 0.05))}
                  className="rounded bg-[#e6e8ea] px-2 py-1 text-[10px] hover:bg-[#e0e3e5]"
                >
                  Zoom: {Math.round(zoom * 100)}%
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-[#eceef0] p-4">
              <CreateTemplateLivePreview values={values} zoom={zoom} />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => void saveTemplate(false)}
                className="rounded-lg bg-[#e6e8ea] px-5 py-2 text-xs font-bold text-[#191c1e] transition hover:bg-[#e0e3e5] disabled:opacity-50"
              >
                {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Draft"}
              </button>
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => void form.handleSubmit(() => saveTemplate(true))()}
                className="flex items-center gap-1.5 rounded-lg bg-[#000000] px-6 py-2 text-xs font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
              >
                {saving === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Publish Template
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e0e3e5;
          border-radius: 10px;
        }
      `}</style>
    </BillingPageShell>
  );
}

export function CreateTemplatePage() {
  return <CreateTemplateForm />;
}
