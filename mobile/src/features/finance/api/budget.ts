import { apiFetch } from "@/lib/api/client";
import type { ApiResponse, Budget, BudgetUpsert } from "@/features/finance/types";

export function getBudget(): Promise<Budget | null> {
  return apiFetch<ApiResponse<Budget | null>>("/api/v1/budget").then(r => r.data);
}

export function upsertBudget(data: BudgetUpsert): Promise<Budget> {
  return apiFetch<ApiResponse<Budget>>("/api/v1/budget", {
    method: "PUT",
    body: JSON.stringify(data),
  }).then(r => r.data);
}
