import { Suspense } from "react";

import { CreateInvoicePage } from "@/components/billing/create-invoice-page";

export const metadata = {
  title: "Create Invoice | SmartBill AI",
  description: "Create a new GST or retail invoice manually"
};

export default function BillingCreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateInvoicePage />
    </Suspense>
  );
}
