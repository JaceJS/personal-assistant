import { apiFetch } from "@/lib/api/client";
import type { Account, AccountCreate, AccountUpdate, PaginatedList } from "@/features/finance/types";

export function listAccounts(): Promise<PaginatedList<Account>> {
  return apiFetch<PaginatedList<Account>>("/api/v1/accounts");
}

export function getAccount(id: string): Promise<Account> {
  return apiFetch<Account>(`/api/v1/accounts/${id}`);
}

export function createAccount(data: AccountCreate): Promise<Account> {
  return apiFetch<Account>("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAccount(id: string, data: AccountUpdate): Promise<Account> {
  return apiFetch<Account>(`/api/v1/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function archiveAccount(id: string): Promise<Account> {
  return updateAccount(id, { is_archived: true });
}
