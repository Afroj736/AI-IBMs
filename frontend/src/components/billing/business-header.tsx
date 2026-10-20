"use client";

import { Building2 } from "lucide-react";

import { formatDate } from "@/lib/utils";
import type { BillingInvoice, BusinessInfo } from "@/types/billing";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessHeaderProps {
  business?: BusinessInfo;
  invoice?: BillingInvoice;
  isLoading?: boolean;
}

export function BusinessHeader({ business, invoice, isLoading }: BusinessHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex h-[180px] gap-6">
        <Skeleton className="h-[100px] w-[100px] shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="w-48 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!business || !invoice) return null;

  return (
    <div className="flex h-[180px] gap-6">
      <div className="flex shrink-0 items-start gap-4">
        <div className="flex h-[100px] w-[100px] items-center justify-center rounded-lg border border-border bg-muted">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt={business.name} className="h-full w-full rounded-lg object-cover" />
          ) : (
            <Building2 className="h-10 w-10 text-secondary" />
          )}
        </div>
        <div>
          <h2 className="text-[32px] font-bold leading-tight text-foreground">{business.name}</h2>
          <p className="mt-1 text-sm text-secondary">GST: {business.gst_number}</p>
          <p className="text-sm text-secondary">{business.phone}</p>
          <p className="text-sm text-secondary">{business.email}</p>
          <p className="mt-1 max-w-md text-sm text-secondary">{business.address}</p>
        </div>
      </div>

      <div className="ml-auto shrink-0 space-y-2 text-right">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Invoice Number</p>
          <p className="text-lg font-bold text-foreground">{invoice.invoice_number}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Invoice Date</p>
          <p className="text-sm font-medium text-foreground">{formatDate(invoice.invoice_date)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Due Date</p>
          <p className="text-sm font-medium text-foreground">{formatDate(invoice.due_date)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Place of Supply</p>
          <p className="text-sm font-medium text-foreground">{invoice.place_of_supply}</p>
        </div>
      </div>
    </div>
  );
}
