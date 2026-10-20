"use client";

import {
  Loader2,
  Mic,
  Save,
  Search,
  Trash2,
  User,
  UserPlus,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { billingKeys } from "@/hooks/use-invoices";
import {
  resolveTemplateCards,
  type TemplateCardKey
} from "@/components/billing/voice-billing/template-picker-cards";
import { getApiErrorMessage } from "@/lib/api-error";
import { isInterStateSupply, splitGstTax } from "@/lib/gst-tax-split";
import { amountToWords } from "@/lib/number-to-words";
import { cn, formatCurrency } from "@/lib/utils";
import { getCompanySettings } from "@/services/company-settings-service";
import { listItems } from "@/services/inventory-service";
import { createInvoice, getNextInvoiceNumber } from "@/services/invoice-service";
import {
  getPartyTransactions,
  listParties,
  type PartyTransaction
} from "@/services/party-service";
import { listTemplates } from "@/services/template-service";
import { useBillingStore } from "@/store/billing-store";
import type { InventoryItem } from "@/types/item";
import type { Party } from "@/types/party";

type InvoiceType = "gst" | "retail";

const GST_RATES = [0, 5, 12, 18, 28] as const;

interface LineItem {
  key: string;
  item_id: string;
  item_name: string;
  sku: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  discount: number;
}

function lineSubtotal(line: LineItem): number {
  return Math.max(0, line.quantity * line.unit_price - line.discount);
}

function lineTax(line: LineItem): number {
  return (lineSubtotal(line) * line.gst_percent) / 100;
}

function lineTotal(line: LineItem): number {
  return lineSubtotal(line) + lineTax(line);
}

function addDays(date: string, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

function useAnchoredDropdownPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>
): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  return position;
}

