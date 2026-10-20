import { Suspense } from "react";

import { EditPartyPage } from "@/components/parties/edit-party-page";

export const metadata = {
  title: "Edit Party | SmartBill AI",
  description: "Update customer or supplier details"
};

function EditPartyFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#F8FAFC]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
    </div>
  );
}

export default function EditPartyRoutePage() {
  return (
    <Suspense fallback={<EditPartyFallback />}>
      <EditPartyPage />
    </Suspense>
  );
}
