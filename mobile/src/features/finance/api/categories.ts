import { apiFetch } from "@/lib/api/client";
import type { Category, PaginatedList } from "@/features/finance/types";

export function listCategories(): Promise<PaginatedList<Category>> {
  return apiFetch<PaginatedList<Category>>("/api/v1/categories");
}
