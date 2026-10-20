import { create } from "zustand";

import type { InvoiceFilterTab, VoiceDraftExtraction } from "@/types/billing";

interface BillingUIState {
  selectedInvoiceId: string | null;
  activeFilter: InvoiceFilterTab;
  searchQuery: string;
  globalSearchQuery: string;
  isMenuOpen: boolean;
  isVoiceModalOpen: boolean;
  voiceProcessing: boolean;
  voiceExtraction: VoiceDraftExtraction | null;

  setSelectedInvoiceId: (id: string | null) => void;
  setActiveFilter: (filter: InvoiceFilterTab) => void;
  setSearchQuery: (query: string) => void;
  setGlobalSearchQuery: (query: string) => void;
  setMenuOpen: (open: boolean) => void;
  setVoiceModalOpen: (open: boolean) => void;
  setVoiceProcessing: (processing: boolean) => void;
  setVoiceExtraction: (extraction: VoiceDraftExtraction | null) => void;
  resetVoiceState: () => void;
}

export const useBillingStore = create<BillingUIState>((set) => ({
  selectedInvoiceId: null,
  activeFilter: "all",
  searchQuery: "",
  globalSearchQuery: "",
  isMenuOpen: false,
  isVoiceModalOpen: false,
  voiceProcessing: false,
  voiceExtraction: null,

  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  setVoiceModalOpen: (open) => set({ isVoiceModalOpen: open }),
  setVoiceProcessing: (processing) => set({ voiceProcessing: processing }),
  setVoiceExtraction: (extraction) => set({ voiceExtraction: extraction }),
  resetVoiceState: () =>
    set({
      isVoiceModalOpen: false,
      voiceProcessing: false,
      voiceExtraction: null
    })
}));
