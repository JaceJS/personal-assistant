jest.mock("@/lib/db/client", () => ({ db: null }));
jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual<typeof import("crypto")>("crypto").randomUUID(),
}));
jest.mock("@/features/finance/api/accounts", () => ({ createAccount: jest.fn() }));
jest.mock("@/features/finance/api/transactions", () => ({ createTransaction: jest.fn() }));
jest.mock("@/features/finance/api/categories", () => ({ createCategory: jest.fn() }));
jest.mock("@/features/finance/api/savingsGoals", () => ({ createSavingsGoal: jest.fn() }));
jest.mock("@/features/finance/api/budget", () => ({ upsertBudget: jest.fn() }));
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import * as accountsApi from "@/features/finance/api/accounts";
import * as transactionsApi from "@/features/finance/api/transactions";
import { SyncedRepository } from "../synced-repository";

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

describe("SyncedRepository", () => {
  let repo: SyncedRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (accountsApi.createAccount as jest.Mock).mockResolvedValue({});
    (transactionsApi.createTransaction as jest.Mock).mockResolvedValue({});
    testDb = makeTestDb();
    repo = new SyncedRepository("user-a", testDb);
  });

  describe("createAccount", () => {
    it("writes locally and returns immediately, without waiting for the push", async () => {
      let resolvePush: (v: unknown) => void = () => {};
      (accountsApi.createAccount as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolvePush = resolve;
        })
      );

      const account = await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });

      expect(account.id).toBe("acc-1");
      resolvePush({ ...account }); // avoid an unresolved promise leaking into other tests
    });

    it("pushes the created row to the server with the same id", async () => {
      (accountsApi.createAccount as jest.Mock).mockResolvedValue({});

      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      await Promise.resolve(); // flush the fire-and-forget push
      await Promise.resolve();

      expect(accountsApi.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ id: "acc-1", name: "Wallet" })
      );
    });

    it("clears pending_sync once the push succeeds", async () => {
      (accountsApi.createAccount as jest.Mock).mockResolvedValue({});

      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      await Promise.resolve();
      await Promise.resolve();

      const row = testDb.select().from(schema.accounts).where(eq(schema.accounts.id, "acc-1")).get();
      expect(row.pending_sync).toBe(false);
    });

    it("leaves pending_sync set when the push fails, for the outbox to retry later", async () => {
      (accountsApi.createAccount as jest.Mock).mockRejectedValue(new Error("offline"));

      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      await Promise.resolve();
      await Promise.resolve();

      const row = testDb.select().from(schema.accounts).where(eq(schema.accounts.id, "acc-1")).get();
      expect(row.pending_sync).toBe(true);
    });
  });

  describe("updateAccount / deleteTransaction", () => {
    it("updateAccount only writes locally, does not call the push api", async () => {
      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      (accountsApi.createAccount as jest.Mock).mockClear();

      await repo.updateAccount("acc-1", { name: "Renamed" });

      expect(accountsApi.createAccount).not.toHaveBeenCalled();
    });

    it("deleteTransaction only writes locally (outbox pushes it later)", async () => {
      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      await repo.createTransaction({
        id: "tx-1",
        account_id: "acc-1",
        amount: 1000,
        occurred_at: new Date().toISOString(),
      });

      await repo.deleteTransaction("tx-1");

      expect(transactionsApi.createTransaction).toHaveBeenCalledTimes(1); // only the earlier create push
      expect(await repo.getTransaction("tx-1")).toBeNull();
    });
  });

  describe("reads", () => {
    it("delegates listAccounts to the local repository", async () => {
      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      const result = await repo.listAccounts();
      expect(result.map((a) => a.id)).toEqual(["acc-1"]);
    });
  });
});
