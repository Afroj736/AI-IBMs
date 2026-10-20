import { Suspense } from "react";

import { PartyDetailsPage } from "@/components/parties/party-details-page";

export const metadata = {
  title: "Party Details | SmartBill AI",
  description: "View customer or supplier details"
};

function PartyDetailsFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#F8FAFC]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
    </div>
  );
}

export default function PartyDetailsRoutePage() {
  return (
    <Suspense fallback={<PartyDetailsFallback />}>
      <PartyDetailsPage />
    </Suspense>
  );
}
