"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { BillingPageShell } from "@/components/billing/billing-page-shell";
import { InvoiceList } from "@/components/billing/invoice-list";
import { InvoicePreview } from "@/components/billing/invoice-preview";
import { useBillingStore } from "@/store/billing-store";

export function BillingWorkspace() {
  const searchParams = useSearchParams();
  const setSelectedInvoiceId = useBillingStore((s) => s.setSelectedInvoiceId);

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) {
      setSelectedInvoiceId(selected);
    }
  }, [searchParams, setSelectedInvoiceId]);

  return (
    <BillingPageShell>
      <main className="flex h-[calc(100vh-72px)] min-h-0 gap-6 overflow-hidden p-4 md:p-6">
        <InvoiceList />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <InvoicePreview />
        </div>
      </main>
    </BillingPageShell>
  );
}
