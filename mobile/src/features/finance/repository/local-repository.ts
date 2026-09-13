import { eq, and, count, gte, lte, isNull } from "drizzle-orm";
import * as ExpoCrypto from "expo-crypto";
import { db as defaultDb } from "@/lib/db/client";
import {
  accounts,
  categories,
  transactions,
  budgets,
  savingsGoals,
  pendingDeletes,
} from "@/lib/db/schema";
import type {
  Account,
  AccountCreate,
  AccountUpdate,
  Category,
  CategoryCreate,
  CategoryUpdate,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  Budget,
  BudgetUpsert,
  SavingsGoal,
  SavingsGoalCreate,
  SavingsGoalUpdate,
  SavingsGoalContribute,
} from "../types";
import type { FinanceRepository } from "./types";
import { DEFAULT_CATEGORIES } from "../constants/defaultCategories";

function now(): string {
  return new Date().toISOString();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Converts a raw SQLite row to the Account API shape
function toAccount(row: typeof accounts.$inferSelect): Account {
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    name: row.name,
    type: row.type,
    currency: row.currency,
    initial_balance: row.initial_balance,
    balance: row.balance,
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    name: row.name,
    icon: row.icon ?? null,
    color: row.color ?? null,
    type: row.type,
    budget_limit: row.budget_limit ?? null,
    is_fixed: Boolean(row.is_fixed),
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toTransaction(row: typeof transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    account_id: row.account_id,
    category_id: row.category_id ?? null,
    amount: row.amount,
    currency: row.currency,
    merchant: row.merchant ?? null,
    note: row.note ?? null,
    occurred_at: row.occurred_at,
    source: row.source,
    status: row.status,
    voice_log_id: row.voice_log_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toBudget(row: typeof budgets.$inferSelect): Budget {
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    monthly_limit: row.monthly_limit,
    updated_at: row.updated_at,
  };
}

function toSavingsGoal(row: typeof savingsGoals.$inferSelect): SavingsGoal {
  const pct = row.target_amount > 0 ? (row.current_amount / row.target_amount) * 100.0 : 0.0;
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    name: row.name,
    icon: row.icon ?? null,
    target_amount: row.target_amount,
    current_amount: row.current_amount,
    target_date: row.target_date ?? null,
    is_archived: Boolean(row.is_archived),
    is_completed: row.current_amount >= row.target_amount,
    progress_pct: Math.min(Math.round(pct * 100) / 100, 100.0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class LocalRepository implements FinanceRepository {
  constructor(
    // Guest mode passes null (all local rows are unowned). An authenticated
    // user passes their id so one device can hold more than one user's data
    // without leaking rows between accounts.
    private userId: string | null = null,
    // Accepts any drizzle-sqlite compatible db to allow injection in tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any = defaultDb
  ) {}

  // Matches rows owned by the current user (or unowned rows, for guest mode).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ownedBy(column: any) {
    return this.userId === null ? isNull(column) : eq(column, this.userId);
  }

  // --- Accounts ---

  async listAccounts(): Promise<Account[]> {
    const rows = this.db.select().from(accounts).where(this.ownedBy(accounts.user_id)).all();
    const accountsList = rows.map(toAccount);
    for (const acc of accountsList) {
      const txRows = this.db
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.account_id, acc.id),
            eq(transactions.status, "confirmed"),
            this.ownedBy(transactions.user_id)
          )
        )
        .all();
      const sum = txRows.reduce((accSum: number, t: { amount: number }) => accSum + t.amount, 0);
      acc.balance = acc.initial_balance + sum;
    }
    return accountsList;
  }

  async getAccount(id: string): Promise<Account | null> {
    const row = this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), this.ownedBy(accounts.user_id)))
      .get();
    if (!row) return null;
    const acc = toAccount(row);
    const txRows = this.db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.account_id, acc.id),
          eq(transactions.status, "confirmed"),
          this.ownedBy(transactions.user_id)
        )
      )
      .all();
    const sum = txRows.reduce((accSum: number, t: { amount: number }) => accSum + t.amount, 0);
    acc.balance = acc.initial_balance + sum;
    return acc;
  }

  async createAccount(data: AccountCreate & { id: string }): Promise<Account> {
    const ts = now();
    const initialBal = data.initial_balance ?? 0;
    const row = {
      id: data.id,
      user_id: this.userId,
      name: data.name,
      type: data.type,
      currency: data.currency ?? "IDR",
      initial_balance: initialBal,
      balance: initialBal,
      is_archived: false,
      pending_sync: true,
      created_at: ts,
      updated_at: ts,
    };
    this.db.insert(accounts).values(row).run();
    return toAccount(row);
  }

  async updateAccount(id: string, data: AccountUpdate): Promise<Account> {
    const ts = now();
    this.db
      .update(accounts)
      .set({ ...data, pending_sync: true, updated_at: ts })
      .where(and(eq(accounts.id, id), this.ownedBy(accounts.user_id)))
      .run();
    const row = this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), this.ownedBy(accounts.user_id)))
      .get();
    return toAccount(row);
  }

  // --- Categories ---

  async listCategories(): Promise<Category[]> {
    const rows = this.db.select().from(categories).where(this.ownedBy(categories.user_id)).all();
    if (rows.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await this.createCategory(cat);
      }
      return this.db
        .select()
        .from(categories)
        .where(this.ownedBy(categories.user_id))
        .all()
        .map(toCategory);
    }
    return rows.map(toCategory);
  }

  async getCategory(id: string): Promise<Category | null> {
    const row = this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), this.ownedBy(categories.user_id)))
      .get();
    return row ? toCategory(row) : null;
  }

  async createCategory(data: CategoryCreate & { id: string }): Promise<Category> {
    const ts = now();
    const row = {
      id: data.id,
      user_id: this.userId,
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
      type: data.type,
      budget_limit: null,
      is_fixed: false,
      is_archived: false,
      pending_sync: true,
      created_at: ts,
      updated_at: ts,
    };
    this.db.insert(categories).values(row).run();
    return toCategory(row);
  }

  async updateCategory(id: string, data: CategoryUpdate): Promise<Category> {
    const ts = now();
    this.db
      .update(categories)
      .set({ ...data, pending_sync: true, updated_at: ts })
      .where(and(eq(categories.id, id), this.ownedBy(categories.user_id)))
      .run();
    const row = this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), this.ownedBy(categories.user_id)))
      .get();
    return toCategory(row);
  }

  // Legacy seeded categories used slug ids ("default-cat-food") which the
  // backend sync endpoint rejects (it validates ids as UUID). Rewrite them
  // to real UUIDs, keeping transaction references intact.
  async migrateNonUuidCategoryIds(
    generateId: () => string = ExpoCrypto.randomUUID
  ): Promise<void> {
    const rows = this.db.select().from(categories).where(this.ownedBy(categories.user_id)).all();
    for (const row of rows) {
      if (UUID_PATTERN.test(row.id)) continue;
      const newId = generateId();
      this.db.update(categories).set({ id: newId }).where(eq(categories.id, row.id)).run();
      this.db
        .update(transactions)
        .set({ category_id: newId })
        .where(eq(transactions.category_id, row.id))
        .run();
    }
  }

  async archiveCategory(id: string): Promise<void> {
    const ts = now();
    this.db
      .update(categories)
      .set({ is_archived: true, pending_sync: true, updated_at: ts })
      .where(and(eq(categories.id, id), this.ownedBy(categories.user_id)))
      .run();
  }

  // --- Transactions ---

  async listTransactions(
    params: { accountId?: string; limit?: number; offset?: number; dateFrom?: string; dateTo?: string } = {}
  ): Promise<{ items: Transaction[]; total: number }> {
    const { accountId, limit, offset = 0, dateFrom, dateTo } = params;

    const conditions = [this.ownedBy(transactions.user_id)];
    if (accountId) conditions.push(eq(transactions.account_id, accountId));
    if (dateFrom) {
      const fromStr = dateFrom.includes("T") ? dateFrom : `${dateFrom}T00:00:00.000Z`;
      conditions.push(gte(transactions.occurred_at, fromStr));
    }
    if (dateTo) {
      const toStr = dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`;
      conditions.push(lte(transactions.occurred_at, toStr));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let query = this.db.select().from(transactions);
    let countQuery = this.db.select({ value: count() }).from(transactions);

    if (whereClause) {
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    if (limit !== undefined) {
      query = query.limit(limit).offset(offset);
    }

    const rows = query.all();
    const [{ value: total }] = countQuery.all();

    return { items: rows.map(toTransaction), total };
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const row = this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), this.ownedBy(transactions.user_id)))
      .get();
    return row ? toTransaction(row) : null;
  }

  async createTransaction(data: TransactionCreate & { id: string }): Promise<Transaction> {
    const ts = now();
    const row = {
      id: data.id,
      user_id: this.userId,
      account_id: data.account_id,
      category_id: data.category_id ?? null,
      amount: data.amount,
      currency: data.currency ?? "IDR",
      merchant: data.merchant ?? null,
      note: data.note ?? null,
      occurred_at: data.occurred_at,
      source: "manual" as const,
      status: "confirmed" as const,
      voice_log_id: null,
      pending_sync: true,
      created_at: ts,
      updated_at: ts,
    };
    this.db.insert(transactions).values(row).run();
    return toTransaction(row);
  }

  async updateTransaction(id: string, data: TransactionUpdate): Promise<Transaction> {
    const ts = now();
    this.db
      .update(transactions)
      .set({ ...data, pending_sync: true, updated_at: ts })
      .where(and(eq(transactions.id, id), this.ownedBy(transactions.user_id)))
      .run();
    const row = this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), this.ownedBy(transactions.user_id)))
      .get();
    return toTransaction(row);
  }

  async deleteTransaction(id: string): Promise<void> {
    // Transactions are hard-deleted, so once the row is gone there is nothing
    // left locally to flag as pending sync. Leave a tombstone instead, so a
    // delete made offline still reaches the server once the outbox replays it.
    // Guest mode has no server to sync to, so skip it there.
    if (this.userId !== null) {
      this.db
        .insert(pendingDeletes)
        .values({ id, resource: "transaction", created_at: now() })
        .run();
    }
    this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), this.ownedBy(transactions.user_id)))
      .run();
  }

  // --- Budget ---

  async getBudget(): Promise<Budget | null> {
    const row = this.db.select().from(budgets).where(this.ownedBy(budgets.user_id)).get();
    return row ? toBudget(row) : null;
  }

  async upsertBudget(data: BudgetUpsert & { id: string }): Promise<Budget> {
    const ts = now();
    const existing = this.db.select().from(budgets).where(this.ownedBy(budgets.user_id)).get();
    if (existing) {
      this.db
        .update(budgets)
        .set({ monthly_limit: data.monthly_limit, pending_sync: true, updated_at: ts })
        .where(eq(budgets.id, existing.id))
        .run();
      const row = this.db.select().from(budgets).where(eq(budgets.id, existing.id)).get();
      return toBudget(row);
    }
    this.db
      .insert(budgets)
      .values({
        id: data.id,
        user_id: this.userId,
        monthly_limit: data.monthly_limit,
        pending_sync: true,
        updated_at: ts,
      })
      .run();
    const row = this.db.select().from(budgets).where(eq(budgets.id, data.id)).get();
    return toBudget(row);
  }

  // --- Savings Goals ---

  async listSavingsGoals(): Promise<SavingsGoal[]> {
    const rows = this.db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.is_archived, false), this.ownedBy(savingsGoals.user_id)))
      .all();
    return rows.map(toSavingsGoal);
  }

  async getSavingsGoal(id: string): Promise<SavingsGoal | null> {
    const row = this.db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), this.ownedBy(savingsGoals.user_id)))
      .get();
    return row ? toSavingsGoal(row) : null;
  }

  async createSavingsGoal(data: SavingsGoalCreate & { id: string }): Promise<SavingsGoal> {
    const ts = now();
    const row = {
      id: data.id,
      user_id: this.userId,
      name: data.name,
      icon: data.icon ?? null,
      target_amount: data.target_amount,
      current_amount: 0,
      target_date: data.target_date ?? null,
      is_archived: false,
      pending_sync: true,
      created_at: ts,
      updated_at: ts,
    };
    this.db.insert(savingsGoals).values(row).run();
    return toSavingsGoal(row);
  }

  async updateSavingsGoal(id: string, data: SavingsGoalUpdate): Promise<SavingsGoal> {
    const ts = now();
    this.db
      .update(savingsGoals)
      .set({ ...data, pending_sync: true, updated_at: ts })
      .where(and(eq(savingsGoals.id, id), this.ownedBy(savingsGoals.user_id)))
      .run();
    const row = this.db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), this.ownedBy(savingsGoals.user_id)))
      .get();
    return toSavingsGoal(row);
  }

  async contributeToSavingsGoal(id: string, data: SavingsGoalContribute): Promise<SavingsGoal> {
    const ts = now();
    const goal = this.db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), this.ownedBy(savingsGoals.user_id)))
      .get();
    if (!goal) {
      throw new Error("Savings goal not found");
    }
    const newAmount = goal.current_amount + data.amount;
    this.db
      .update(savingsGoals)
      .set({ current_amount: newAmount, pending_sync: true, updated_at: ts })
      .where(eq(savingsGoals.id, id))
      .run();
    const row = this.db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id))
      .get();
    return toSavingsGoal(row);
  }

  async deleteSavingsGoal(id: string): Promise<void> {
    const ts = now();
    this.db
      .update(savingsGoals)
      .set({ is_archived: true, pending_sync: true, updated_at: ts })
      .where(and(eq(savingsGoals.id, id), this.ownedBy(savingsGoals.user_id)))
      .run();
  }

  // --- Sync ---

  /** Wipes local finance data after a successful sync-on-login import, since the
   * server copy becomes the source of truth going forward. */
  async clearFinanceData(): Promise<void> {
    this.db.delete(transactions).where(this.ownedBy(transactions.user_id)).run();
    this.db.delete(savingsGoals).where(this.ownedBy(savingsGoals.user_id)).run();
    this.db.delete(budgets).where(this.ownedBy(budgets.user_id)).run();
    this.db.delete(accounts).where(this.ownedBy(accounts.user_id)).run();
    this.db.delete(categories).where(this.ownedBy(categories.user_id)).run();
  }
}
