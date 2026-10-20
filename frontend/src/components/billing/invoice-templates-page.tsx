"use client";

import {
  Brush,
  ChevronRight,
  Copy,
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Verified
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { TemplatePreviewThumbnail } from "@/components/billing/template-preview-thumbnail";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  activateTemplate,
  deleteTemplate,
  duplicateTemplate,
  listTemplates
} from "@/services/template-service";
import type { InvoiceTemplate, TemplateType } from "@/types/invoice-template";

const TYPE_LABELS: Record<TemplateType, string> = {
  tax_invoice: "GST",
  retail_gst_invoice: "Retail",
  purchase_invoice: "Purchase",
  mobile_store_invoice: "Custom",
  electronics_store_invoice: "Custom"
};

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

type TemplateCardProps = {
  template: InvoiceTemplate;
  isDefault: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onDuplicate: (template: InvoiceTemplate) => void;
  onDelete: (template: InvoiceTemplate) => void;
  onActivate: (template: InvoiceTemplate) => void;
  actionLoading: string | null;
};

function TemplateCard({
  template,
  isDefault,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onDuplicate,
  onDelete,
  onActivate,
  actionLoading
}: TemplateCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const typeLabel = TYPE_LABELS[template.template_type];

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onCloseMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, onCloseMenu]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-[#c6c6cd] bg-white transition-all duration-300 hover:shadow-md">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#eceef0] p-1">
        <div className="h-full w-full overflow-hidden rounded border border-[#e0e3e5] shadow-sm transition-transform duration-500 group-hover:scale-[1.02]">
          <TemplatePreviewThumbnail template={template} />
        </div>
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          {isDefault && (
            <span className="rounded-full bg-[#712ae2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              Default
            </span>
          )}
          <span className="rounded-full border border-[#c6c6cd] bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#191c1e] shadow-sm backdrop-blur-md">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="relative p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[#000000]">{template.template_name}</h3>
            <p className="text-xs text-[#45464d]">Updated {formatRelativeTime(template.updated_at)}</p>
          </div>
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleMenu}
              className="rounded-md p-1 transition-colors hover:bg-[#eceef0]"
              aria-label="Template actions"
            >
              <MoreVertical className="h-4 w-4 text-[#45464d]" />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-lg border border-[#e2e8f0]/80 bg-white/90 p-1 shadow-xl backdrop-blur-md">
                <Link
                  href={`/purchase-invoices/templates/${template.id}`}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs hover:bg-[#000000]/5"
                  onClick={onCloseMenu}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs hover:bg-[#000000]/5"
                  onClick={() => {
                    onCloseMenu();
                    toast.info("Template editor coming soon.");
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={actionLoading === template.id}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs hover:bg-[#000000]/5 disabled:opacity-50"
                  onClick={() => {
                    onCloseMenu();
                    onDuplicate(template);
                  }}
                >
                  {actionLoading === template.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Duplicate
                </button>
                {!isDefault && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs hover:bg-[#000000]/5"
                    onClick={() => {
                      onCloseMenu();
                      onActivate(template);
                    }}
                  >
                    <Verified className="h-3.5 w-3.5" />
                    Set as Default
                  </button>
                )}
                <hr className="my-0.5 border-[#c6c6cd]" />
                <button
                  type="button"
                  disabled={actionLoading === template.id}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/30 disabled:opacity-50"
                  onClick={() => {
                    onCloseMenu();
                    onDelete(template);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to load invoice templates"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter(
      (template) =>
        template.template_name.toLowerCase().includes(query) ||
        template.company_name.toLowerCase().includes(query) ||
        TYPE_LABELS[template.template_type].toLowerCase().includes(query)
    );
  }, [search, templates]);

  const defaultTemplateId = useMemo(
    () => templates.find((template) => template.status === "active")?.id ?? null,
    [templates]
  );

  const handleDuplicate = async (template: InvoiceTemplate) => {
    setActionLoading(template.id);
    try {
      const duplicated = await duplicateTemplate(template.id);
      setTemplates((prev) => [duplicated, ...prev]);
      toast.success(`Duplicated "${template.template_name}"`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to duplicate template"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (template: InvoiceTemplate) => {
    if (!window.confirm(`Delete template "${template.template_name}"?`)) return;
    setActionLoading(template.id);
    try {
      await deleteTemplate(template.id);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      toast.success(`Deleted "${template.template_name}"`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete template"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (template: InvoiceTemplate) => {
    setActionLoading(template.id);
    try {
      const activated = await activateTemplate(template.id);
      setTemplates((prev) =>
        prev.map((item) => ({
          ...item,
          status: item.id === activated.id ? "active" : "inactive"
        }))
      );
      toast.success(`"${template.template_name}" set as default`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to set default template"));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <BillingPageShell>
        <main
          className="flex items-center justify-center p-4 md:p-6"
          style={{ minHeight: "calc(100vh - 72px)" }}
        >
          <Loader2 className="h-10 w-10 animate-spin text-[#712ae2]" />
        </main>
      </BillingPageShell>
    );
  }

  return (
    <BillingPageShell>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-6">
        <nav className="mb-3 flex items-center gap-1.5">
          <Link href="/billing" className="text-[10px] font-semibold uppercase tracking-wider text-[#45464d] hover:text-[#000000]">
            Billing
          </Link>
          <ChevronRight className="h-3 w-3 text-[#76777d]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#000000]">Invoice Templates</span>
        </nav>

        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#000000]">Invoice Templates</h1>
            <p className="max-w-2xl text-xs text-[#45464d]">
              Create and manage invoice designs for GST, Retail, Purchase and Custom invoices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/purchase-invoices/create-template?type=tax_invoice"
              className="flex items-center gap-1.5 rounded-lg border border-[#c6c6cd] bg-white px-3 py-1.5 text-xs font-semibold text-[#000000] transition-all hover:bg-[#eceef0]"
            >
              <Plus className="h-3.5 w-3.5" />
              New GST Template
            </Link>
            <Link
              href="/purchase-invoices/create-template?type=retail_gst_invoice"
              className="flex items-center gap-1.5 rounded-lg bg-[#000000] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New Retail Template
            </Link>
          </div>
        </div>

        <div className="mb-4 hidden max-w-xs lg:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#45464d]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border-none bg-[#eceef0] py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-[#8a4cfc]"
              placeholder="Search templates..."
              type="text"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-[#c6c6cd] bg-white/80 p-6 text-center backdrop-blur-md">
              <h3 className="text-sm font-semibold text-[#000000]">No templates yet</h3>
              <p className="mt-1 text-xs text-[#45464d]">
                {search ? "No templates match your search." : "Create your first GST or Retail invoice template."}
              </p>
              {!search && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/purchase-invoices/create-template?type=tax_invoice"
                    className="rounded-lg border border-[#c6c6cd] px-3 py-1.5 text-xs font-semibold hover:bg-[#eceef0]"
                  >
                    New GST Template
                  </Link>
                  <Link
                    href="/purchase-invoices/create-template?type=retail_gst_invoice"
                    className="rounded-lg bg-[#000000] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    New Retail Template
                  </Link>
                </div>
              )}
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isDefault={template.id === defaultTemplateId}
                menuOpen={openMenuId === template.id}
                onToggleMenu={() =>
                  setOpenMenuId((prev) => (prev === template.id ? null : template.id))
                }
                onCloseMenu={() => setOpenMenuId(null)}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onActivate={handleActivate}
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>

        <section className="mt-6 rounded-lg border border-[#e2e8f0]/80 bg-white/80 p-4 backdrop-blur-md">
          <div className="flex flex-col items-start gap-4 md:flex-row">
            <div className="flex-1">
              <h2 className="mb-3 text-base font-semibold tracking-tight text-[#000000]">Template Guidelines</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="rounded-md bg-[#712ae2]/10 p-1.5">
                    <Verified className="h-4 w-4 text-[#712ae2]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-[#000000]">Compliance Ready</h4>
                    <p className="text-xs text-[#45464d]">
                      All GST templates are pre-configured to meet the latest government filing standards.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="rounded-md bg-[#712ae2]/10 p-1.5">
                    <Brush className="h-4 w-4 text-[#712ae2]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-[#000000]">Brand Customization</h4>
                    <p className="text-xs text-[#45464d]">
                      Upload your high-res logo and select primary brand colors for a consistent look.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full space-y-2 md:w-96 lg:w-[28rem]">
              <div className="rounded-lg bg-[#eceef0] p-3">
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#45464d]">Tips</h4>
                <p className="text-xs leading-relaxed italic text-[#000000]">
                  &quot;Using the &apos;Default&apos; flag ensures all new invoices automatically use your favorite
                  design.&quot;
                </p>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg bg-[#8a4cfc] px-3 py-2 text-white">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#acedff]" />
                <span className="flex-1 whitespace-nowrap text-xs">
                  Let AI design your custom template
                </span>
                <button
                  type="button"
                  onClick={() => toast.info("AI template generation coming soon.")}
                  className="shrink-0 rounded bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#712ae2] transition hover:opacity-90"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-4 w-full border-t border-[#c6c6cd] bg-[#f2f4f6]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-2 px-4 py-3 md:flex-row md:px-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
            © 2024 SmartBill AI. Enterprise Billing Solutions.
          </span>
          <div className="flex flex-wrap justify-center gap-4">
            {["Support", "Documentation", "API Reference", "Terms of Service"].map((link) => (
              <button
                key={link}
                type="button"
                onClick={() => toast.info(`${link} coming soon.`)}
                className="text-xs text-[#45464d] transition-colors hover:text-[#712ae2]"
              >
                {link}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </BillingPageShell>
  );
}
