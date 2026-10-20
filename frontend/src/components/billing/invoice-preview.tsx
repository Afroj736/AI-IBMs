"use client";

import { Edit, Mic, MoreHorizontal, Printer } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceEditor } from "@/components/billing/invoice-editor";
import { useBusinessInfo, useInvoice } from "@/hooks/use-invoices";
import { useBillingStore } from "@/store/billing-store";
import { BusinessHeader } from "./business-header";
import { BillToCard } from "./bill-to-card";
import { ShipToCard } from "./ship-to-card";
import { InvoiceTable } from "./invoice-table";
import { TotalsCard } from "./totals-card";
import { SignatureSection } from "./signature-section";
import { StatusBadge } from "./status-badge";

export function InvoicePreview() {
  const selectedInvoiceId = useBillingStore((s) => s.selectedInvoiceId);
  const setVoiceModalOpen = useBillingStore((s) => s.setVoiceModalOpen);
  const [isEditing, setIsEditing] = useState(false);

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(selectedInvoiceId);

  useEffect(() => {
    setIsEditing(false);
  }, [selectedInvoiceId]);
  const { data: business, isLoading: businessLoading } = useBusinessInfo();

  const isLoading = invoiceLoading || businessLoading;

  if (!selectedInvoiceId) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-card md:p-12">
        <button
          type="button"
          onClick={() => setVoiceModalOpen(true)}
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-white shadow-fab transition-all duration-200 hover:scale-105 hover:bg-primary-hover"
          aria-label="Record voice invoice"
        >
          <Mic className="h-12 w-12" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Create your first invoice</h2>
        <p className="mt-2 max-w-sm text-sm text-secondary">
          Tap the mic and describe the sale — customer, items, and prices. Or pick an invoice on the left
          to preview details. Use <span className="font-medium text-foreground">New Invoice</span> for voice
          or manual billing.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full min-h-0 flex-1 space-y-6 overflow-y-auto rounded-xl bg-white p-6 shadow-card scrollbar-thin">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-[180px] w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-[180px] flex-1" />
          <Skeleton className="h-[180px] flex-1" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center rounded-xl bg-white p-12 shadow-card">
        <p className="text-sm text-secondary">Invoice not found</p>
      </div>
    );
  }

  const typeLabel =
    invoice.invoice_type === "retail"
      ? "Retail Bill"
      : invoice.invoice_type === "gst"
        ? "GST Invoice"
        : null;

  if (isEditing) {
    return (
      <InvoiceEditor
        invoice={invoice}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-card">
      {invoice.is_sample && (
        <div className="shrink-0 border-b border-primary/20 bg-primary/5 px-6 py-2 text-center text-xs font-medium text-primary">
          Sample invoice — for preview only. Use the mic to create your own.
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">{invoice.invoice_number}</h2>
          {typeLabel && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-secondary">
              {typeLabel}
            </span>
          )}
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center gap-2">
          {!invoice.is_sample && (
            <>
              <Button
                variant="outline"
                className="h-10 gap-2"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" className="h-10 gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" className="h-10 w-10">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <BusinessHeader business={business} invoice={invoice} />
          <div className="flex gap-4">
            <BillToCard address={invoice.bill_to} />
            <ShipToCard address={invoice.ship_to} />
          </div>
          <InvoiceTable items={invoice.line_items} />
          <TotalsCard totals={invoice.totals} notes={invoice.notes} />
          <SignatureSection
            signatureUrl={business?.signature_url}
            sealUrl={business?.seal_url}
          />
        </div>
      </div>
    </div>
  );
}
