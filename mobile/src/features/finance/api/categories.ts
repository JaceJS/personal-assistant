import { apiFetch } from "@/lib/api/client";
import type { ApiResponse, Category, CategoryCreate } from "@/features/finance/types";

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
