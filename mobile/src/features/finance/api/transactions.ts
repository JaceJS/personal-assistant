import { apiFetch } from "@/lib/api/client";
import type {
  PaginatedList,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
} from "@/features/finance/types";

export function listTransactions(): Promise<PaginatedList<Transaction>> {
  return apiFetch<PaginatedList<Transaction>>("/api/v1/transactions");
}

export function getTransaction(id: string): Promise<Transaction> {
  return apiFetch<Transaction>(`/api/v1/transactions/${id}`);
}

export function createTransaction(data: TransactionCreate): Promise<Transaction> {
  return apiFetch<Transaction>("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTransaction(id: string, data: TransactionUpdate): Promise<Transaction> {
  return apiFetch<Transaction>(`/api/v1/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/transactions/${id}`, { method: "DELETE" });
}
