import type { Party } from "@/types/party";
import type { VoiceDraft, VoiceDraftItem } from "@/types/voice-entry";

export type VoiceBillingStep =
  | "setup"
  | "recording"
  | "processing"
  | "draft"
  | "success";

export type CustomerType = "existing" | "new";

export type ItemValidationStatus =
  | "valid"
  | "out_of_stock"
  | "inactive"
  | "not_found";

export interface InventoryItemSummary {
  id: string;
  item_code: string;
  item_name: string;
  current_stock: number;
  status: string;
  gst_percentage: number;
}

export interface DraftLineValidation {
  draftItemId: string;
  itemId: string;
  status: ItemValidationStatus;
  availableStock: number;
  requestedQty: number;
  message: string;
}

export interface VoiceDraftReviewContext {
  draft_id: string;
  validated_response: Record<string, unknown>;
  warnings: string[];
  missing_required_fields: string[];
}

export interface VoiceBillingSuccess {
  invoiceNumber: string;
  finalInvoiceId: string;
  draftId: string;
}

export interface VoiceBillingDraftState {
  draft: VoiceDraft;
  transcript: string;
  party: Party | null;
  reviewContext: VoiceDraftReviewContext | null;
  lineValidations: DraftLineValidation[];
}

export function templateLabel(name: string, type?: string): string {
  if (name) return name;
  return type?.replace(/_/g, " ") ?? "Retail GST Invoice";
}

export function buildDraftUpdatePayload(
  draft: VoiceDraft,
  templateId: string | null,
  items: VoiceDraftItem[]
) {
  return {
    template_id: templateId,
    items: items.map((item) => ({
      item_id: item.item_id,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      discount: Number(item.discount ?? 0)
    }))
  };
}

export function resolveItemValidation(
  item: VoiceDraftItem,
  inventory?: InventoryItemSummary | null
): DraftLineValidation {
  const requestedQty = Number(item.quantity);
  if (!inventory) {
    return {
      draftItemId: item.id,
      itemId: item.item_id,
      status: "not_found",
      availableStock: 0,
      requestedQty,
      message: "Item not found in inventory"
    };
  }
  if (inventory.status === "pending_review") {
    return {
      draftItemId: item.id,
      itemId: item.item_id,
      status: "valid",
      availableStock: Math.max(inventory.current_stock, requestedQty),
      requestedQty,
      message: "New AI item — will activate when invoice is created"
    };
  }
  if (inventory.status !== "active") {
    return {
      draftItemId: item.id,
      itemId: item.item_id,
      status: "inactive",
      availableStock: inventory.current_stock,
      requestedQty,
      message: "Inactive item — update status in inventory"
    };
  }
  if (inventory.current_stock < requestedQty) {
    return {
      draftItemId: item.id,
      itemId: item.item_id,
      status: "out_of_stock",
      availableStock: inventory.current_stock,
      requestedQty,
      message: "Out of stock"
    };
  }
  return {
    draftItemId: item.id,
    itemId: item.item_id,
    status: "valid",
    availableStock: inventory.current_stock,
    requestedQty,
    message: "Valid"
  };
}
