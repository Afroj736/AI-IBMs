"use client";

import type { InvoiceStatus } from "@/types/billing";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<InvoiceStatus, { label: string; variant: "paid" | "draft" | "overdue" | "sent" }> = {
  paid: { label: "Paid", variant: "paid" },
  draft: { label: "Draft", variant: "draft" },
  overdue: { label: "Overdue", variant: "overdue" },
  sent: { label: "Sent", variant: "sent" }
};

interface StatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn("text-xs font-semibold capitalize", className)}>
      {config.label}
    </Badge>
  );
}
