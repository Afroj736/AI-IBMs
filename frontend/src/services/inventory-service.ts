import { api } from "@/services/api";
import type { InventoryItem } from "@/types/item";
import type { InventoryItemSummary } from "@/types/voice-billing";
import type { ItemFormValues } from "@/validators/item";

export async function listInventoryItems(): Promise<InventoryItemSummary[]> {
  const { data } = await api.get<InventoryItemSummary[]>("/inventory/items");
  return data;
}

export async function listItems(): Promise<InventoryItem[]> {
  const { data } = await api.get<InventoryItem[]>("/inventory/items");
  return data;
}

export async function createItem(payload: ItemFormValues): Promise<InventoryItem> {
  const { data } = await api.post<InventoryItem>("/inventory/items", payload);
  return data;
}
export interface AiValidateLinesResult {
  accepted: { item_code: string; quantity: number }[];
  rejected: { item_code: string; reason: string }[];
}

export async function validateAiBillLines(
  lines: { item_code: string; quantity: number }[],
  createMissingAsDraft = false
): Promise<AiValidateLinesResult> {
  const { data } = await api.post<AiValidateLinesResult>("/billing/ai-validate-lines", {
    lines,
    create_missing_as_draft: createMissingAsDraft
  });
  return data;
}
