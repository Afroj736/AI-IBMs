"use client";

import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Loader2,
  Mic,
  Package,
  PenLine,
  Receipt,
  ShoppingCart,
  Store,
  Users,
  Warehouse
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { StatusBadge } from "@/components/billing/status-badge";
import { formatUserRole } from "@/lib/user-display";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { hasPersistedSession } from "@/services/auth-service";
import { fetchInvoices } from "@/services/billing-service";
import { listItems } from "@/services/inventory-service";
import { listParties } from "@/services/party-service";
import { useAuthStore } from "@/store/auth-store";
import { useBillingStore } from "@/store/billing-store";
import type { BillingInvoice } from "@/types/billing";
import type { InventoryItem } from "@/types/item";

function computeInventoryStats(items: InventoryItem[]) {
  const active = items.filter((i) => i.status === "active");
  const lowStockItems = active.filter(
    (i) => i.current_stock > 0 && i.current_stock <= i.minimum_stock
  );
  const outOfStock = active.filter((i) => i.current_stock === 0).length;
  const inventoryValue = items.reduce(
    (sum, i) => sum + Number(i.selling_price) * Number(i.current_stock),
    0
  );
  return {
    totalItems: items.length,
    lowStock: lowStockItems.length,
    outOfStock,
    inventoryValue,
    lowStockItems: lowStockItems.slice(0, 5)
  };
}

function computeBillingStats(invoices: BillingInvoice[]) {
  const real = invoices.filter((inv) => !inv.is_sample);
  const source = real.length > 0 ? real : invoices;
  const overdue = source.filter((inv) => inv.status === "overdue").length;
  const pendingAmount = source
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + Number(inv.totals?.balance_amount ?? inv.amount), 0);
  const paidAmount = source
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  return {
    invoiceCount: source.length,
    overdue,
    pendingAmount,
    paidAmount,
    recent: [...source]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
  };
}

const QUICK_ACTIONS = [
  {
    title: "Retail bill",
    description: "Create a walk-in sale",
    href: "/billing/create?type=retail",
    icon: Store,
    tone: "bg-[#EEF4FF] text-[#2563EB]"
  },
  {
    title: "GST invoice",
    description: "Tax invoice with GST",
    href: "/billing/create?type=gst",
    icon: Receipt,
    tone: "bg-[#ECFDF5] text-[#059669]"
  },
  {
    title: "Voice bill",
    description: "Dictate items to bill",
    href: null,
    voice: true,
    icon: Mic,
    tone: "bg-[#F5F3FF] text-[#7C3AED]"
  },
  {
    title: "All invoices",
    description: "Billing workspace",
    href: "/billing",
    icon: FileText,
    tone: "bg-[#F8FAFC] text-[#334155]"
  },
  {
    title: "Inventory",
    description: "Stock & catalog",
    href: "/inventory",
    icon: Warehouse,
    tone: "bg-[#FFF7ED] text-[#EA580C]"
  },
  {
    title: "Parties",
    description: "Customers & suppliers",
    href: "/customers",
    icon: Users,
    tone: "bg-[#FDF2F8] text-[#DB2777]"
  },
  {
    title: "Add item",
    description: "New inventory SKU",
    href: "/inventory/create-item",
    icon: Package,
    tone: "bg-[#F0F9FF] text-[#0284C7]"
  },
  {
    title: "Purchase",
    description: "Purchase invoices",
    href: "/purchase-invoices",
    icon: ShoppingCart,
    tone: "bg-[#FEFCE8] text-[#CA8A04]"
  }
] as const;

