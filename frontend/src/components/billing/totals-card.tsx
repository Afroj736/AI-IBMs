import { formatCurrency } from "@/lib/utils";
import type { BillingTotals } from "@/types/billing";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface TotalsCardProps {
  totals?: BillingTotals;
  notes?: string | null;
  isLoading?: boolean;
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-secondary"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function TotalsCard({ totals, notes, isLoading }: TotalsCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!totals) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <div className="flex h-[120px] flex-col justify-center rounded-lg border border-border p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Amount in Words</p>
          <p className="text-sm font-medium italic text-foreground">{totals.amount_in_words}</p>
        </div>
        <div className="flex h-[120px] flex-col rounded-lg border border-border p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</p>
          <p className="line-clamp-3 text-sm text-secondary">{notes ?? "No notes added."}</p>
        </div>
      </div>

      <div className="w-full rounded-lg border border-border p-6 lg:w-[400px] lg:justify-self-end">
        <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
        <TotalRow label="CGST" value={formatCurrency(totals.cgst)} />
        <TotalRow label="SGST" value={formatCurrency(totals.sgst)} />
        <TotalRow label="IGST" value={formatCurrency(totals.igst)} />
        {totals.discount > 0 && (
          <TotalRow label="Discount" value={`-${formatCurrency(totals.discount)}`} />
        )}

        <Separator className="my-3" />

        <div className="flex items-center justify-between py-2">
          <span className="text-base font-bold text-foreground">Grand Total</span>
          <span className="text-[32px] font-bold text-primary">{formatCurrency(totals.grand_total)}</span>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between py-2">
          <span className="text-base font-bold text-foreground">Received Amount</span>
          <span className="text-[22px] font-bold text-success">{formatCurrency(totals.received_amount)}</span>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between py-2">
          <span className="text-base font-bold text-foreground">Balance Amount</span>
          <span className="text-2xl font-bold text-danger">{formatCurrency(totals.balance_amount)}</span>
        </div>
      </div>
    </div>
  );
}
