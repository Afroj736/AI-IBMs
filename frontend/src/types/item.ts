export type ItemStatus = "active" | "inactive" | "pending_review";

export interface InventoryItem {
  id: string;
  item_name: string;
  item_code: string;
  sku: string;
  barcode?: string | null;
  category?: string | null;
  sub_category?: string | null;
  brand?: string | null;
  model_number?: string | null;
  serial_number_required: boolean;
  hsn_code?: string | null;
  gst_percentage: number;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  current_stock: number;
  description?: string | null;
  status: ItemStatus;
  created_at: string;
}
