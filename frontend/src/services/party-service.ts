import { api } from "@/services/api";
import type { Party } from "@/types/party";

export async function listParties(params?: { search?: string; party_type?: string }) {
  const { data } = await api.get<Party[]>("/parties", { params });
  return data;
}

export async function getParty(id: string) {
  const { data } = await api.get<Party>(`/parties/${id}`);
  return data;
}

export async function createParty(payload: Record<string, unknown>) {
  const { data } = await api.post<Party>("/parties", payload);
  return data;
}

export async function updateParty(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Party>(`/parties/${id}`, payload);
  return data;
}

export async function deleteParty(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/parties/${id}`);
  return data;
}

export interface PartyTransaction {
  invoice_id: string;
  invoice_number: string;
  date: string;
  grand_total: number;
  payment_status: string;
}

export async function getPartyTransactions(partyId: string) {
  const { data } = await api.get<PartyTransaction[]>(`/parties/${partyId}/transactions`);
  return data;
}
