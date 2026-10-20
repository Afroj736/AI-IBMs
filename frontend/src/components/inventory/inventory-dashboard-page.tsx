"use client";

import {
  ArrowRight,
  Box,
  FolderKanban,
  Loader2,
  Shapes,
  Sparkles,
  Warehouse
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn, formatCurrency } from "@/lib/utils";
import { listItems } from "@/services/inventory-service";
import type { InventoryItem } from "@/types/item";

function brandInitial(brand: string): string {
  return (brand.trim()[0] ?? "?").toUpperCase();
}

function computeStats(items: InventoryItem[]) {
  const active = items.filter((i) => i.status === "active");
  const lowStock = active.filter(
    (i) => i.current_stock > 0 && i.current_stock <= i.minimum_stock
  ).length;
  const outOfStock = active.filter((i) => i.current_stock === 0).length;

  const categoryMap = new Map<string, number>();
  for (const item of items) {
    const cat = item.category?.trim() || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  const total = items.length || 1;
  const categories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], i) => ({
      name,
      percent: Math.round((count / total) * 100),
      color: ["bg-[#712ae2]", "bg-[#0090a9]", "bg-[#565e74]", "bg-[#8a4cfc]", "bg-[#c6c6cd]"][i] ?? "bg-[#c6c6cd]"
    }));

  const brandMap = new Map<string, number>();
  for (const item of items) {
    const brand = item.brand?.trim() || "Unbranded";
    brandMap.set(brand, (brandMap.get(brand) ?? 0) + 1);
  }
  const brands = [...brandMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const inventoryValue = items.reduce(
    (sum, i) => sum + Number(i.selling_price) * i.current_stock,
    0
  );

  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    return d.toDateString();
  });
  const movement = last7Days.map((day) =>
    items.filter((i) => new Date(i.created_at).toDateString() === day).length
  );
  const maxMove = Math.max(...movement, 1);

  const lowStockItems = active
    .filter((i) => i.current_stock <= i.minimum_stock)
    .slice(0, 8);

  return { lowStock, outOfStock, categories, brands, inventoryValue, movement, maxMove, lowStockItems };
}

