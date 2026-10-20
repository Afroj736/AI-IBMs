import { ItemsListPage } from "@/components/inventory/items-list-page";

export const metadata = {
  title: "All Items | SmartBill AI",
  description: "Browse, search, and filter your inventory items"
};

export default function InventoryItemsRoutePage() {
  return <ItemsListPage />;
}
