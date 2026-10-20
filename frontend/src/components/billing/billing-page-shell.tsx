"use client";

import { BillingHeader } from "@/components/billing/billing-header";
import { HamburgerMenu } from "@/components/billing/hamburger-menu";
import { VoiceFab } from "@/components/billing/voice-fab";
import { VoiceModal } from "@/components/billing/voice-modal";

/** Same chrome as the billing home page — header, menu, voice UI only. */
export function BillingPageShell({
  children,
  hideVoiceFab = false
}: {
  children: React.ReactNode;
  hideVoiceFab?: boolean;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-on-surface antialiased">
      <BillingHeader />
      <HamburgerMenu />
      <VoiceModal />
      {children}
      {!hideVoiceFab && <VoiceFab />}
    </div>
  );
}