export function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setVoiceModalOpen = useBillingStore((s) => s.setVoiceModalOpen);
  const [sessionReady, setSessionReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ok = hasPersistedSession();
    setAuthed(ok);
    setSessionReady(true);
    if (!ok) {
      router.replace("/login");
    }
  }, [router]);

  const invoicesQuery = useQuery({
    queryKey: ["home", "invoices"],
    queryFn: () => fetchInvoices({ status: "all" }),
    enabled: sessionReady && authed,
    retry: false
  });

  const itemsQuery = useQuery({
    queryKey: ["home", "items"],
    queryFn: listItems,
    enabled: sessionReady && authed,
    retry: false
  });

  const partiesQuery = useQuery({
    queryKey: ["home", "parties"],
    queryFn: () => listParties(),
    enabled: sessionReady && authed,
    retry: false
  });

  useEffect(() => {
    const err = invoicesQuery.error ?? itemsQuery.error ?? partiesQuery.error;
    if (err && axios.isAxiosError(err) && err.response?.status === 401) {
      router.replace("/login");
    }
  }, [invoicesQuery.error, itemsQuery.error, partiesQuery.error, router]);

  const inventoryStats = useMemo(
    () => computeInventoryStats(itemsQuery.data ?? []),
    [itemsQuery.data]
  );
  const billingStats = useMemo(
    () => computeBillingStats(invoicesQuery.data ?? []),
    [invoicesQuery.data]
  );

  const loading = invoicesQuery.isLoading || itemsQuery.isLoading || partiesQuery.isLoading;
  const companyName = user?.company?.business_name;
  const greetingName = user?.name?.split(" ")[0] ?? "there";

  const kpiCards = [
    {
      label: "Inventory value",
      value: formatCurrency(inventoryStats.inventoryValue),
      hint: `${inventoryStats.totalItems} items`,
      accent: "text-[#111827]"
    },
    {
      label: "Low stock",
      value: String(inventoryStats.lowStock),
      hint: "SKUs at or below min",
      accent: "text-[#D97706]"
    },
    {
      label: "Out of stock",
      value: String(inventoryStats.outOfStock),
      hint: "Need restock",
      accent: "text-[#DC2626]"
    },
    {
      label: "Invoices",
      value: String(billingStats.invoiceCount),
      hint: `${billingStats.overdue} overdue`,
      accent: "text-[#2563EB]"
    },
    {
      label: "Outstanding",
      value: formatCurrency(billingStats.pendingAmount),
      hint: "Unpaid balance",
      accent: "text-[#7C3AED]"
    },
    {
      label: "Parties",
      value: String(partiesQuery.data?.length ?? 0),
      hint: "Customers & suppliers",
      accent: "text-[#059669]"
    }
  ];

  if (!sessionReady || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <BillingPageShell>
      <main className="mx-auto max-w-[1440px] space-y-8 p-4 pb-28 md:p-6 md:px-10">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-[#6B7280]">
              {companyName ? companyName : "SmartBill AI"}
              {user?.role ? ` · ${formatUserRole(user.role)}` : null}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] md:text-[32px]">
              Welcome back, {greetingName}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[#6B7280]">
              Your home for billing, inventory, and parties — start a bill or review what needs
              attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
            >
              <Mic className="h-4 w-4" />
              Voice bill
            </button>
            <Link
              href="/billing/create?type=retail"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:bg-[#F9FAFB]"
            >
              <PenLine className="h-4 w-4" />
              Manual bill
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Overview
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {kpiCards.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <p className="text-xs font-medium text-[#6B7280]">{kpi.label}</p>
                    <p className={cn("mt-2 truncate text-xl font-bold md:text-2xl", kpi.accent)}>
                      {kpi.value}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#9CA3AF]">{kpi.hint}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Quick actions
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const className =
                    "group flex flex-col items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left transition hover:border-[#2563EB]/35 hover:bg-[#F8FAFF]";
                  const body = (
                    <>
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          action.tone
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#111827]">{action.title}</p>
                        <p className="mt-0.5 text-xs text-[#6B7280]">{action.description}</p>
                      </div>
                    </>
                  );
                  if ("voice" in action && action.voice) {
                    return (
                      <button
                        key={action.title}
                        type="button"
                        className={className}
                        onClick={() => setVoiceModalOpen(true)}
                      >
                        {body}
                      </button>
                    );
                  }
                  return (
                    <Link key={action.title} href={action.href!} className={className}>
                      {body}
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Recent invoices
                  </h2>
                  <Link
                    href="/billing"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] hover:underline"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                  {billingStats.recent.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <FileText className="mx-auto h-8 w-8 text-[#9CA3AF]" />
                      <p className="mt-3 text-sm font-semibold text-[#111827]">No invoices yet</p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        Create a retail or GST bill to get started.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#E5E7EB]">
                      {billingStats.recent.map((invoice) => (
                        <li key={invoice.id}>
                          <Link
                            href={`/billing?selected=${invoice.id}`}
                            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#F9FAFB]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#111827]">
                                {invoice.customer_name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                                {invoice.invoice_number} · {formatDate(invoice.invoice_date)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <p className="text-sm font-bold text-[#111827]">
                                {formatCurrency(invoice.amount)}
                              </p>
                              <StatusBadge status={invoice.status} />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Stock attention
                  </h2>
                  <Link
                    href="/inventory"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] hover:underline"
                  >
                    Inventory
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  {inventoryStats.lowStockItems.length === 0 && inventoryStats.outOfStock === 0 ? (
                    <div className="py-8 text-center">
                      <Package className="mx-auto h-8 w-8 text-[#10B981]" />
                      <p className="mt-3 text-sm font-semibold text-[#111827]">Stock looks healthy</p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        No active SKUs are below minimum levels.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {inventoryStats.outOfStock > 0 && (
                        <li className="flex items-start gap-3 rounded-xl bg-[#FEF2F2] px-3 py-2.5">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                          <div>
                            <p className="text-sm font-semibold text-[#991B1B]">
                              {inventoryStats.outOfStock} out of stock
                            </p>
                            <p className="text-xs text-[#B91C1C]">Restock these SKUs soon.</p>
                          </div>
                        </li>
                      )}
                      {inventoryStats.lowStockItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] pb-3 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#111827]">
                              {item.item_name}
                            </p>
                            <p className="text-xs text-[#6B7280]">
                              {item.item_code} · min {item.minimum_stock}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-[#FFFBEB] px-2 py-1 text-xs font-bold text-[#D97706]">
                            {item.current_stock} left
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </BillingPageShell>
  );
}
