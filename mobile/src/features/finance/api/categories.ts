import { apiFetch } from "@/lib/api/client";
import type { ApiResponse, Category, CategoryCreate, CategoryUpdate } from "@/features/finance/types";

export function listCategories(params?: { updatedSince?: string }): Promise<Category[]> {
  const qs = params?.updatedSince ? `?updated_since=${encodeURIComponent(params.updatedSince)}` : "";
  return apiFetch<ApiResponse<Category[]>>(`/api/v1/categories${qs}`)
    .then(r => r.data);
}

export function createCategory(data: CategoryCreate): Promise<Category> {
  return apiFetch<ApiResponse<Category>>("/api/v1/categories", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function updateCategory(id: string, data: CategoryUpdate): Promise<Category> {
  return apiFetch<ApiResponse<Category>>(`/api/v1/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function archiveCategory(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/categories/${id}`, { method: "DELETE" });
}
