export interface Brand {
  id: string;
  name: string;
  product_count: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  subcategory_count: number;
  unit_count: number;
  created_at: string;
}

export interface CatalogBulkResult {
  brand: Brand | null;
  category: Category | null;
}
