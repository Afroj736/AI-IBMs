import { Suspense } from "react";

import { PartiesPage } from "@/components/parties/parties-page";

export const metadata = {
  title: "Parties | SmartBill AI",
  description: "Manage customers and suppliers with AI-driven insights"
};

function PartiesFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#F8FAFC]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
    </div>
  );
}

export default function PartyListRoutePage() {
  return (
    <Suspense fallback={<PartiesFallback />}>
      <PartiesPage />
    </Suspense>
  );
}
