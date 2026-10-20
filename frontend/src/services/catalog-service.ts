import { api } from "@/services/api";
import type { Brand, CatalogBulkResult, Category } from "@/types/catalog";

export async function listBrands(): Promise<Brand[]> {
  const { data } = await api.get<Brand[]>("/inventory/brands");
  return data;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/inventory/categories");
  return data;
}

export async function createBrand(name: string): Promise<Brand> {
  const { data } = await api.post<Brand>("/inventory/brands", { name });
  return data;
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<Category>("/inventory/categories", { name });
  return data;
}

export async function createCatalogBulk(payload: {
  brand_name?: string;
  category_name?: string;
}): Promise<CatalogBulkResult> {
  const { data } = await api.post<CatalogBulkResult>("/inventory/catalog/bulk", payload);
  return data;
}

export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`/inventory/brands/${id}`);
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/inventory/categories/${id}`);
}
