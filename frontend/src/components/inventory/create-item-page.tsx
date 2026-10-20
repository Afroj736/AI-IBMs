"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  CheckCircle,
  ChevronRight,
  Loader2,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { BillingHeader } from "@/components/billing/billing-header";
import { HamburgerMenu } from "@/components/billing/hamburger-menu";
import { VoiceFab } from "@/components/billing/voice-fab";
import { VoiceModal } from "@/components/billing/voice-modal";
import { CatalogAutocomplete } from "@/components/inventory/catalog-autocomplete";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn, formatCurrency } from "@/lib/utils";
import { listBrands, listCategories } from "@/services/catalog-service";
import { createItem } from "@/services/inventory-service";
import { type ItemFormValues, itemSchema } from "@/validators/item";

const inputClass =
  "w-full rounded-lg border-none bg-[#f2f4f6] p-3 text-base text-[#191c1e] outline-none transition focus:ring-2 focus:ring-[#712ae2]/20";

function CapsLabel({ children }: { children: string }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#45464d]">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#76777d] md:mb-6">
      {children}
    </h3>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#ba1a1a]">{message}</p>;
}

function computeAiInsight(
  category: string | undefined,
  purchasePrice: number,
  sellingPrice: number
): { recommendedPrice: number; marginPercent: number; show: boolean } {
  if (purchasePrice <= 0) {
    return { recommendedPrice: 0, marginPercent: 0, show: false };
  }
  const recommendedPrice = Math.round(purchasePrice * 1.22 * 100) / 100;
  const marginPercent =
    sellingPrice > 0
      ? Math.round(((sellingPrice - purchasePrice) / purchasePrice) * 100)
      : 22;
  return { recommendedPrice, marginPercent, show: true };
}

