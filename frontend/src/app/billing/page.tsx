import { Suspense } from "react";

import { BillingWorkspace } from "@/components/billing/billing-workspace";

export const metadata = {
  title: "Home | SmartBill AI",
  description: "Your billing home — sample invoices and voice invoice creation"
};

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingWorkspace />
    </Suspense>
  );
}
