jest.mock("@/lib/db/client", () => ({ db: null }));
jest.mock("@/features/finance/api/accounts", () => ({
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
}));
jest.mock("@/features/finance/api/categories", () => ({
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  archiveCategory: jest.fn(),
}));
jest.mock("@/features/finance/api/transactions", () => ({
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}));
jest.mock("@/features/finance/api/savingsGoals", () => ({
  createSavingsGoal: jest.fn(),
  updateSavingsGoal: jest.fn(),
  deleteSavingsGoal: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/api/client", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError };
});

import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import { runOutbox } from "../runOutbox";

function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR', initial_balance INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0,
      pending_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, icon TEXT, color TEXT,
      type TEXT NOT NULL, budget_limit INTEGER, is_fixed INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0, pending_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY, user_id TEXT, account_id TEXT NOT NULL, category_id TEXT,
      amount INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'IDR', merchant TEXT, note TEXT,
      occurred_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'confirmed', voice_log_id TEXT,
      pending_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE budgets (
      id TEXT PRIMARY KEY, user_id TEXT, monthly_limit INTEGER NOT NULL,
      pending_sync INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
    );
    CREATE TABLE savings_goals (
      id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, icon TEXT,
      target_amount INTEGER NOT NULL, current_amount INTEGER NOT NULL DEFAULT 0,
      target_date TEXT, is_archived INTEGER NOT NULL DEFAULT 0,
      pending_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE pending_deletes (
      id TEXT PRIMARY KEY, resource TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

const TS = "2026-01-01T00:00:00.000Z";

describe("runOutbox", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    testDb = makeTestDb();
    (accountsApi.createAccount as jest.Mock).mockResolvedValue({});
    (accountsApi.updateAccount as jest.Mock).mockResolvedValue({});
    (categoriesApi.createCategory as jest.Mock).mockResolvedValue({});
    (categoriesApi.updateCategory as jest.Mock).mockResolvedValue({});
    (categoriesApi.archiveCategory as jest.Mock).mockResolvedValue(undefined);
    (transactionsApi.createTransaction as jest.Mock).mockResolvedValue({});
    (transactionsApi.updateTransaction as jest.Mock).mockResolvedValue({});
    (transactionsApi.deleteTransaction as jest.Mock).mockResolvedValue(undefined);
  });

  it("pushes a pending account via create-then-update and clears pending_sync", async () => {
    testDb
      .insert(schema.accounts)
      .values({
        id: "acc-1", user_id: "user-a", name: "Wallet", type: "cash", currency: "IDR",
        initial_balance: 1000, balance: 1000, is_archived: false, pending_sync: true,
        created_at: TS, updated_at: TS,
      })
      .run();

    await runOutbox(testDb);

    expect(accountsApi.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "acc-1", name: "Wallet" })
    );
    expect(accountsApi.updateAccount).toHaveBeenCalledWith(
      "acc-1",
      expect.objectContaining({ name: "Wallet", initial_balance: 1000, is_archived: false })
    );
    const row = testDb.select().from(schema.accounts).where(eq(schema.accounts.id, "acc-1")).get();
    expect(row.pending_sync).toBe(false);
  });

  it("archives a pending, archived category instead of sending a plain update", async () => {
    testDb
      .insert(schema.categories)
      .values({
        id: "cat-1", user_id: "user-a", name: "Makan", type: "expense", is_fixed: false,
        is_archived: true, pending_sync: true, created_at: TS, updated_at: TS,
      })
      .run();

    await runOutbox(testDb);

    expect(categoriesApi.archiveCategory).toHaveBeenCalledWith("cat-1");
    expect(categoriesApi.updateCategory).not.toHaveBeenCalled();
  });

  it("replays a transaction delete tombstone and removes it on success", async () => {
    testDb
      .insert(schema.pendingDeletes)
      .values({ id: "tx-1", resource: "transaction", created_at: TS })
      .run();

    await runOutbox(testDb);

    expect(transactionsApi.deleteTransaction).toHaveBeenCalledWith("tx-1");
    expect(testDb.select().from(schema.pendingDeletes).all()).toEqual([]);
  });

  it("stops the run after the first failure, leaving later rows pending", async () => {
    testDb
      .insert(schema.accounts)
      .values({
        id: "acc-1", user_id: "user-a", name: "Wallet", type: "cash", currency: "IDR",
        initial_balance: 0, balance: 0, is_archived: false, pending_sync: true,
        created_at: TS, updated_at: TS,
      })
      .run();
    testDb
      .insert(schema.categories)
      .values({
        id: "cat-1", user_id: "user-a", name: "Makan", type: "expense", is_fixed: false,
        is_archived: false, pending_sync: true, created_at: TS, updated_at: TS,
      })
      .run();
    (accountsApi.createAccount as jest.Mock).mockRejectedValue(new Error("offline"));

    await runOutbox(testDb);

    expect(categoriesApi.createCategory).not.toHaveBeenCalled();
    const accountRow = testDb
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, "acc-1"))
      .get();
    expect(accountRow.pending_sync).toBe(true);
  });
});
