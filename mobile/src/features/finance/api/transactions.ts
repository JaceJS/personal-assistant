import { apiFetch } from "@/lib/api/client";
import type {
  PaginatedList,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
} from "@/features/finance/types";

export interface ListTransactionsParams {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export function listTransactions(params?: ListTransactionsParams): Promise<PaginatedList<Transaction>> {
  const qs = new URLSearchParams();
  if (params?.dateFrom) qs.set('date_from', params.dateFrom);
  if (params?.dateTo) qs.set('date_to', params.dateTo);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.offset != null) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return apiFetch<PaginatedList<Transaction>>(`/api/v1/transactions${query ? `?${query}` : ''}`);
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
