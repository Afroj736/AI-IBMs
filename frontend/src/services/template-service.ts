import { api } from "@/services/api";
import type { InvoiceTemplate } from "@/types/invoice-template";

export async function listTemplates() {
  const { data } = await api.get<InvoiceTemplate[]>("/invoice-templates");
  return data;
}

export async function createTemplate(payload: Record<string, unknown>) {
  const { data } = await api.post<InvoiceTemplate>("/invoice-templates", payload);
  return data;
}

export async function activateTemplate(id: string) {
  const { data } = await api.post<InvoiceTemplate>(`/invoice-templates/${id}/activate`);
  return data;
}

export async function getTemplate(id: string) {
  const { data } = await api.get<InvoiceTemplate>(`/invoice-templates/${id}`);
  return data;
}

export async function updateTemplate(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<InvoiceTemplate>(`/invoice-templates/${id}`, payload);
  return data;
}

export async function deleteTemplate(id: string) {
  await api.delete(`/invoice-templates/${id}`);
}

export async function duplicateTemplate(id: string) {
  const { data } = await api.post<InvoiceTemplate>(`/invoice-templates/${id}/duplicate`);
  return data;
}
