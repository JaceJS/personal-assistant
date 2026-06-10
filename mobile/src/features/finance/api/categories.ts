import { apiFetch } from "@/lib/api/client";
import type { ApiResponse, Category, CategoryCreate, CategoryUpdate } from "@/features/finance/types";

export function listCategories(): Promise<Category[]> {
  return apiFetch<ApiResponse<Category[]>>("/api/v1/categories")
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