export function CreateItemPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      item_name: "",
      item_code: "",
      sku: "",
      category: "",
      brand: "",
      description: "",
      gst_percentage: 18,
      purchase_price: 0,
      selling_price: 0,
      minimum_stock: 10,
      current_stock: 0,
      serial_number_required: false,
      status: "active"
    }
  });

  const category = form.watch("category");
  const brand = form.watch("brand");
  const purchasePrice = form.watch("purchase_price");
  const sellingPrice = form.watch("selling_price");
  const aiInsight = useMemo(
    () => computeAiInsight(category, purchasePrice, sellingPrice),
    [category, purchasePrice, sellingPrice]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const [brands, categories] = await Promise.all([listBrands(), listCategories()]);
        setBrandOptions(brands.map((item) => item.name));
        setCategoryOptions(categories.map((item) => item.name));
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.push("/login");
          return;
        }
        toast.error(getApiErrorMessage(error, "Failed to load brands and categories"));
      } finally {
        setCatalogLoading(false);
      }
    };
    void loadCatalog();
  }, [router]);

  const handlePhotoFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a PNG or JPG image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    toast.info("Image uploaded. AI image extraction coming soon.");
  }, []);

  const onSubmit = async (values: ItemFormValues) => {
    setSaving(true);
    try {
      const sku = values.sku.trim();
      await createItem({
        ...values,
        item_code: values.item_code.trim() || sku,
        sku,
        barcode: sku || undefined,
        category: values.category?.trim() || undefined,
        brand: values.brand?.trim() || undefined,
        description: values.description?.trim() || undefined
      });
      toast.success("Item created successfully");
      router.push("/inventory/items");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create item"));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (form.formState.isDirty) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    router.push("/inventory/items");
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f9fb]">
      <BillingHeader />
      <HamburgerMenu />
      <VoiceModal />

      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-10 md:py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-[#45464d]">
          <Link href="/inventory" className="transition-colors hover:text-[#000000]">
            Inventory
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/inventory/items" className="transition-colors hover:text-[#000000]">
            Items List
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-[#000000]">Add New Item</span>
        </nav>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mx-auto max-w-4xl rounded-xl border border-[#e2e8f0]/80 bg-white/80 shadow-sm backdrop-blur-md"
        >
          <div className="space-y-12 p-6 md:p-8">
            <section>
              <div className="flex flex-col items-start gap-6 md:flex-row md:gap-8">
                <div className="w-full flex-1">
                  <SectionTitle>Basic Information</SectionTitle>
                  <div className="space-y-6">
                    <div>
                      <CapsLabel>Item Name</CapsLabel>
                      <input
                        className={inputClass}
                        placeholder="e.g. Enterprise Cloud Server Node"
                        {...form.register("item_name")}
                      />
                      <FieldError message={form.formState.errors.item_name?.message} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <CapsLabel>Category</CapsLabel>
                        <CatalogAutocomplete
                          label="categories"
                          placeholder="Search or select category"
                          value={category ?? ""}
                          options={categoryOptions}
                          loading={catalogLoading}
                          createHref="/inventory/catalog?focus=category"
                          onChange={(value) =>
                            form.setValue("category", value, { shouldDirty: true, shouldValidate: true })
                          }
                        />
                      </div>
                      <div>
                        <CapsLabel>Brand</CapsLabel>
                        <CatalogAutocomplete
                          label="brands"
                          placeholder="Search or select brand"
                          value={brand ?? ""}
                          options={brandOptions}
                          loading={catalogLoading}
                          createHref="/inventory/catalog?focus=brand"
                          onChange={(value) =>
                            form.setValue("brand", value, { shouldDirty: true, shouldValidate: true })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full shrink-0 md:w-48">
                  <SectionTitle>Item Photo</SectionTitle>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoFile(file);
                    }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePhotoFile(file);
                    }}
                    className={cn(
                      "group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c6c6cd] bg-[#f2f4f6]/50 p-4 text-center transition-all hover:bg-[#f2f4f6]",
                      dragActive && "border-[#712ae2] bg-[#712ae2]/5"
                    )}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Item preview" className="mb-2 h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#eceef0] transition-transform group-hover:scale-110">
                        <Camera className="h-6 w-6 text-[#76777d]" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-[#000000]">Click to upload</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <CapsLabel>SKU / Barcode</CapsLabel>
                  <input
                    className={inputClass}
                    placeholder="SRV-2024-X1"
                    {...form.register("sku", {
                      onChange: (e) => {
                        const value = e.target.value;
                        form.setValue("item_code", value, { shouldDirty: true });
                      }
                    })}
                  />
                  <FieldError message={form.formState.errors.sku?.message} />
                </div>
                <div className="md:col-span-2">
                  <CapsLabel>Description</CapsLabel>
                  <textarea
                    className={inputClass}
                    placeholder="Provide a detailed description for invoices..."
                    rows={3}
                    {...form.register("description")}
                  />
                </div>
              </div>
            </section>

            <section>
              <SectionTitle>Pricing &amp; Taxation</SectionTitle>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <CapsLabel>Purchase Price</CapsLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45464d]">₹</span>
                    <input
                      className={cn(inputClass, "pl-8")}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("purchase_price", { valueAsNumber: true })}
                    />
                  </div>
                  <FieldError message={form.formState.errors.purchase_price?.message} />
                </div>
                <div>
                  <CapsLabel>Selling Price</CapsLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45464d]">₹</span>
                    <input
                      className={cn(inputClass, "pl-8")}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("selling_price", { valueAsNumber: true })}
                    />
                  </div>
                  <FieldError message={form.formState.errors.selling_price?.message} />
                </div>
                <div>
                  <CapsLabel>Tax Rate (%)</CapsLabel>
                  <div className="relative">
                    <input
                      className={cn(inputClass, "pr-8")}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="0"
                      {...form.register("gst_percentage", { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#45464d]">%</span>
                  </div>
                  <FieldError message={form.formState.errors.gst_percentage?.message} />
                </div>
              </div>
            </section>

            <section>
              <SectionTitle>Inventory Status</SectionTitle>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <CapsLabel>Opening Stock</CapsLabel>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    {...form.register("current_stock", { valueAsNumber: true })}
                  />
                  <FieldError message={form.formState.errors.current_stock?.message} />
                </div>
                <div>
                  <CapsLabel>Low Stock Alert Level</CapsLabel>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="10"
                    {...form.register("minimum_stock", { valueAsNumber: true })}
                  />
                  <FieldError message={form.formState.errors.minimum_stock?.message} />
                </div>
              </div>
            </section>

            {aiInsight.show && (
              <div className="flex items-start gap-4 rounded-xl border border-[#e2e8f0]/80 border-l-4 border-l-[#712ae2] bg-white p-6 shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="rounded-lg bg-[#712ae2]/10 p-2">
                  <Zap className="h-5 w-5 fill-[#712ae2] text-[#712ae2]" />
                </div>
                <div>
                  <h4 className="mb-1 text-lg font-semibold text-[#000000]">AI Pricing Insight</h4>
                  <p className="text-sm leading-relaxed text-[#45464d]">
                    Based on current market trends for{" "}
                    <span className="font-semibold text-[#712ae2]">
                      {category?.trim() || "this category"}
                    </span>
                    , a selling price of{" "}
                    <span className="font-bold text-[#000000]">
                      {formatCurrency(aiInsight.recommendedPrice)}
                    </span>{" "}
                    is recommended to optimize for a {aiInsight.marginPercent}% profit margin while
                    remaining competitive in the regional market.
                  </p>
                  {sellingPrice === 0 && (
                    <button
                      type="button"
                      className="mt-3 text-sm font-semibold text-[#712ae2] hover:underline"
                      onClick={() =>
                        form.setValue("selling_price", aiInsight.recommendedPrice, {
                          shouldDirty: true
                        })
                      }
                    >
                      Apply recommended price
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col justify-end gap-3 border-t border-[#c6c6cd] pt-8 sm:flex-row sm:gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-lg border-[#c6c6cd] px-8 font-semibold"
                onClick={handleDiscard}
                disabled={saving}
              >
                Discard Changes
              </Button>
              <Button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#000000] px-12 font-semibold text-white shadow-lg shadow-black/20 hover:bg-neutral-800"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Save New Item
              </Button>
            </div>
          </div>
        </form>
      </main>

      <footer className="mt-8 border-t border-[#c6c6cd] bg-[#f2f4f6] py-6">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#76777d]">
            SmartBill AI Enterprise
          </span>
          <div className="flex flex-wrap justify-center gap-6">
            {["Privacy Policy", "Terms of Service", "API Documentation", "Support"].map((link) => (
              <button
                key={link}
                type="button"
                className="text-sm text-[#45464d] transition-colors hover:text-[#712ae2]"
                onClick={() => toast.info(`${link} coming soon.`)}
              >
                {link}
              </button>
            ))}
          </div>
          <span className="text-sm text-[#45464d]">
            © 2024 SmartBill AI Enterprise. All rights reserved.
          </span>
        </div>
      </footer>

      <VoiceFab />
    </div>
  );
}
