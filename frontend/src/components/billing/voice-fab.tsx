"use client";

import { Mic } from "lucide-react";

import { useBillingStore } from "@/store/billing-store";
import { cn } from "@/lib/utils";

export function VoiceFab() {
  const setVoiceModalOpen = useBillingStore((s) => s.setVoiceModalOpen);

  return (
    <button
      type="button"
      onClick={() => setVoiceModalOpen(true)}
      className={cn(
        "fixed bottom-8 right-8 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-fab transition-all duration-200 hover:scale-105 hover:bg-[#1D4ED8] active:bg-[#1E40AF]"
      )}
      aria-label="Record voice invoice"
    >
      <Mic className="h-7 w-7" />
    </button>
  );
}
