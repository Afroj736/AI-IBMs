"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { BillingInvoice } from "@/types/billing";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

interface InvoiceCardProps {
  invoice: BillingInvoice;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function InvoiceCard({ invoice, isSelected, onSelect }: InvoiceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(invoice.id)}
      className={cn(
        "group flex h-[110px] w-full flex-col justify-between rounded-lg border p-4 text-left transition-all duration-200",
        isSelected
          ? "border-2 border-primary bg-primary/5 shadow-card"
          : "border-border bg-white shadow-card hover:-translate-y-0.5 hover:shadow-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold text-foreground">{invoice.customer_name}</p>
            {invoice.is_sample && (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                Sample
              </span>
            )}
          </div>
          <p className="truncate text-xs text-secondary">
            {invoice.invoice_type === "gst"
              ? "GST Invoice"
              : invoice.invoice_type === "retail"
                ? "Retail Bill"
                : invoice.invoice_number}
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="flex items-end justify-between">
        <p className="text-xs text-secondary">{formatDate(invoice.invoice_date)}</p>
        <p className="text-lg font-bold text-foreground">{formatCurrency(invoice.amount)}</p>
      </div>
    </button>
  );
}

export function InvoiceCardSkeleton() {
  return (
    <div className="flex h-[110px] w-full flex-col justify-between rounded-lg border border-border bg-white p-4">
      <div className="space-y-2">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
