import { apiFetch } from "@/lib/api/client";
import type { Account, AccountCreate, AccountUpdate, ApiResponse, PaginatedList } from "@/features/finance/types";

export function listAccounts(): Promise<PaginatedList<Account>> {
  return apiFetch<ApiResponse<Account[]>>("/api/v1/accounts")
    .then(r => ({ items: r.data, total: r.meta?.total ?? 0 }));
}

export function getAccount(id: string): Promise<Account> {
  return apiFetch<ApiResponse<Account>>(`/api/v1/accounts/${id}`)
    .then(r => r.data);
}

export function createAccount(data: AccountCreate): Promise<Account> {
  return apiFetch<ApiResponse<Account>>("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function updateAccount(id: string, data: AccountUpdate): Promise<Account> {
  return apiFetch<ApiResponse<Account>>(`/api/v1/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }).then(r => r.data);
}

export function archiveAccount(id: string): Promise<Account> {
  return updateAccount(id, { is_archived: true });
}
