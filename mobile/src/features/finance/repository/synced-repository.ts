import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { accounts, categories, transactions, budgets, savingsGoals } from "@/lib/db/schema";
import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import * as budgetApi from "@/features/finance/api/budget";
import * as savingsGoalsApi from "@/features/finance/api/savingsGoals";
import { logger } from "@/lib/logger";
import { LocalRepository } from "./local-repository";
import type { FinanceRepository } from "./types";
import type {
  AccountCreate,
  AccountUpdate,
  CategoryCreate,
  CategoryUpdate,
  TransactionCreate,
  TransactionUpdate,
  BudgetUpsert,
  SavingsGoalCreate,
  SavingsGoalUpdate,
  SavingsGoalContribute,
} from "../types";

// Authenticated users' repository: reads and writes go to local SQLite first
// (instant, works offline), same as guest mode. A create additionally makes a
// best-effort push to the server right away so the common (online) case syncs
// immediately, without waiting for the next outbox run.
//
// Updates and deletes are NOT pushed here — only via the outbox (see
// syncOutbox.ts) — because pushing them immediately could race ahead of a
// create for the same row that hasn't synced yet. The outbox replays
// everything in creation order, which avoids that hazard.
export class SyncedRepository implements FinanceRepository {
  private local: LocalRepository;

  constructor(
    private userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any = defaultDb
  ) {
    this.local = new LocalRepository(userId, this.db);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pushCreate(table: any, id: string, push: () => Promise<unknown>): void {
    push()
      .then(() => {
        this.db.update(table).set({ pending_sync: false }).where(eq(table.id, id)).run();
      })
      .catch((err: unknown) => {
        logger.warn("sync push failed, outbox will retry", { userId: this.userId, err });
      });
  }

  // --- Accounts ---
  listAccounts() {
    return this.local.listAccounts();
  }
  getAccount(id: string) {
    return this.local.getAccount(id);
  }
  async createAccount(data: AccountCreate & { id: string }) {
    const created = await this.local.createAccount(data);
    this.pushCreate(accounts, created.id, () => accountsApi.createAccount(data));
    return created;
  }
  updateAccount(id: string, data: AccountUpdate) {
    return this.local.updateAccount(id, data);
  }

  // --- Categories ---
  listCategories() {
    return this.local.listCategories();
  }
  getCategory(id: string) {
    return this.local.getCategory(id);
  }
  async createCategory(data: CategoryCreate & { id: string }) {
    const created = await this.local.createCategory(data);
    this.pushCreate(categories, created.id, () => categoriesApi.createCategory(data));
    return created;
  }
  updateCategory(id: string, data: CategoryUpdate) {
    return this.local.updateCategory(id, data);
  }
  archiveCategory(id: string) {
    return this.local.archiveCategory(id);
  }

  // --- Transactions ---
  listTransactions(params?: {
    accountId?: string;
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return this.local.listTransactions(params);
  }
  getTransaction(id: string) {
    return this.local.getTransaction(id);
  }
  async createTransaction(data: TransactionCreate & { id: string }) {
    const created = await this.local.createTransaction(data);
    this.pushCreate(transactions, created.id, () => transactionsApi.createTransaction(data));
    return created;
  }
  updateTransaction(id: string, data: TransactionUpdate) {
    return this.local.updateTransaction(id, data);
  }
  deleteTransaction(id: string) {
    return this.local.deleteTransaction(id);
  }

  // --- Budget ---
  getBudget() {
    return this.local.getBudget();
  }
  async upsertBudget(data: BudgetUpsert & { id: string }) {
    const result = await this.local.upsertBudget(data);
    // Budget has no create/update split (single row per user) and the PUT is
    // always safe to retry, so pushing it here immediately is fine.
    this.pushCreate(budgets, result.id, () =>
      budgetApi.upsertBudget({ monthly_limit: data.monthly_limit })
    );
    return result;
  }

  // --- Savings Goals ---
  listSavingsGoals() {
    return this.local.listSavingsGoals();
  }
  getSavingsGoal(id: string) {
    return this.local.getSavingsGoal(id);
  }
  async createSavingsGoal(data: SavingsGoalCreate & { id: string }) {
    const created = await this.local.createSavingsGoal(data);
    this.pushCreate(savingsGoals, created.id, () => savingsGoalsApi.createSavingsGoal(data));
    return created;
  }
  updateSavingsGoal(id: string, data: SavingsGoalUpdate) {
    return this.local.updateSavingsGoal(id, data);
  }
  contributeToSavingsGoal(id: string, data: SavingsGoalContribute) {
    return this.local.contributeToSavingsGoal(id, data);
  }
  deleteSavingsGoal(id: string) {
    return this.local.deleteSavingsGoal(id);
  }
}