function CreateInvoiceVoiceFab() {
  const setVoiceModalOpen = useBillingStore((s) => s.setVoiceModalOpen);

  return (
    <div className="fixed bottom-8 left-8 z-40">
      <button
        type="button"
        onClick={() => setVoiceModalOpen(true)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white shadow-2xl transition-all duration-300 hover:w-48 active:scale-95"
        aria-label="AI Voice Invoice"
      >
        <Mic className="absolute left-1/2 h-6 w-6 -translate-x-1/2 transition-all duration-300 group-hover:left-6 group-hover:translate-x-0" />
        <span className="ml-8 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          AI Voice Invoice
        </span>
        <span className="absolute inset-0 animate-ping rounded-full bg-secondary opacity-20" />
        <span className="absolute -inset-2 animate-pulse rounded-full border-2 border-secondary/30" />
      </button>
    </div>
  );
}

export function CreateInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialType: InvoiceType = searchParams.get("type") === "gst" ? "gst" : "retail";

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialType);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => addDays(new Date().toISOString().slice(0, 10), 15));
  const [notes, setNotes] = useState("");
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState("");
  const [loadingInvoiceNumber, setLoadingInvoiceNumber] = useState(true);
  const [companyState, setCompanyState] = useState("");
  const [companyGstin, setCompanyGstin] = useState<string | null>(null);

  const [partySearch, setPartySearch] = useState("");
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partyTransactions, setPartyTransactions] = useState<PartyTransaction[]>([]);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);

  const partyRef = useRef<HTMLDivElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const itemDropdownPosition = useAnchoredDropdownPosition(showItemDropdown, itemInputRef);

  const switchType = (type: InvoiceType) => {
    setInvoiceType(type);
    router.replace(`/billing/create?type=${type}`, { scroll: false });
  };

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const templates = await listTemplates();
      const cards = resolveTemplateCards(templates);
      const key: TemplateCardKey = invoiceType === "gst" ? "gst" : "retail";
      const match = cards.find((card) => card.key === key);
      setTemplateId(match?.template?.id ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load invoice templates"));
    } finally {
      setLoadingTemplates(false);
    }
  }, [invoiceType]);

  const loadInventory = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const data = await listItems();
      setInventory(data.filter((item) => item.status === "active"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load inventory"));
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  const loadNextInvoiceNumber = useCallback(async () => {
    setLoadingInvoiceNumber(true);
    try {
      const data = await getNextInvoiceNumber(invoiceType);
      setPreviewInvoiceNumber(data.invoice_number);
    } catch {
      setPreviewInvoiceNumber("");
    } finally {
      setLoadingInvoiceNumber(false);
    }
  }, [invoiceType]);

  const searchParties = useCallback(async (query: string) => {
    try {
      const results = await listParties({ search: query || undefined, party_type: "customer" });
      setPartyOptions(results);
    } catch {
      setPartyOptions([]);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    void loadNextInvoiceNumber();
  }, [loadNextInvoiceNumber]);

  useEffect(() => {
    void getCompanySettings()
      .then((response) => {
        setCompanyState(response.settings.address.state || "");
        setCompanyGstin(response.settings.gstin || response.gst_number || null);
      })
      .catch(() => {
        setCompanyState("");
        setCompanyGstin(null);
      });
  }, []);

  useEffect(() => {
    const type = searchParams.get("type") === "gst" ? "gst" : "retail";
    setInvoiceType(type);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showPartyDropdown) void searchParties(partySearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [partySearch, showPartyDropdown, searchParties]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!partyRef.current?.contains(target)) setShowPartyDropdown(false);
      if (
        !itemInputRef.current?.contains(target) &&
        !itemDropdownRef.current?.contains(target)
      ) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectParty = async (selected: Party) => {
    setParty(selected);
    setPartySearch(selected.name);
    setShowPartyDropdown(false);
    try {
      const transactions = await getPartyTransactions(selected.id);
      setPartyTransactions(transactions);
    } catch {
      setPartyTransactions([]);
    }
  };

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return inventory.slice(0, 8);
    return inventory
      .filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          item.item_code.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          (item.hsn_code ?? "").toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [inventory, itemSearch]);

  const addItem = (item: InventoryItem) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.item_id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item_id === item.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          key: `${item.id}-${Date.now()}`,
          item_id: item.id,
          item_name: item.item_name,
          sku: item.sku || item.item_code,
          hsn_code: item.hsn_code ?? "—",
          quantity: 1,
          unit_price: Number(item.selling_price),
          gst_percent: Number(item.gst_percentage),
          discount: 0
        }
      ];
    });
    setItemSearch("");
    setShowItemDropdown(false);
  };

  const updateLine = (key: string, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
  const totalTax = lines.reduce((sum, line) => sum + lineTax(line), 0);
  const isInterState = useMemo(
    () =>
      isInterStateSupply(companyState, party?.state ?? "", companyGstin, party?.gstin ?? null),
    [companyState, companyGstin, party]
  );
  const taxBreakdown = useMemo(() => splitGstTax(totalTax, isInterState), [totalTax, isInterState]);
  const grandTotal = subtotal + totalTax;
  const balanceDue = Math.max(0, grandTotal - receivedAmount);

  const previousUnpaid = partyTransactions
    .filter((tx) => tx.payment_status === "pending" || tx.payment_status === "partial")
    .reduce((sum, tx) => sum + Number(tx.grand_total), 0);

  const handleSave = async () => {
    if (!party) {
      toast.error("Select a customer before saving");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSaving(true);
    try {
      const invoice = await createInvoice({
        party_id: party.id,
        template_id: templateId ?? undefined,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        notes: notes.trim() || undefined,
        discount_amount: 0,
        round_off: 0,
        received_amount: receivedAmount,
        items: lines.map((line) => ({
          item_id: line.item_id,
          quantity: line.quantity,
          discount: line.discount
        }))
      });
      await queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast.success(`Invoice ${invoice.invoice_number} created`);
      router.push(`/billing?selected=${invoice.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save invoice"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BillingPageShell hideVoiceFab>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-10">
        {/* Title & mode toggle */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-brand-primary md:text-[28px]">
              Create New Invoice
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Automate your billing process with AI-driven insights.
            </p>
          </div>
          <div className="flex items-center rounded-lg bg-surface-container p-1 shadow-inner">
            <button
              type="button"
              onClick={() => switchType("gst")}
              className={cn(
                "rounded-md px-6 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all",
                invoiceType === "gst"
                  ? "billing-active-mode shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-variant"
              )}
            >
              GST Invoice
            </button>
            <button
              type="button"
              onClick={() => switchType("retail")}
              className={cn(
                "rounded-md px-6 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all",
                invoiceType === "retail"
                  ? "billing-active-mode shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-variant"
              )}
            >
              Retail Invoice
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Invoice metadata */}
          <div className="glass-panel rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Invoice No
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={loadingInvoiceNumber ? "Loading..." : previewInvoiceNumber || "—"}
                    className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-base font-semibold text-on-surface outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  {loadingInvoiceNumber && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-on-surface-variant" />
                  )}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-base text-on-surface outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 text-base text-on-surface outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Bill To & items */}
          <div className="glass-panel overflow-visible rounded-xl shadow-sm">
            <div className="border-b border-surface-variant p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-brand-primary">
                  <User className="h-5 w-5 text-secondary" />
                  Bill To
                </h2>
                <Link
                  href="/customers/create-customer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-secondary hover:underline"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Customer
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div ref={partyRef} className="relative">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Select Customer
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      value={partySearch}
                      onChange={(e) => {
                        setPartySearch(e.target.value);
                        setShowPartyDropdown(true);
                        if (!e.target.value) setParty(null);
                      }}
                      onFocus={() => {
                        setShowPartyDropdown(true);
                        void searchParties(partySearch);
                      }}
                      placeholder="Search customer name..."
                      className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-10 pr-4 text-base outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  {showPartyDropdown && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-surface-variant bg-surface-container-lowest py-1 shadow-lg">
                      {partyOptions.length > 0 ? (
                        partyOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className="w-full px-4 py-3 text-left transition hover:bg-surface-container-low"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => void selectParty(option)}
                          >
                            <p className="font-semibold text-on-surface">{option.name}</p>
                            <p className="text-sm text-on-surface-variant">
                              {option.mobile}
                              {option.gstin ? ` · GSTIN: ${option.gstin}` : ""}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-on-surface-variant">No customers found</p>
                      )}
                    </div>
                  )}
                </div>
                {party && (
                  <div className="flex flex-col items-end justify-end">
                    <div className="w-full rounded-lg border border-primary-container/10 bg-primary-container/5 p-4 md:w-auto">
                      <p className="text-base font-bold text-brand-primary">{party.name}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {[party.billing_address, party.city, party.pincode]
                          .filter(Boolean)
                          .join(", ") || "No address on file"}
                      </p>
                      {party.gstin && (
                        <p className="mt-2 text-sm font-semibold text-secondary">
                          GSTIN: {party.gstin}
                        </p>
                      )}
                      {previousUnpaid > 0 && (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                          Previous unpaid: {formatCurrency(previousUnpaid)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-surface-container text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="w-12 px-6 py-4 text-center">#</th>
                    <th className="min-w-[240px] px-6 py-4">Item Name</th>
                    <th className="px-4 py-4">HSN/SAC</th>
                    <th className="w-24 px-4 py-4">Qty</th>
                    <th className="min-w-[140px] px-4 py-4">Unit Price</th>
                    <th className="w-28 px-4 py-4">Tax (%)</th>
                    <th className="min-w-[140px] px-4 py-4 text-right">Amount</th>
                    <th className="w-16 px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                        Search and add items to build your invoice
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr
                        key={line.key}
                        className="border-b border-surface-variant transition-colors hover:bg-surface-container-low"
                      >
                        <td className="px-6 py-4 text-center text-on-surface-variant">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={line.item_name}
                            onChange={(e) => updateLine(line.key, { item_name: e.target.value })}
                            className="w-full border-none bg-transparent p-0 text-base font-medium text-on-surface outline-none focus:ring-0"
                          />
                        </td>
                        <td className="px-4 py-4 text-on-surface-variant">{line.hsn_code}</td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: Math.max(1, Number(e.target.value) || 1)
                              })
                            }
                            className="w-full border-none bg-transparent p-0 text-center outline-none focus:ring-0"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) =>
                              updateLine(line.key, {
                                unit_price: Math.max(0, Number(e.target.value) || 0)
                              })
                            }
                            className="w-full border-none bg-transparent p-0 outline-none focus:ring-0"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={line.gst_percent}
                            onChange={(e) =>
                              updateLine(line.key, { gst_percent: Number(e.target.value) })
                            }
                            className="w-full cursor-pointer border-none bg-transparent p-0 outline-none focus:ring-0"
                          >
                            {GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-brand-primary">
                          {formatCurrency(lineTotal(line))}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-error-container"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-surface-container-lowest p-6">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
                <input
                  ref={itemInputRef}
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                  placeholder="Search items to add..."
                  className="w-full rounded-lg border-none bg-surface-container-low py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              {showItemDropdown &&
                itemDropdownPosition &&
                typeof document !== "undefined" &&
                createPortal(
                  <div
                    ref={itemDropdownRef}
                    className="fixed z-[9999] max-h-64 min-w-[300px] overflow-y-auto rounded-lg border border-surface-variant bg-white py-1 shadow-xl"
                    style={{
                      top: itemDropdownPosition.top,
                      left: itemDropdownPosition.left,
                      width: Math.max(itemDropdownPosition.width, 300)
                    }}
                  >
                    {loadingInventory ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-on-surface-variant">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading items...
                      </div>
                    ) : filteredItems.length > 0 ? (
                      <>
                        <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-surface-variant px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          <span>Item name</span>
                          <span className="text-right">Stocks</span>
                        </div>
                        {filteredItems.map((item) => {
                          const itemCode = item.item_code?.trim() || item.sku?.trim() || null;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full border-b border-surface-variant/60 px-4 py-2.5 text-left transition last:border-b-0 hover:bg-surface-container-low"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addItem(item)}
                            >
                              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                                <p className="truncate font-semibold text-on-surface">{item.item_name}</p>
                                <p className="shrink-0 text-sm font-medium text-on-surface">
                                  {item.current_stock}
                                </p>
                              </div>
                              <div className="mt-0.5 grid grid-cols-[1fr_auto] items-center gap-x-4">
                                {itemCode ? (
                                  <p className="truncate text-xs text-on-surface-variant">{itemCode}</p>
                                ) : (
                                  <span />
                                )}
                                <p className="shrink-0 text-xs font-medium text-on-surface-variant">
                                  {formatCurrency(Number(item.selling_price))}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      <p className="px-4 py-3 text-sm text-on-surface-variant">No items found</p>
                    )}
                  </div>,
                  document.body
                )}
            </div>
          </div>

          {/* Terms & totals */}
          <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row">
            <div className="glass-panel w-full rounded-xl p-6 md:w-1/2">
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Terms &amp; Notes
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter terms of sale, bank details or additional notes..."
                className="h-32 w-full resize-none rounded-lg border-none bg-surface-container-low p-4 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex w-full flex-col gap-4 rounded-xl bg-brand-primary p-8 text-white shadow-xl md:w-1/3">
              <div className="flex items-center justify-between opacity-70">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Subtotal</span>
                <span className="text-lg font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              {totalTax > 0 && (
                <div className="space-y-2 border-y border-white/10 py-4">
                  {!taxBreakdown.isInterState && (
                    <>
                      <div className="flex items-center justify-between opacity-70">
                        <span className="text-sm">CGST</span>
                        <span className="text-sm">{formatCurrency(taxBreakdown.cgst)}</span>
                      </div>
                      <div className="flex items-center justify-between opacity-70">
                        <span className="text-sm">SGST</span>
                        <span className="text-sm">{formatCurrency(taxBreakdown.sgst)}</span>
                      </div>
                    </>
                  )}
                  {taxBreakdown.isInterState && (
                    <div className="flex items-center justify-between opacity-70">
                      <span className="text-sm">IGST</span>
                      <span className="text-sm">{formatCurrency(taxBreakdown.igst)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-fixed-dim">
                  Total Tax
                </span>
                <span className="text-base font-bold">{formatCurrency(totalTax)}</span>
              </div>

              <div className="flex items-end justify-between border-t border-white/20 pt-4">
                <span className="text-xl font-bold">Grand Total</span>
                <span className="text-2xl font-black text-secondary-fixed-dim">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-white/50">{amountToWords(grandTotal)}</p>

              <div className="mt-2 space-y-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                    Received Amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={receivedAmount || ""}
                    onChange={(e) => setReceivedAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-32 rounded border-none bg-white/10 px-3 py-1 text-right outline-none focus:ring-1 focus:ring-secondary-fixed-dim"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                    Balance Due
                  </span>
                  <span className="text-lg font-semibold text-error-container">
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="sticky bottom-8 flex flex-col items-center justify-end gap-4 bg-background/80 py-4 backdrop-blur-md md:flex-row">
            <button
              type="button"
              onClick={() => router.push("/billing")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-8 py-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant transition-all hover:bg-surface-container md:w-auto"
            >
              <X className="h-5 w-5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loadingTemplates}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-primary px-12 py-4 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60 md:w-auto"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Save Invoice
            </button>
          </div>
        </div>
      </main>

      <CreateInvoiceVoiceFab />
    </BillingPageShell>
  );
}
