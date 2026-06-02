import { apiFetch } from "@/lib/api/client";
import type {
  ApiResponse,
  PaginatedList,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
} from "@/features/finance/types";

export interface ListTransactionsParams {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  status?: "draft" | "confirmed";
  limit?: number;
  offset?: number;
}

export function listTransactions(params?: ListTransactionsParams): Promise<PaginatedList<Transaction>> {
  const qs = new URLSearchParams();
  if (params?.dateFrom) qs.set('date_from', params.dateFrom);
  if (params?.dateTo) qs.set('date_to', params.dateTo);
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.offset != null) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return apiFetch<ApiResponse<Transaction[]>>(`/api/v1/transactions${query ? `?${query}` : ''}`)
    .then(r => ({ items: r.data, total: r.meta?.total ?? 0 }));
}

export function getTransaction(id: string): Promise<Transaction> {
  return apiFetch<ApiResponse<Transaction>>(`/api/v1/transactions/${id}`)
    .then(r => r.data);
}

export function createTransaction(data: TransactionCreate): Promise<Transaction> {
  return apiFetch<ApiResponse<Transaction>>("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function updateTransaction(id: string, data: TransactionUpdate): Promise<Transaction> {
  return apiFetch<ApiResponse<Transaction>>(`/api/v1/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/transactions/${id}`, { method: "DELETE" });
}
