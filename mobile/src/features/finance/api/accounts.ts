import { apiFetch } from "@/lib/api/client";
import type { Account, AccountCreate, PaginatedList } from "@/features/finance/types";

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
