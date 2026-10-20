"use client";

import { formatCurrency } from "@/lib/utils";
import type { BillingLineItem } from "@/types/billing";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceTableProps {
  items: BillingLineItem[];
  isLoading?: boolean;
}

export function InvoiceTable({ items, isLoading }: InvoiceTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="max-h-[400px] overflow-auto scrollbar-thin">
        <table className="w-full min-w-[800px] border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="h-12 border-b border-border">
              <th className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary">#</th>
              <th className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                Item Name
              </th>
              <th className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                HSN/SAC
              </th>
              <th className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                Serial No
              </th>
              <th className="px-3 text-right text-xs font-semibold uppercase tracking-wide text-secondary">Qty</th>
              <th className="px-3 text-right text-xs font-semibold uppercase tracking-wide text-secondary">
                Unit Price
              </th>
              <th className="px-3 text-right text-xs font-semibold uppercase tracking-wide text-secondary">
                GST %
              </th>
              <th className="px-3 text-right text-xs font-semibold uppercase tracking-wide text-secondary">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className="h-[52px] border-b border-border transition-colors duration-200 last:border-b-0 hover:bg-muted/50"
              >
                <td className="px-3 text-sm text-secondary">{index + 1}</td>
                <td className="px-3 text-sm font-medium text-foreground">{item.item_name}</td>
                <td className="px-3 text-sm text-secondary">{item.hsn_sac}</td>
                <td className="px-3 text-sm text-secondary">{item.serial_no ?? "—"}</td>
                <td className="px-3 text-right text-sm text-foreground">{item.quantity}</td>
                <td className="px-3 text-right text-sm text-foreground">{formatCurrency(item.unit_price)}</td>
                <td className="px-3 text-right text-sm text-secondary">{item.gst_percent}%</td>
                <td className="px-3 text-right text-sm font-semibold text-foreground">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
