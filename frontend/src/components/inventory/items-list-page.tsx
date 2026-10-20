"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Plus,
  Search
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn, formatCurrency } from "@/lib/utils";
import { listItems } from "@/services/inventory-service";
import type { InventoryItem, ItemStatus } from "@/types/item";

const PAGE_SIZE = 10;

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

function matchesSearch(item: InventoryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    item.item_name,
    item.item_code,
    item.sku,
    item.category,
    item.brand,
    item.hsn_code
  ];
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

function matchesStockFilter(item: InventoryItem, filter: StockFilter): boolean {
  if (filter === "all") return true;
  if (filter === "out_of_stock") return item.current_stock === 0;
  if (filter === "low_stock") {
    return item.current_stock > 0 && item.current_stock <= item.minimum_stock;
  }
  return item.current_stock > item.minimum_stock;
}

export function ItemsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listItems();
      setItems(data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to load items"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [items]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const brand = item.brand?.trim();
      if (brand) set.add(brand);
    });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSearch(item, search)) return false;
      if (categoryFilter && (item.category ?? "") !== categoryFilter) return false;
      if (brandFilter && (item.brand ?? "") !== brandFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (!matchesStockFilter(item, stockFilter)) return false;
      return true;
    });
  }, [items, search, categoryFilter, brandFilter, statusFilter, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setBrandFilter("");
    setStatusFilter("");
    setStockFilter("all");
    setPage(1);
  };

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <BillingPageShell>
      <main className="mx-auto max-w-[1440px] space-y-6 p-4 md:p-6 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/inventory"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#712ae2] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#000000] md:text-[32px]">All Items</h1>
            <p className="mt-1 text-sm text-[#45464d] md:text-base">
              Browse, search, and filter your product catalog.
            </p>
          </div>
          <Button
            asChild
            className="h-10 gap-2 rounded-xl bg-[#712ae2] px-5 font-bold uppercase tracking-wide shadow-lg shadow-[#712ae2]/20 hover:bg-[#712ae2]/90"
          >
            <Link href="/inventory/create-item">
              <Plus className="h-4 w-4" />
              Add Item
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#76777d]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, code, SKU, category, or brand..."
              className="w-full rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#712ae2] focus:ring-2 focus:ring-[#712ae2]/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="">Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="">Brand</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending_review">Pending Review</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as StockFilter);
                setPage(1);
              }}
              className="cursor-pointer rounded-xl border border-[#c6c6cd] bg-[#f2f4f6] px-4 py-2.5 text-sm font-medium outline-none focus:border-[#712ae2]"
            >
              <option value="all">Stock Level</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#712ae2] transition hover:bg-[#712ae2]/10"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e2e8f0]/80 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {["Name", "Code", "Category", "Stock", "Min", "Status", "Price"].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#45464d]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#712ae2]" />
                    </td>
                  </tr>
                ) : filtered.length === 0 && items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Package className="mx-auto mb-4 h-12 w-12 text-[#c6c6cd]" />
                      <p className="text-base font-semibold text-[#191c1e]">No inventory items yet</p>
                      <p className="mt-2 text-sm text-[#45464d]">
                        Create your first SKU to start managing stock.
                      </p>
                      <Link
                        href="/inventory/create-item"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#712ae2] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#712ae2]/20 hover:bg-[#712ae2]/90"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Link>
                    </td>
                  </tr>
                ) : pageSlice.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#45464d]">
                      No items match your search or filters.{" "}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="font-semibold text-[#712ae2] hover:underline"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((item) => (
                    <tr key={item.id} className="group transition-colors hover:bg-[#fafbfc]">
                      <td className="px-6 py-4 font-semibold text-[#191c1e]">{item.item_name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-[#45464d]">{item.item_code}</td>
                      <td className="px-6 py-4 text-sm text-[#191c1e]">{item.category ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "font-semibold",
                            item.current_stock === 0 && "text-[#ba1a1a]",
                            item.current_stock > 0 &&
                              item.current_stock <= item.minimum_stock &&
                              "text-[#F59E0B]"
                          )}
                        >
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#45464d]">{item.minimum_stock}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#191c1e]">
                        {formatCurrency(Number(item.selling_price))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e0e3e5] bg-[#f2f4f6] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[#45464d]">
              Showing <span className="font-bold text-[#191c1e]">{rangeStart}-{rangeEnd}</span> of{" "}
              <span className="font-bold text-[#191c1e]">{filtered.length}</span> items
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg p-2 text-[#45464d] transition hover:bg-[#e0e3e5]/50 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition",
                    n === currentPage
                      ? "bg-[#712ae2] text-white"
                      : "text-[#191c1e] hover:bg-[#e0e3e5]/50"
                  )}
                >
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="px-1 text-[#45464d]">...</span>}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg p-2 text-[#45464d] transition hover:bg-[#e0e3e5]/50 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </BillingPageShell>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const active = status === "active";
  const pending = status === "pending_review";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
        active && "bg-cyan-100 text-cyan-800",
        pending && "bg-[#fff3e0] text-[#e65100]",
        !active && !pending && "bg-[#e6e8ea] text-[#45464d]"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active && "bg-cyan-500",
          pending && "bg-[#e65100]",
          !active && !pending && "bg-[#76777d]"
        )}
      />
      {status.replace("_", " ")}
    </span>
  );
}
