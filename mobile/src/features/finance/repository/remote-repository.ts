import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import * as budgetApi from "@/features/finance/api/budget";
import type {
  Account,
  AccountCreate,
  AccountUpdate,
  Category,
  CategoryCreate,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  Budget,
  BudgetUpsert,
} from "../types";
import type { FinanceRepository } from "./types";

export class RemoteRepository implements FinanceRepository {
  async listAccounts(): Promise<Account[]> {
    const result = await accountsApi.listAccounts();
    return result.items;
  }

  async getAccount(id: string): Promise<Account | null> {
    try {
      return await accountsApi.getAccount(id);
    } catch {
      return null;
    }
  }

  async createAccount(data: AccountCreate & { id: string }): Promise<Account> {
    const { id: _id, ...apiData } = data;
    return accountsApi.createAccount(apiData);
  }

  async updateAccount(id: string, data: AccountUpdate): Promise<Account> {
    return accountsApi.updateAccount(id, data);
  }

  async listCategories(): Promise<Category[]> {
    return categoriesApi.listCategories();
  }

  async getCategory(id: string): Promise<Category | null> {
    const all = await categoriesApi.listCategories();
    return all.find((c) => c.id === id) ?? null;
  }

  async createCategory(data: CategoryCreate & { id: string }): Promise<Category> {
    const { id: _id, ...apiData } = data;
    return categoriesApi.createCategory(apiData);
  }

  async listTransactions(
    params?: { accountId?: string; limit?: number; offset?: number }
  ): Promise<{ items: Transaction[]; total: number }> {
    return transactionsApi.listTransactions({
      accountId: params?.accountId,
      limit: params?.limit,
      offset: params?.offset,
      status: "confirmed",
    });
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      return await transactionsApi.getTransaction(id);
    } catch {
      return null;
    }
  }

  async createTransaction(data: TransactionCreate & { id: string }): Promise<Transaction> {
    const { id: _id, ...apiData } = data;
    return transactionsApi.createTransaction(apiData);
  }

  async updateTransaction(id: string, data: TransactionUpdate): Promise<Transaction> {
    return transactionsApi.updateTransaction(id, data);
  }

  async deleteTransaction(id: string): Promise<void> {
    return transactionsApi.deleteTransaction(id);
  }

  async getBudget(): Promise<Budget | null> {
    return budgetApi.getBudget();
  }

  async upsertBudget(data: BudgetUpsert & { id: string }): Promise<Budget> {
    const { id: _id, ...apiData } = data;
    return budgetApi.upsertBudget(apiData);
  }
}
