import { apiFetch } from "@/lib/api/client";
import type {
  ApiResponse,
  SavingsGoal,
  SavingsGoalContribute,
  SavingsGoalCreate,
  SavingsGoalUpdate,
} from "@/features/finance/types";

const BASE = "/api/v1/savings-goals";

export function listSavingsGoals(): Promise<SavingsGoal[]> {
  return apiFetch<ApiResponse<SavingsGoal[]>>(BASE).then(r => r.data);
}

export function getSavingsGoal(id: string): Promise<SavingsGoal> {
  return apiFetch<ApiResponse<SavingsGoal>>(`${BASE}/${id}`).then(r => r.data);
}

export function createSavingsGoal(data: SavingsGoalCreate): Promise<SavingsGoal> {
  return apiFetch<ApiResponse<SavingsGoal>>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function updateSavingsGoal(id: string, data: SavingsGoalUpdate): Promise<SavingsGoal> {
  return apiFetch<ApiResponse<SavingsGoal>>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function contributeToSavingsGoal(
  id: string,
  data: SavingsGoalContribute,
): Promise<SavingsGoal> {
  return apiFetch<ApiResponse<SavingsGoal>>(`${BASE}/${id}/contribute`, {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function deleteSavingsGoal(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}
