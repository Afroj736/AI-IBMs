"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createInvoiceFromPayload,
  fetchBusinessInfo,
  fetchInvoiceById,
  fetchInvoices,
  processVoiceAudio
} from "@/services/billing-service";
import { useBillingStore } from "@/store/billing-store";
import type { CreateInvoicePayload, InvoiceListParams } from "@/types/billing";

export const billingKeys = {
  all: ["billing"] as const,
  invoices: (params?: InvoiceListParams) => [...billingKeys.all, "invoices", params] as const,
  invoice: (id: string) => [...billingKeys.all, "invoice", id] as const,
  business: () => [...billingKeys.all, "business"] as const
};

export function useInvoices() {
  const activeFilter = useBillingStore((s) => s.activeFilter);
  const searchQuery = useBillingStore((s) => s.searchQuery);

  const params: InvoiceListParams = {
    status: activeFilter,
    search: searchQuery || undefined
  };

  return useQuery({
    queryKey: billingKeys.invoices(params),
    queryFn: () => fetchInvoices(params)
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: billingKeys.invoice(id ?? ""),
    queryFn: () => (id ? fetchInvoiceById(id) : null),
    enabled: !!id
  });
}

export function useBusinessInfo() {
  return useQuery({
    queryKey: billingKeys.business(),
    queryFn: fetchBusinessInfo
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const setSelectedInvoiceId = useBillingStore((s) => s.setSelectedInvoiceId);

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoiceFromPayload(payload),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      setSelectedInvoiceId(invoice.id);
    }
  });
}

export function useProcessVoice() {
  const setVoiceProcessing = useBillingStore((s) => s.setVoiceProcessing);
  const setVoiceExtraction = useBillingStore((s) => s.setVoiceExtraction);

  return useMutation({
    mutationFn: (audioBlob: Blob) => processVoiceAudio(audioBlob),
    onMutate: () => setVoiceProcessing(true),
    onSuccess: (extraction) => {
      setVoiceExtraction(extraction);
      setVoiceProcessing(false);
    },
    onError: () => setVoiceProcessing(false)
  });
}
