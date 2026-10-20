"use client";

import { Loader2, Save, Search, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { BillToCard } from "@/components/billing/bill-to-card";
import { ShipToCard } from "@/components/billing/ship-to-card";
import { Button } from "@/components/ui/button";
import { billingKeys } from "@/hooks/use-invoices";
import { getApiErrorMessage } from "@/lib/api-error";
import { isInterStateSupply, splitGstTax } from "@/lib/gst-tax-split";
import { amountToWords } from "@/lib/number-to-words";
import { formatCurrency } from "@/lib/utils";
import { getCompanySettings } from "@/services/company-settings-service";
import { listItems } from "@/services/inventory-service";
import { getInvoice, updateInvoice } from "@/services/invoice-service";
import type { BillingInvoice } from "@/types/billing";
import type { InventoryItem } from "@/types/item";

const GST_RATES = [0, 5, 12, 18, 28] as const;

interface LineItem {
  key: string;
  item_id: string;
  item_name: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  discount: number;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
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

interface InvoiceEditorProps {
  invoice: BillingInvoice;
  onCancel: () => void;
  onSaved: () => void;
}

export function InvoiceEditor({ invoice, onCancel, onSaved }: InvoiceEditorProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date);
  const [dueDate, setDueDate] = useState(invoice.due_date);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [receivedAmount, setReceivedAmount] = useState(invoice.totals.received_amount);
  const [discountAmount, setDiscountAmount] = useState(invoice.totals.discount);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [companyState, setCompanyState] = useState("");
  const [companyGstin, setCompanyGstin] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);

  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const itemDropdownPosition = useAnchoredDropdownPosition(showItemDropdown, itemInputRef);

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

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

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
    setLoading(true);
    void getInvoice(invoice.id)
      .then((raw) => {
        setInvoiceDate(raw.invoice_date);
        setDueDate(addDays(raw.invoice_date, 15));
        setNotes(raw.notes ?? "");
        setReceivedAmount(Number(raw.received_amount ?? 0));
        setDiscountAmount(Number(raw.discount_amount ?? 0));
        setTemplateId(raw.template_id ?? null);
        setLines(
          raw.items.map((item) => ({
            key: item.id,
            item_id: item.item_id,
            item_name: item.item_name,
            hsn_code: "—",
            quantity: item.quantity,
            unit_price: Number(item.rate),
            gst_percent: Number(item.gst_percent),
            discount: Number(item.discount)
          }))
        );
      })
      .catch((error) => {
        toast.error(getApiErrorMessage(error, "Failed to load invoice"));
        onCancel();
      })
      .finally(() => setLoading(false));
  }, [invoice.id, onCancel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
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

  const availableStock = useCallback(
    (itemId: string) => {
      const item = inventory.find((entry) => entry.id === itemId);
      if (!item) return 0;
      const onInvoice = lines
        .filter((line) => line.item_id === itemId)
        .reduce((sum, line) => sum + line.quantity, 0);
      return item.current_stock + onInvoice;
    },
    [inventory, lines]
  );

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
      isInterStateSupply(
        companyState,
        invoice.place_of_supply,
        companyGstin,
        invoice.bill_to.gst_number ?? null
      ),
    [companyState, companyGstin, invoice.bill_to.gst_number, invoice.place_of_supply]
  );
  const taxBreakdown = useMemo(() => splitGstTax(totalTax, isInterState), [totalTax, isInterState]);
  const grandTotal = Math.max(0, subtotal + totalTax - discountAmount);
  const balanceDue = Math.max(0, grandTotal - receivedAmount);

  const handleSave = async () => {
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSaving(true);
    try {
      await updateInvoice(invoice.id, {
        invoice_date: invoiceDate,
        template_id: templateId,
        discount_amount: discountAmount,
        round_off: 0,
        received_amount: Math.min(receivedAmount, grandTotal),
        notes: notes.trim() || null,
        items: lines.map((line) => ({
          item_id: line.item_id,
          quantity: line.quantity,
          discount: line.discount,
          rate: line.unit_price,
          gst_percent: line.gst_percent
        }))
      });
      await queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast.success("Invoice updated");
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update invoice"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center rounded-xl bg-white shadow-card">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Edit {invoice.invoice_number}</h2>
          <p className="text-xs text-secondary">Customer details cannot be changed</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 gap-2" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button className="h-10 gap-2" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary">
                Place of Supply
              </label>
              <input
                readOnly
                value={invoice.place_of_supply}
                className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-secondary"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <BillToCard address={invoice.bill_to} />
            <ShipToCard address={invoice.ship_to} />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted text-xs font-semibold uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">#</th>
                    <th className="min-w-[200px] px-4 py-3">Item</th>
                    <th className="px-4 py-3">HSN</th>
                    <th className="w-24 px-4 py-3">Qty</th>
                    <th className="min-w-[120px] px-4 py-3">Unit Price</th>
                    <th className="w-24 px-4 py-3">Tax %</th>
                    <th className="w-28 px-4 py-3">Discount</th>
                    <th className="min-w-[120px] px-4 py-3 text-right">Amount</th>
                    <th className="w-14 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-secondary">
                        Search and add items below
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr key={line.key} className="border-t border-border">
                        <td className="px-4 py-3 text-center text-secondary">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{line.item_name}</td>
                        <td className="px-4 py-3 text-secondary">{line.hsn_code}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: Math.max(1, Number(e.target.value) || 1)
                              })
                            }
                            className="h-8 w-full rounded border border-border px-2 text-center outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
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
                            className="h-8 w-full rounded border border-border px-2 outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={line.gst_percent}
                            onChange={(e) =>
                              updateLine(line.key, { gst_percent: Number(e.target.value) })
                            }
                            className="h-8 w-full rounded border border-border px-2 outline-none focus:border-primary"
                          >
                            {GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.discount}
                            onChange={(e) =>
                              updateLine(line.key, {
                                discount: Math.max(0, Number(e.target.value) || 0)
                              })
                            }
                            className="h-8 w-full rounded border border-border px-2 outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(lineTotal(line))}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border bg-muted/30 p-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                <input
                  ref={itemInputRef}
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                  placeholder="Search items to add..."
                  className="h-10 w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {showItemDropdown &&
                itemDropdownPosition &&
                typeof document !== "undefined" &&
                createPortal(
                  <div
                    ref={itemDropdownRef}
                    className="fixed z-[9999] max-h-64 min-w-[300px] overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-xl"
                    style={{
                      top: itemDropdownPosition.top,
                      left: itemDropdownPosition.left,
                      width: Math.max(itemDropdownPosition.width, 300)
                    }}
                  >
                    {loadingInventory ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading items...
                      </div>
                    ) : filteredItems.length > 0 ? (
                      filteredItems.map((item) => {
                        const stock = availableStock(item.id);
                        const itemCode = item.item_code?.trim() || item.sku?.trim() || null;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full border-b border-border/60 px-4 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addItem(item)}
                            disabled={stock <= 0}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="truncate font-semibold">{item.item_name}</p>
                              <p className="shrink-0 text-sm">Stock: {stock}</p>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-4 text-xs text-secondary">
                              {itemCode ? <span>{itemCode}</span> : <span />}
                              <span>{formatCurrency(Number(item.selling_price))}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-4 py-3 text-sm text-secondary">No items found</p>
                    )}
                  </div>,
                  document.body
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Terms, bank details, or additional notes..."
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {!taxBreakdown.isInterState && totalTax > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-secondary">CGST</span>
                      <span>{formatCurrency(taxBreakdown.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">SGST</span>
                      <span>{formatCurrency(taxBreakdown.sgst)}</span>
                    </div>
                  </>
                )}
                {taxBreakdown.isInterState && totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">IGST</span>
                    <span>{formatCurrency(taxBreakdown.igst)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-secondary">Discount</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    max={subtotal + totalTax}
                    value={discountAmount || ""}
                    onChange={(e) => {
                      const maxDiscount = subtotal + totalTax;
                      setDiscountAmount(
                        Math.min(maxDiscount, Math.max(0, Number(e.target.value) || 0))
                      );
                    }}
                    className="h-8 w-28 rounded border border-border px-2 text-right outline-none focus:border-primary"
                  />
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <p className="text-xs text-secondary">{amountToWords(grandTotal)}</p>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
                  <span className="text-secondary">Received Amount</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    max={grandTotal}
                    value={receivedAmount || ""}
                    onChange={(e) => setReceivedAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="h-8 w-28 rounded border border-border px-2 text-right outline-none focus:border-primary"
                  />
                </div>
                <div className="flex justify-between font-semibold text-red-600">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
