"use client";

import { useParams, useRouter } from "next/navigation";

import { BillingHeader } from "@/components/billing/billing-header";
import { HamburgerMenu } from "@/components/billing/hamburger-menu";
import { VoiceFab } from "@/components/billing/voice-fab";
import { VoiceModal } from "@/components/billing/voice-modal";
import { PartyDetailDialog } from "@/components/parties/party-detail-dialog";

export function PartyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC]">
      <BillingHeader />
      <HamburgerMenu />
      <VoiceModal />

      <PartyDetailDialog
        partyId={id ?? null}
        open={Boolean(id)}
        onOpenChange={(open) => {
          if (!open) router.push("/customers");
        }}
      />

      <VoiceFab />
    </div>
  );
}
