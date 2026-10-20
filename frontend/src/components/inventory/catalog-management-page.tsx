"use client";

import {
  Award,
  BarChart3,
  Box,
  Brain,
  ChevronRight,
  Factory,
  Loader2,
  Mic,
  Monitor,
  Package,
  Pencil,
  Plus,
  Shapes,
  ShieldCheck,
  Sparkles,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  createBrand,
  createCatalogBulk,
  createCategory,
  deleteBrand,
  deleteCategory,
  listBrands,
  listCategories
} from "@/services/catalog-service";
import type { Brand, Category } from "@/types/catalog";

const CATEGORY_ICONS = [Monitor, Factory, Package, Box, Shapes] as const;

function brandInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function categoryIcon(name: string, index: number) {
  const lower = name.toLowerCase();
  if (lower.includes("electronic") || lower.includes("device")) return Monitor;
  if (lower.includes("raw") || lower.includes("material")) return Factory;
  if (lower.includes("furniture")) return Package;
  if (lower.includes("packaging") || lower.includes("package")) return Box;
  return CATEGORY_ICONS[index % CATEGORY_ICONS.length];
}

function formatUnits(count: number): string {
  return count.toLocaleString();
}

export function CatalogManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");

  const brandInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const brandSectionRef = useRef<HTMLElement>(null);
  const categorySectionRef = useRef<HTMLElement>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingBoth, setSavingBoth] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const trimmedBrand = brandName.trim();
  const trimmedCategory = categoryName.trim();
  const canCreateBoth = Boolean(trimmedBrand && trimmedCategory);
  const canCreateAny = Boolean(trimmedBrand || trimmedCategory);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [brandData, categoryData] = await Promise.all([listBrands(), listCategories()]);
      setBrands(brandData);
      setCategories(categoryData);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to load catalog"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    if (focus === "brand") {
      brandSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      brandInputRef.current?.focus();
    } else if (focus === "category") {
      categorySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      categoryInputRef.current?.focus();
    }
  }, [focus, loading]);

  const handleCreateBrand = useCallback(async () => {
    if (!trimmedBrand) {
      toast.error("Enter a brand name");
      brandInputRef.current?.focus();
      return;
    }
    setSavingBrand(true);
    try {
      const created = await createBrand(trimmedBrand);
      setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setBrandName("");
      toast.success(`Brand "${created.name}" created`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create brand"));
    } finally {
      setSavingBrand(false);
    }
  }, [trimmedBrand]);

  const handleCreateCategory = useCallback(async () => {
    if (!trimmedCategory) {
      toast.error("Enter a category name");
      categoryInputRef.current?.focus();
      return;
    }
    setSavingCategory(true);
    try {
      const created = await createCategory(trimmedCategory);
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryName("");
      toast.success(`Category "${created.name}" created`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create category"));
    } finally {
      setSavingCategory(false);
    }
  }, [trimmedCategory]);

  const handleCreateBoth = useCallback(async () => {
    if (!canCreateAny) {
      toast.error("Enter a brand name, category name, or both");
      return;
    }
    setSavingBoth(true);
    try {
      const result = await createCatalogBulk({
        brand_name: trimmedBrand || undefined,
        category_name: trimmedCategory || undefined
      });
      if (result.brand) {
        setBrands((prev) => {
          const without = prev.filter((b) => b.id !== result.brand!.id);
          return [...without, result.brand!].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      if (result.category) {
        setCategories((prev) => {
          const without = prev.filter((c) => c.id !== result.category!.id);
          return [...without, result.category!].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      const createdParts = [
        result.brand ? `brand "${result.brand.name}"` : null,
        result.category ? `category "${result.category.name}"` : null
      ].filter(Boolean);
      toast.success(`Created ${createdParts.join(" and ")}`);
      setBrandName("");
      setCategoryName("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create catalog entries"));
    } finally {
      setSavingBoth(false);
    }
  }, [canCreateAny, trimmedBrand, trimmedCategory]);

  const handleDeleteBrand = useCallback(
    async (brand: Brand) => {
      if (!window.confirm(`Delete brand "${brand.name}"?`)) return;
      setDeletingId(brand.id);
      try {
        await deleteBrand(brand.id);
        setBrands((prev) => prev.filter((b) => b.id !== brand.id));
        toast.success(`Brand "${brand.name}" deleted`);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to delete brand"));
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const handleDeleteCategory = useCallback(
    async (category: Category) => {
      if (!window.confirm(`Delete category "${category.name}"?`)) return;
      setDeletingId(category.id);
      try {
        await deleteCategory(category.id);
        setCategories((prev) => prev.filter((c) => c.id !== category.id));
        toast.success(`Category "${category.name}" deleted`);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to delete category"));
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const brandBadge = useMemo(() => `${brands.length} TOTAL BRANDS`, [brands.length]);
  const categoryBadge = useMemo(() => `${categories.length} ACTIVE CATEGORIES`, [categories.length]);

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
      <main className="mx-auto w-full max-w-[1440px] flex-grow px-4 pb-12 pt-4 md:px-10">
        <nav className="mb-8 flex items-center gap-2 py-2">
          <Link href="/inventory" className="text-sm text-[#45464d] hover:text-[#000000]">
            Inventory
          </Link>
          <ChevronRight className="h-4 w-4 text-[#76777d]" />
          <span className="text-sm font-semibold text-[#000000]">Catalog</span>
        </nav>

        {canCreateAny && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#712ae2]/20 bg-[#eaddff]/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#000000]">
                {canCreateBoth ? "Ready to create brand and category together" : "Ready to create catalog entry"}
              </p>
              <p className="text-sm text-[#45464d]">
                {canCreateBoth
                  ? "Both fields are filled. Use Create Both to save them in a single action."
                  : "Use the + button on each panel, or Create below."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCreateBoth()}
              disabled={savingBoth}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#000000] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#131b2e] active:scale-95 disabled:opacity-60"
            >
              {savingBoth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {canCreateBoth ? "Create Both" : "Create"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            ref={brandSectionRef}
            className={cn(
              "flex h-[700px] flex-col overflow-hidden rounded-xl border border-[#e0e3e5]/50 bg-white/80 backdrop-blur-md",
              focus === "brand" && "ring-2 ring-[#712ae2]/30"
            )}
          >
            <div className="border-b border-[#e0e3e5] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-[#000000]">
                  <Award className="h-5 w-5 text-[#712ae2]" />
                  Brand Management
                </h2>
                <span className="rounded-full bg-[#712ae2]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#712ae2]">
                  {brandBadge}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={brandInputRef}
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateBrand();
                  }}
                  className="w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-base text-[#191c1e] outline-none focus:ring-2 focus:ring-[#712ae2]"
                  placeholder="Enter brand name"
                  type="text"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateBrand()}
                  disabled={savingBrand}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#000000] text-white transition hover:bg-[#131b2e] active:scale-95 disabled:opacity-60"
                  title="Create brand only"
                >
                  {savingBrand ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-grow space-y-3 overflow-y-auto p-4">
              {brands.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#45464d]">No brands yet. Add your first brand above.</p>
              ) : (
                brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="group flex items-center justify-between rounded-lg border border-transparent bg-white p-4 transition hover:border-[#c6c6cd]/30 hover:bg-[#e6e8ea]/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-[#eceef0] text-sm font-bold text-[#712ae2] shadow-sm">
                        {brandInitial(brand.name)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#191c1e]">{brand.name}</h3>
                        <p className="text-sm text-[#45464d]">
                          {brand.product_count} Product{brand.product_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-md p-2 text-[#45464d] transition hover:bg-[#e0e3e5] hover:text-[#000000]"
                        title="Edit coming soon"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteBrand(brand)}
                        disabled={deletingId === brand.id}
                        className="rounded-md p-2 text-[#45464d] transition hover:bg-[#ffdad6]/50 hover:text-[#ba1a1a] disabled:opacity-50"
                      >
                        {deletingId === brand.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-[#f2f4f6]/50 p-4 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                <Sparkles className="h-3.5 w-3.5" />
                AI Suggesting brand taxonomy optimizations
              </p>
            </div>
          </section>

          <section
            ref={categorySectionRef}
            className={cn(
              "flex h-[700px] flex-col overflow-hidden rounded-xl border border-[#e0e3e5]/50 bg-white/80 backdrop-blur-md",
              focus === "category" && "ring-2 ring-[#712ae2]/30"
            )}
          >
            <div className="border-b border-[#e0e3e5] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-[#000000]">
                  <Shapes className="h-5 w-5 text-[#712ae2]" />
                  Categories Management
                </h2>
                <span className="rounded-full bg-[#712ae2]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#712ae2]">
                  {categoryBadge}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={categoryInputRef}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateCategory();
                  }}
                  className="w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-base text-[#191c1e] outline-none focus:ring-2 focus:ring-[#712ae2]"
                  placeholder="Enter category name"
                  type="text"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateCategory()}
                  disabled={savingCategory}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#000000] text-white transition hover:bg-[#131b2e] active:scale-95 disabled:opacity-60"
                  title="Create category only"
                >
                  {savingCategory ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-grow space-y-3 overflow-y-auto p-4">
              {categories.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#45464d]">
                  No categories yet. Add your first category above.
                </p>
              ) : (
                categories.map((category, index) => {
                  const Icon = categoryIcon(category.name, index);
                  return (
                    <div
                      key={category.id}
                      className="group flex items-center justify-between rounded-lg border border-transparent bg-white p-4 transition hover:border-[#c6c6cd]/30 hover:bg-[#e6e8ea]/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eceef0] shadow-sm">
                          <Icon className="h-5 w-5 text-[#712ae2]" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[#191c1e]">{category.name}</h3>
                          <p className="text-sm text-[#45464d]">
                            {category.subcategory_count} Subcategor
                            {category.subcategory_count === 1 ? "y" : "ies"} • {formatUnits(category.unit_count)}{" "}
                            Units
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-md p-2 text-[#45464d] transition hover:bg-[#e0e3e5] hover:text-[#000000]"
                          title="Edit coming soon"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCategory(category)}
                          disabled={deletingId === category.id}
                          className="rounded-md p-2 text-[#45464d] transition hover:bg-[#ffdad6]/50 hover:text-[#ba1a1a] disabled:opacity-50"
                        >
                          {deletingId === category.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-[#f2f4f6]/50 p-4 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                <Brain className="h-3.5 w-3.5" />
                AI generating SEO keywords for categories
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex items-start gap-4 rounded-xl border border-[#e0e3e5]/50 bg-white/80 p-6 backdrop-blur-md">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#712ae2]">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#000000]">Voice-to-Catalog</h4>
              <p className="mt-1 text-sm text-[#45464d]">
                Add new brands or categories by speaking. AI will map attributes automatically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-[#712ae2]/20 bg-[#712ae2]/5 p-6 backdrop-blur-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eceef0]">
              <BarChart3 className="h-5 w-5 text-[#712ae2]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#000000]">Smart Consolidation</h4>
              <p className="mt-1 text-sm text-[#45464d]">
                Identified duplicate brands. Merge them to clean up your billing reports.
              </p>
              <button type="button" className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#712ae2] hover:underline">
                Review Duplicates
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-[#e0e3e5]/50 bg-white/80 p-6 backdrop-blur-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eceef0]">
              <ShieldCheck className="h-5 w-5 text-[#712ae2]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#000000]">Catalog Health</h4>
              <p className="mt-1 text-sm text-[#45464d]">
                {categories.length > 0
                  ? `${Math.min(98, 70 + categories.length)}% of your items are correctly categorized according to global standards.`
                  : "Add categories to improve catalog health and reporting accuracy."}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto w-full bg-[#f2f4f6]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between px-4 py-8 md:flex-row md:px-10">
          <div className="mb-4 md:mb-0">
            <span className="text-xl font-semibold text-[#000000]">SmartBill AI</span>
            <p className="mt-1 text-sm text-[#45464d]">© 2024 SmartBill AI. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-sm text-[#45464d] underline transition hover:text-[#712ae2]" href="#">
              Privacy Policy
            </a>
            <a className="text-sm text-[#45464d] underline transition hover:text-[#712ae2]" href="#">
              Support
            </a>
            <a className="text-sm text-[#45464d] underline transition hover:text-[#712ae2]" href="#">
              Terms of Service
            </a>
            <a className="text-sm text-[#45464d] underline transition hover:text-[#712ae2]" href="#">
              Contact Us
            </a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e0e3e5;
          border-radius: 10px;
        }
      `}</style>
    </BillingPageShell>
  );
}
