import { api } from "@/services/api";
import type { Invoice, PaymentStatus } from "@/types/invoice";

export async function listInvoices(search?: string) {
  const { data } = await api.get<Invoice[]>("/invoices", { params: { search } });
  return data;
}

export async function getInvoice(id: string) {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export interface NextInvoiceNumber {
  invoice_number: string;
  prefix: string;
  sequence: number;
  invoice_type: "gst" | "retail";
}

export async function getNextInvoiceNumber(type: "gst" | "retail" = "retail") {
  const { data } = await api.get<NextInvoiceNumber>("/invoices/next-number", {
    params: { type }
  });
  return data;
}

export async function createInvoice(payload: Record<string, unknown>) {
  const { data } = await api.post<Invoice>("/invoices", payload);
  return data;
}

export interface InvoiceUpdatePayload {
  invoice_date?: string;
  template_id?: string | null;
  discount_amount?: number;
  round_off?: number;
  received_amount?: number;
  payment_status?: PaymentStatus;
  notes?: string | null;
  items?: Array<{
    item_id: string;
    quantity: number;
    discount: number;
    rate?: number;
    gst_percent?: number;
  }>;
}

export async function updateInvoice(id: string, payload: InvoiceUpdatePayload) {
  const { data } = await api.put<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function deleteInvoice(id: string) {
  const { data } = await api.delete<{ message: string }>(`/invoices/${id}`);
  return data;
}
