"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn, formatCurrency } from "@/lib/utils";
import { listItems } from "@/services/inventory-service";
import { createInvoice, getInvoice, updateInvoice } from "@/services/invoice-service";
import type { InventoryItem } from "@/types/item";
import type { Invoice, PaymentStatus } from "@/types/invoice";

const createSchema = z.object({
  invoice_date: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        item_id: z.string().uuid("Select an item"),
        quantity: z.coerce.number().int().min(1),
        discount: z.coerce.number().min(0).default(0)
      })
    )
    .min(1, "Add at least one item")
});

const editSchema = z.object({
  payment_status: z.enum(["pending", "paid", "partial", "cancelled"]),
  notes: z.string().optional()
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const inputClass =
  "h-10 w-full rounded-lg border border-[#e0e3e5] bg-white px-3 text-sm outline-none focus:border-[#712ae2] focus:ring-2 focus:ring-[#712ae2]/10";

interface PartyInvoiceFormDialogProps {
  partyId: string;
  partyName: string;
  invoiceId: string | null;
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function PartyInvoiceFormDialog({
  partyId,
  partyName,
  invoiceId,
  mode,
  open,
  onOpenChange,
  onSaved
}: PartyInvoiceFormDialogProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().slice(0, 10),
      notes: "",
      items: [{ item_id: "", quantity: 1, discount: 0 }]
    }
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { payment_status: "pending", notes: "" }
  });

  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: "items"
  });

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const data = await listItems();
      setItems(data.filter((item) => item.status === "active"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load inventory items"));
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoadingInvoice(true);
    try {
      const data = await getInvoice(invoiceId);
      setExistingInvoice(data);
      editForm.reset({
        payment_status: data.payment_status,
        notes: data.notes ?? ""
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load invoice"));
      onOpenChange(false);
    } finally {
      setLoadingInvoice(false);
    }
  }, [invoiceId, editForm, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setExistingInvoice(null);
      createForm.reset({
        invoice_date: new Date().toISOString().slice(0, 10),
        notes: "",
        items: [{ item_id: "", quantity: 1, discount: 0 }]
      });
      return;
    }
    if (mode === "create") {
      void loadItems();
    } else {
      void loadInvoice();
    }
  }, [open, mode, loadItems, loadInvoice, createForm]);

  const onCreateSubmit = async (values: CreateFormValues) => {
    setSaving(true);
    try {
      await createInvoice({
        party_id: partyId,
        invoice_date: values.invoice_date,
        notes: values.notes?.trim() || undefined,
        discount_amount: 0,
        round_off: 0,
        items: values.items.map((line) => ({
          item_id: line.item_id,
          quantity: line.quantity,
          discount: line.discount ?? 0
        }))
      });
      toast.success("Invoice created successfully");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create invoice"));
    } finally {
      setSaving(false);
    }
  };

  const onEditSubmit = async (values: EditFormValues) => {
    if (!invoiceId) return;
    setSaving(true);
    try {
      await updateInvoice(invoiceId, {
        payment_status: values.payment_status as PaymentStatus,
        notes: values.notes?.trim() || null
      });
      toast.success("Invoice updated successfully");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update invoice"));
    } finally {
      setSaving(false);
    }
  };

  const isLoading = mode === "create" ? loadingItems : loadingInvoice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        nested
        className="max-h-[90vh] w-[min(560px,95vw)] max-w-[min(560px,95vw)] overflow-y-auto"
        onInteractOutside={(event) => event.stopPropagation()}
        onPointerDownOutside={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Invoice" : "Edit Invoice"}</DialogTitle>
          <DialogDescription>
            {partyName}
            {existingInvoice ? ` · ${existingInvoice.invoice_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#712ae2]" />
          </div>
        ) : mode === "create" ? (
          <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                Invoice Date
              </label>
              <input type="date" className={cn(inputClass, "mt-1")} {...createForm.register("invoice_date")} />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                Notes
              </label>
              <textarea
                className={cn(inputClass, "mt-1 min-h-[72px] resize-none py-2")}
                placeholder="Optional notes"
                {...createForm.register("notes")}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                  Line Items
                </label>
                <button
                  type="button"
                  onClick={() => append({ item_id: "", quantity: 1, discount: 0 })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#712ae2] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-[#e0e3e5] p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <select
                        className={inputClass}
                        {...createForm.register(`items.${index}.item_id`)}
                      >
                        <option value="">Select item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.item_name} (stock: {item.current_stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        className={inputClass}
                        {...createForm.register(`items.${index}.quantity`)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Discount"
                        className={inputClass}
                        {...createForm.register(`items.${index}.discount`)}
                      />
                    </div>
                    <div className="flex items-center justify-end sm:col-span-1">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded-lg p-2 text-[#ba1a1a] hover:bg-[#ffdad6]/50"
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {createForm.formState.errors.items?.message && (
                <p className="text-sm text-[#ba1a1a]">{createForm.formState.errors.items.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#45464d] hover:bg-[#eceef0]"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#712ae2] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a1fb8] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Invoice
              </button>
            </div>
          </form>
        ) : (
          existingInvoice && (
            <form className="space-y-4" onSubmit={editForm.handleSubmit(onEditSubmit)}>
              <div className="rounded-lg bg-[#f2f4f6] p-4 text-sm">
                <p className="font-semibold text-[#191c1e]">{existingInvoice.invoice_number}</p>
                <p className="mt-1 text-[#45464d]">
                  {new Date(existingInvoice.invoice_date).toLocaleDateString("en-IN")} ·{" "}
                  {formatCurrency(Number(existingInvoice.grand_total))}
                </p>
                <ul className="mt-3 space-y-1 border-t border-[#e0e3e5] pt-3">
                  {existingInvoice.items.map((line) => (
                    <li key={line.id} className="flex justify-between text-[#45464d]">
                      <span>
                        {line.item_name} × {line.quantity}
                      </span>
                      <span>{formatCurrency(Number(line.line_total))}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                  Payment Status
                </label>
                <select className={cn(inputClass, "mt-1")} {...editForm.register("payment_status")}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">
                  Notes
                </label>
                <textarea
                  className={cn(inputClass, "mt-1 min-h-[72px] resize-none py-2")}
                  {...editForm.register("notes")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-[#45464d] hover:bg-[#eceef0]"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#712ae2] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a1fb8] disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