export function InventoryDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listItems();
      setItems(data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to load inventory"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => computeStats(items), [items]);

  const quickActions = [
    {
      title: "Add Item",
      desc: "Create a new SKU or product entry",
      href: "/inventory/create-item",
      icon: Box,
      iconClass: "bg-[#131b2e] text-white"
    },
    {
      title: "Add Category",
      desc: "Organize items into logical groups",
      href: "/inventory/catalog?focus=category",
      icon: Shapes,
      iconClass: "bg-[#e6e8ea] text-[#45464d]"
    },
    {
      title: "Add Brand",
      desc: "Register a new supplier or manufacturer",
      href: "/inventory/catalog?focus=brand",
      icon: FolderKanban,
      iconClass: "bg-[#e6e8ea] text-[#45464d]"
    },
    {
      title: "Stock Adjustment",
      desc: "Manual count or damage correction",
      onClick: () => toast.info("Stock adjustment coming soon."),
      icon: Warehouse,
      iconClass: "bg-[#eaddff] text-[#5a00c6]"
    }
  ];

  if (loading) {
    return (
      <BillingPageShell>
        <main
          className="flex items-center justify-center p-4 md:p-6"
          style={{ minHeight: "calc(100vh - 72px)" }}
        >
          <Loader2 className="h-10 w-10 animate-spin text-[#2563EB]" />
        </main>
      </BillingPageShell>
    );
  }

  return (
    <BillingPageShell>
      <main className="mx-auto max-w-[1440px] space-y-12 p-4 md:p-6 md:px-10">
        <section>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#000000] md:text-[32px]">Quick Actions</h1>
              <p className="text-sm text-[#45464d]">Manage your inventory core entities efficiently.</p>
            </div>
            <Link
              href="/inventory/items"
              className="flex items-center gap-2 text-base font-semibold text-[#712ae2] hover:underline"
            >
              View All Items
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const inner = (
                <>
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", action.iconClass)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="block text-lg font-semibold">{action.title}</span>
                    <p className="text-sm text-[#45464d]">{action.desc}</p>
                  </div>
                </>
              );
              const className =
                "flex flex-col items-start gap-4 rounded-xl border border-[#c6c6cd] bg-white p-6 text-left transition hover:scale-[1.02] active:scale-[0.98]";
              if (action.href) {
                return (
                  <Link key={action.title} href={action.href} className={className}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button key={action.title} type="button" onClick={action.onClick} className={className}>
                  {inner}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#c6c6cd] bg-white p-4">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                  Low Stock
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#F59E0B] md:text-4xl">{stats.lowStock}</span>
                  <span className="text-sm text-[#45464d]">SKUs</span>
                </div>
              </div>
              <div className="rounded-xl border border-[#c6c6cd] bg-white p-4">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                  Out of Stock
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#ba1a1a] md:text-4xl">{stats.outOfStock}</span>
                  <span className="text-sm text-[#45464d]">SKUs</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#c6c6cd]/50 border-l-4 border-l-[#712ae2] bg-white/80 p-6 shadow-[0_0_20px_rgba(124,58,237,0.1)] backdrop-blur-md">
              <Sparkles className="absolute right-4 top-4 h-16 w-16 text-[#712ae2]/10" />
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#712ae2]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#712ae2]">
                  AI Recommendation
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Restock High-Demand Items</h3>
              {stats.lowStockItems.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-[#45464d]">
                    {stats.lowStockItems.length} item{stats.lowStockItems.length === 1 ? "" : "s"} at or below minimum
                    stock. Review and reorder soon.
                  </p>
                  <ul className="mb-4 space-y-1 text-sm text-[#191c1e]">
                    {stats.lowStockItems.slice(0, 4).map((i) => (
                      <li key={i.id}>
                        <strong>{i.item_name}</strong> — {i.current_stock} left (min {i.minimum_stock})
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mb-6 text-sm text-[#45464d]">
                  All active SKUs are above minimum stock levels. Great job keeping inventory healthy.
                </p>
              )}
              <button
                type="button"
                className="rounded-lg bg-[#712ae2] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                onClick={() => toast.info("Purchase order generation coming soon.")}
              >
                Generate PO
              </button>
            </div>

            <div className="rounded-xl border border-[#c6c6cd] bg-white p-6">
              <h3 className="mb-6 text-lg font-semibold">Category Distribution</h3>
              {stats.categories.length === 0 ? (
                <p className="text-sm text-[#45464d]">No categories yet. Add items with a category field.</p>
              ) : (
                <div className="space-y-4">
                  {stats.categories.map((cat) => (
                    <div key={cat.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{cat.name}</span>
                        <span className="font-bold">{cat.percent}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                        <div className={cn("h-full rounded-full", cat.color)} style={{ width: `${cat.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 space-y-6 lg:col-span-8">
            <div className="flex min-h-[320px] flex-col rounded-xl border border-[#c6c6cd] bg-white p-6">
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-semibold">Stock Movement Trends</h3>
                  <p className="text-sm text-[#45464d]">New items added (last 7 days)</p>
                </div>
                <select className="rounded-lg border border-[#c6c6cd] bg-[#f7f9fb] px-3 py-1 text-sm text-[#45464d] outline-none focus:ring-2 focus:ring-[#712ae2]/20">
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div className="flex flex-grow items-end justify-between gap-2 px-4 pb-2">
                {stats.movement.map((count, i) => {
                  const height = Math.max(12, (count / stats.maxMove) * 100);
                  const highlight = count === Math.max(...stats.movement) && count > 0;
                  return (
                    <div
                      key={i}
                      className="relative w-full rounded-t-sm bg-[#eceef0]"
                      style={{ height: `${height}%`, minHeight: "2.5rem" }}
                    >
                      <div
                        className={cn(
                          "absolute inset-0 rounded-t-sm transition-colors",
                          highlight ? "bg-[#712ae2]" : "bg-[#712ae2]/10 hover:bg-[#712ae2]/20"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#c6c6cd] bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Brand Overview</h3>
                <p className="text-sm text-[#45464d]">
                  Value: <span className="font-bold text-[#191c1e]">{formatCurrency(stats.inventoryValue)}</span>
                </p>
              </div>
              {stats.brands.length === 0 ? (
                <p className="text-sm text-[#45464d]">No brands yet. Set brand on items when you add them.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {stats.brands.map((b, i) => (
                    <div
                      key={b.name}
                      className="flex cursor-pointer items-center gap-4 rounded-lg border border-transparent p-3 transition hover:border-[#c6c6cd]/30 hover:bg-[#f2f4f6]"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-[#f7f9fb] p-2 text-lg font-bold text-[#712ae2]">
                        {brandInitial(b.name)}
                      </div>
                      <div>
                        <span className="block font-bold text-[#191c1e]">{b.name}</span>
                        <span className="text-sm text-[#45464d]">{b.count} Items</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

      </main>
    </BillingPageShell>
  );
}
