"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { DraftLineValidation, ItemValidationStatus } from "@/types/voice-billing";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  ItemValidationStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  valid: {
    label: "Found In Inventory",
    className: "text-success",
    icon: CheckCircle2
  },
  out_of_stock: {
    label: "Out Of Stock",
    className: "text-danger",
    icon: XCircle
  },
  inactive: {
    label: "Inactive Item",
    className: "text-danger",
    icon: XCircle
  },
  not_found: {
    label: "Item Not Found",
    className: "text-warning",
    icon: AlertTriangle
  }
};

export function ItemStatusBadge({ validation }: { validation: DraftLineValidation }) {
  const cfg = CONFIG[validation.status];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{cfg.label}</span>
    </div>
  );
}
