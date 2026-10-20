"use client";

import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PartyInvoiceFormDialog } from "@/components/parties/party-invoice-form-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn, formatCurrency } from "@/lib/utils";
import { deleteInvoice } from "@/services/invoice-service";
import { getParty, getPartyTransactions, type PartyTransaction } from "@/services/party-service";
import type { Party } from "@/types/party";

interface PartyDetailDialogProps {
  partyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openCreateOnLoad?: boolean;
  onCreateOnLoadHandled?: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#45464d]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#191c1e]">{value}</dd>
    </div>
  );
}

function paymentBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-cyan-100 text-cyan-800";
  if (s === "partial") return "bg-[#eaddff] text-[#5a00c6]";
  if (s === "cancelled") return "bg-[#ffdad6] text-[#93000a]";
  return "bg-[#e6e8ea] text-[#45464d]";
}

export function PartyDetailDialog({
  partyId,
  open,
  onOpenChange,
  openCreateOnLoad = false,
  onCreateOnLoadHandled
}: PartyDetailDialogProps) {
  const [party, setParty] = useState<Party | null>(null);
  const [invoices, setInvoices] = useState<PartyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [invoiceFormMode, setInvoiceFormMode] = useState<"create" | "edit">("create");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceParty, setInvoiceParty] = useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!partyId || !open) return;
    setLoading(true);
    setInvoices([]);
    try {
      const partyData = await getParty(partyId);
      setParty(partyData);
      try {
        const invoiceData = await getPartyTransactions(partyId);
        setInvoices(invoiceData);
      } catch (invoiceError) {
        toast.error(getApiErrorMessage(invoiceError, "Could not load invoices for this party"));
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load party details"));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [partyId, open, onOpenChange]);

  useEffect(() => {
    if (open && partyId) {
      void load();
    } else {
      setParty(null);
      setInvoices([]);
      setInvoiceFormOpen(false);
      setInvoiceParty(null);
      setSelectedInvoiceId(null);
    }
  }, [open, partyId, load]);

  const openCreateInvoice = useCallback(() => {
    if (!party) return;
    setInvoiceParty({ id: party.id, name: party.name });
    setInvoiceFormMode("create");
    setSelectedInvoiceId(null);
    setInvoiceFormOpen(true);
  }, [party]);

  const openEditInvoice = (invoiceId: string) => {
    if (!party) return;
    setInvoiceParty({ id: party.id, name: party.name });
    setInvoiceFormMode("edit");
    setSelectedInvoiceId(invoiceId);
    setInvoiceFormOpen(true);
  };

  useEffect(() => {
    if (!open || loading || !party || !openCreateOnLoad || invoiceFormOpen) return;
    openCreateInvoice();
    onCreateOnLoadHandled?.();
  }, [open, loading, party, openCreateOnLoad, invoiceFormOpen, openCreateInvoice, onCreateOnLoadHandled]);

  const handleDialogOpenChange = (next: boolean) => {
    if (!next && invoiceFormOpen) return;
    if (!next) {
      setInvoiceFormOpen(false);
      setInvoiceParty(null);
      setSelectedInvoiceId(null);
    }
    onOpenChange(next);
  };

  const handleInvoiceFormOpenChange = (next: boolean) => {
    setInvoiceFormOpen(next);
    if (!next) {
      setInvoiceParty(null);
      setSelectedInvoiceId(null);
    }
  };

  const handleDeleteInvoice = async (inv: PartyTransaction) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    setDeletingId(inv.invoice_id);
    try {
      await deleteInvoice(inv.invoice_id);
      toast.success("Invoice deleted");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete invoice"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[min(1100px,95vw)] max-w-[min(1100px,95vw)] gap-0 overflow-hidden p-0"
        onInteractOutside={(event) => {
          if (invoiceFormOpen) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (invoiceFormOpen) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (invoiceFormOpen) event.preventDefault();
        }}
      >
        {loading || !party ? (
          <div className="flex min-h-[320px] items-center justify-center p-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#712ae2]" />
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-[#e0e3e5] bg-[#f2f4f6]/60 px-6 py-5 text-left">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
                <div>
                  <DialogTitle className="text-xl font-bold text-[#191c1e]">{party.name}</DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-[#45464d]">
                    {party.party_code} · {party.party_type}
                  </DialogDescription>
                </div>
                <Link
                  href={`/customers/edit/${party.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#712ae2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a1fb8]"
                  onClick={() => onOpenChange(false)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Party
                </Link>
              </div>
            </DialogHeader>

            <div className="grid max-h-[calc(90vh-88px)] grid-cols-1 overflow-hidden lg:grid-cols-2">
              {/* Left — Party details */}
              <div className="overflow-y-auto border-b border-[#e0e3e5] p-6 lg:border-b-0 lg:border-r">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#712ae2]">
                  Party Details
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailRow label="Party Type" value={party.party_type} />
                  <DetailRow label="Status" value={party.status} />
                  <DetailRow label="Trade Name" value={party.business_name ?? "—"} />
                  <DetailRow label="Mobile" value={party.mobile} />
                  <DetailRow label="Alt. Mobile" value={party.alternate_mobile ?? "—"} />
                  <DetailRow label="Email" value={party.email ?? "—"} />
                  <DetailRow label="GST Number" value={party.gstin ?? "—"} />
                  <DetailRow label="PAN Number" value={party.pan_number ?? "—"} />
                  <DetailRow label="City" value={party.city ?? "—"} />
                  <DetailRow label="State" value={party.state ?? "—"} />
                  <DetailRow label="Pincode" value={party.pincode ?? "—"} />
                  <DetailRow label="Country" value={party.country ?? "—"} />
                  <DetailRow label="Credit Limit" value={formatCurrency(Number(party.credit_limit))} />
                  <DetailRow
                    label="Opening Balance"
                    value={formatCurrency(Number(party.opening_balance))}
                  />
                  {party.billing_address && (
                    <div className="sm:col-span-2">
                      <DetailRow label="Billing Address" value={party.billing_address} />
                    </div>
                  )}
                  {party.shipping_address && (
                    <div className="sm:col-span-2">
                      <DetailRow label="Shipping Address" value={party.shipping_address} />
                    </div>
                  )}
                  {party.notes && (
                    <div className="sm:col-span-2">
                      <DetailRow label="Notes" value={party.notes} />
                    </div>
                  )}
                </dl>
              </div>

              {/* Right — Invoices */}
              <div className="flex flex-col overflow-hidden bg-[#fafbfc]">
                <div className="flex items-center justify-between gap-3 border-b border-[#e0e3e5] px-6 py-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#712ae2]">
                      Invoices
                    </h3>
                    <p className="mt-1 text-sm text-[#45464d]">
                      {invoices.length} invoice{invoices.length === 1 ? "" : "s"} for this party
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateInvoice}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#712ae2] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#5a1fb8]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c6c6cd] bg-white px-6 py-12 text-center">
                      <FileText className="mb-3 h-10 w-10 text-[#76777d]" />
                      <p className="text-sm font-semibold text-[#191c1e]">No invoices yet</p>
                      <p className="mt-1 text-sm text-[#45464d]">
                        Create an invoice for this party to get started.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateInvoice}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#712ae2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a1fb8]"
                      >
                        <Plus className="h-4 w-4" />
                        Create Invoice
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {invoices.map((inv) => (
                        <li
                          key={inv.invoice_id}
                          className="rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-sm transition hover:border-[#712ae2]/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#191c1e]">{inv.invoice_number}</p>
                              <p className="mt-1 text-sm text-[#45464d]">
                                {new Date(inv.date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#191c1e]">
                                {formatCurrency(Number(inv.grand_total))}
                              </p>
                              <span
                                className={cn(
                                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                  paymentBadgeClass(inv.payment_status)
                                )}
                              >
                                {inv.payment_status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-1 border-t border-[#e0e3e5] pt-3">
                            <button
                              type="button"
                              onClick={() => openEditInvoice(inv.invoice_id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#45464d] hover:bg-[#eceef0]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteInvoice(inv)}
                              disabled={deletingId === inv.invoice_id}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/50 disabled:opacity-50"
                            >
                              {deletingId === inv.invoice_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    {invoiceParty && (
      <PartyInvoiceFormDialog
        partyId={invoiceParty.id}
        partyName={invoiceParty.name}
        invoiceId={selectedInvoiceId}
        mode={invoiceFormMode}
        open={invoiceFormOpen}
        onOpenChange={handleInvoiceFormOpenChange}
        onSaved={() => void load()}
      />
    )}
    </>
  );
}
