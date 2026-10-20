import { Suspense } from "react";

import { CreatePartyPage } from "@/components/parties/create-party-page";

export const metadata = {
  title: "Add Party | Equinox AI",
  description: "Onboard a new customer or supplier"
};

function CreatePartyFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#F8FAFC]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
    </div>
  );
}

export default function CreatePartyRoutePage() {
  return (
    <Suspense fallback={<CreatePartyFallback />}>
      <CreatePartyPage />
    </Suspense>
  );
}
