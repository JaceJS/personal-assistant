jest.mock("@/lib/db/client", () => ({ db: null }));
jest.mock("@/features/finance/api/accounts", () => ({ listAccounts: jest.fn() }));
jest.mock("@/features/finance/api/categories", () => ({ listCategories: jest.fn() }));
jest.mock("@/features/finance/api/transactions", () => ({ listTransactions: jest.fn() }));
jest.mock("@/features/finance/api/savingsGoals", () => ({ listSavingsGoals: jest.fn() }));
jest.mock("@/features/finance/api/budget", () => ({ getBudget: jest.fn() }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import * as savingsGoalsApi from "@/features/finance/api/savingsGoals";
import * as budgetApi from "@/features/finance/api/budget";
import { pullDeltas } from "../pullDeltas";

const USER_ID = "user-a";

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
  `);
  return drizzle(sqlite, { schema });
}

const SERVER_ACCOUNT = {
  id: "acc-1", user_id: USER_ID, name: "Wallet", type: "cash" as const, currency: "IDR",
  initial_balance: 0, balance: 0, is_archived: false,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
};

describe("pullDeltas", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    testDb = makeTestDb();
    (accountsApi.listAccounts as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    (categoriesApi.listCategories as jest.Mock).mockResolvedValue([]);
    (transactionsApi.listTransactions as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    (savingsGoalsApi.listSavingsGoals as jest.Mock).mockResolvedValue([]);
    (budgetApi.getBudget as jest.Mock).mockResolvedValue(null);
  });

  it("inserts a new account pulled from the server", async () => {
    (accountsApi.listAccounts as jest.Mock).mockResolvedValue({ items: [SERVER_ACCOUNT], total: 1 });

    await pullDeltas(USER_ID, testDb);

    const row = testDb.select().from(schema.accounts).where(eq(schema.accounts.id, "acc-1")).get();
    expect(row).toMatchObject({ name: "Wallet", user_id: USER_ID, pending_sync: false });
  });

  it("does not overwrite a local row with a newer unsynced edit", async () => {
    testDb
      .insert(schema.accounts)
      .values({
        id: "acc-1", user_id: USER_ID, name: "Renamed locally", type: "cash", currency: "IDR",
        initial_balance: 0, balance: 0, is_archived: false, pending_sync: true,
        created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-06-01T00:00:00.000Z",
      })
      .run();
    (accountsApi.listAccounts as jest.Mock).mockResolvedValue({
      items: [{ ...SERVER_ACCOUNT, name: "Server name", updated_at: "2026-01-02T00:00:00.000Z" }],
      total: 1,
    });

    await pullDeltas(USER_ID, testDb);

    const row = testDb.select().from(schema.accounts).where(eq(schema.accounts.id, "acc-1")).get();
    expect(row.name).toBe("Renamed locally");
  });

  it("passes the previously stored last-synced timestamp as updated_since", async () => {
    await AsyncStorage.setItem(`sync:last_pulled:accounts:${USER_ID}`, "2026-01-01T00:00:00.000Z");

    await pullDeltas(USER_ID, testDb);

    expect(accountsApi.listAccounts).toHaveBeenCalledWith({
      updatedSince: "2026-01-01T00:00:00.000Z",
    });
  });

  it("advances the last-synced timestamp after a successful pull", async () => {
    await pullDeltas(USER_ID, testDb);

    const stored = await AsyncStorage.getItem(`sync:last_pulled:accounts:${USER_ID}`);
    expect(stored).not.toBeNull();
  });
});
