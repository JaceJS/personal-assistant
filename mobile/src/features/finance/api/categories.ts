import { apiFetch } from "@/lib/api/client";
import type { Category, CategoryCreate } from "@/features/finance/types";

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/v1/categories");
}

export function createCategory(data: CategoryCreate): Promise<Category> {
  return apiFetch<Category>("/api/v1/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
