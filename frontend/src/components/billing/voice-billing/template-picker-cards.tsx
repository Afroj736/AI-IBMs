"use client";

import { Building2, CheckCircle2, ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InvoiceTemplate } from "@/types/invoice-template";

export type TemplateCardKey = "gst" | "retail";

export interface TemplateCardOption {
  key: TemplateCardKey;
  title: string;
  subtitle: string;
  template: InvoiceTemplate | null;
}

export function resolveTemplateCards(templates: InvoiceTemplate[]): TemplateCardOption[] {
  const gst =
    templates.find(
      (t) =>
        t.template_type === "tax_invoice" ||
        (t.template_name.toLowerCase().includes("gst") &&
          !t.template_name.toLowerCase().includes("retail"))
    ) ?? null;

  const retail =
    templates.find(
      (t) =>
        t.template_type === "retail_gst_invoice" ||
        t.template_name.toLowerCase().includes("retail")
    ) ??
    templates.find((t) => t.status === "active") ??
    templates[0] ??
    null;

  return [
    {
      key: "gst",
      title: "GST Billing Template",
      subtitle: "Tax-compliant structures",
      template: gst ?? retail
    },
    {
      key: "retail",
      title: "Retail Billing Template",
      subtitle: "Standard POS layout",
      template: retail ?? gst
    }
  ];
}

interface TemplatePickerCardsProps {
  cards: TemplateCardOption[];
  selectedKey: TemplateCardKey;
  onSelect: (key: TemplateCardKey, templateId: string) => void;
  disabled?: boolean;
}

export function TemplatePickerCards({
  cards,
  selectedKey,
  onSelect,
  disabled
}: TemplatePickerCardsProps) {
  return (
    <section>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#76777d]">
        Select billing template
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const isSelected = selectedKey === card.key;
          const Icon = card.key === "gst" ? Building2 : ShoppingCart;

          return (
            <button
              key={card.key}
              type="button"
              disabled={disabled || !card.template}
              onClick={() => card.template && onSelect(card.key, card.template.id)}
              className={cn(
                "group flex items-center justify-between rounded-xl border-2 p-5 text-left transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[#712AE2]/25",
                isSelected
                  ? "border-[#712AE2] bg-[#712AE2]/5"
                  : "border-[#E0E3E5] bg-white hover:border-[#712AE2]/40",
                (disabled || !card.template) && "cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                    isSelected
                      ? "bg-[#712AE2] text-white"
                      : "bg-[#E6E8EA] text-[#191c1e] group-hover:bg-[#712AE2] group-hover:text-white"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#191c1e]">{card.title}</p>
                  <p className="text-sm text-[#45464d]">{card.subtitle}</p>
                </div>
              </div>
              <CheckCircle2
                className={cn(
                  "h-6 w-6 shrink-0 text-[#712AE2] transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0"
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
