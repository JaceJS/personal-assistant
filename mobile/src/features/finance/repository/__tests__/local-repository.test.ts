jest.mock("@/lib/db/client", () => ({ db: null }));

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import { LocalRepository } from "../local-repository";

function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      balance INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      type TEXT NOT NULL,
      budget_limit INTEGER,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      account_id TEXT NOT NULL,
      category_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      merchant TEXT,
      note TEXT,
      occurred_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'confirmed',
      voice_log_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      monthly_limit INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE voice_queue (
      id TEXT PRIMARY KEY,
      file_uri TEXT NOT NULL,
      account_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      created_at TEXT NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

const BASE_ACCOUNT = { id: "acc-1", name: "Wallet", type: "cash" as const };
const BASE_TX = { id: "tx-1", account_id: "acc-1", amount: 50000, occurred_at: new Date().toISOString() };

describe("LocalRepository", () => {
  let repo: LocalRepository;

  beforeEach(() => {
    // Each test gets a fresh in-memory DB
    repo = new LocalRepository(makeTestDb());
  });

  describe("accounts", () => {
    it("creates account and returns it", async () => {
      const account = await repo.createAccount(BASE_ACCOUNT);
      expect(account.id).toBe("acc-1");
      expect(account.name).toBe("Wallet");
      expect(account.type).toBe("cash");
      expect(account.balance).toBe(0);
      expect(account.currency).toBe("IDR");
    });

    it("lists all accounts", async () => {
      await repo.createAccount({ id: "acc-1", name: "Wallet", type: "cash" });
      await repo.createAccount({ id: "acc-2", name: "BCA", type: "bank" });
      const accounts = await repo.listAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts.map((a) => a.id).sort()).toEqual(["acc-1", "acc-2"]);
    });

    it("returns empty array when no accounts", async () => {
      expect(await repo.listAccounts()).toEqual([]);
    });

    it("gets account by id", async () => {
      await repo.createAccount(BASE_ACCOUNT);
      const account = await repo.getAccount("acc-1");
      expect(account?.id).toBe("acc-1");
    });

    it("returns null for unknown account id", async () => {
      expect(await repo.getAccount("nonexistent")).toBeNull();
    });

    it("updates account name", async () => {
      await repo.createAccount(BASE_ACCOUNT);
      const updated = await repo.updateAccount("acc-1", { name: "My Wallet" });
      expect(updated.name).toBe("My Wallet");
    });

    it("archives account", async () => {
      await repo.createAccount(BASE_ACCOUNT);
      const updated = await repo.updateAccount("acc-1", { is_archived: true });
      expect(updated.is_archived).toBe(true);
    });
  });

  describe("categories", () => {
    it("creates category and returns it", async () => {
      const cat = await repo.createCategory({ id: "cat-1", name: "Makan", type: "expense" });
      expect(cat.id).toBe("cat-1");
      expect(cat.name).toBe("Makan");
      expect(cat.type).toBe("expense");
    });

    it("lists categories", async () => {
      await repo.createCategory({ id: "cat-1", name: "Makan", type: "expense" });
      await repo.createCategory({ id: "cat-2", name: "Gaji", type: "income" });
      expect(await repo.listCategories()).toHaveLength(2);
    });

    it("seeds default categories on first call when empty", async () => {
      const cats = await repo.listCategories();
      expect(cats.length).toBeGreaterThan(0);
      expect(cats.some((c) => c.name === "Makan & Minum")).toBe(true);
    });

    it("gets category by id", async () => {
      await repo.createCategory({ id: "cat-1", name: "Makan", type: "expense" });
      expect((await repo.getCategory("cat-1"))?.name).toBe("Makan");
    });

    it("returns null for unknown category id", async () => {
      expect(await repo.getCategory("nonexistent")).toBeNull();
    });
  });

  describe("transactions", () => {
    beforeEach(async () => {
      await repo.createAccount(BASE_ACCOUNT);
    });

    it("creates transaction and returns it", async () => {
      const tx = await repo.createTransaction(BASE_TX);
      expect(tx.id).toBe("tx-1");
      expect(tx.amount).toBe(50000);
      expect(tx.source).toBe("manual");
      expect(tx.status).toBe("confirmed");
    });

    it("lists all transactions with total", async () => {
      await repo.createTransaction({ ...BASE_TX, id: "tx-1" });
      await repo.createTransaction({ ...BASE_TX, id: "tx-2", amount: 100000 });
      const result = await repo.listTransactions();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by accountId", async () => {
      await repo.createAccount({ id: "acc-2", name: "BCA", type: "bank" });
      await repo.createTransaction({ ...BASE_TX, id: "tx-1", account_id: "acc-1" });
      await repo.createTransaction({ ...BASE_TX, id: "tx-2", account_id: "acc-2" });
      const result = await repo.listTransactions({ accountId: "acc-1" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].account_id).toBe("acc-1");
    });

    it("returns empty list when no transactions", async () => {
      const result = await repo.listTransactions();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("deletes transaction", async () => {
      await repo.createTransaction(BASE_TX);
      await repo.deleteTransaction("tx-1");
      expect((await repo.listTransactions()).items).toHaveLength(0);
    });

    it("updates transaction amount", async () => {
      await repo.createTransaction(BASE_TX);
      const updated = await repo.updateTransaction("tx-1", { amount: 75000 });
      expect(updated.amount).toBe(75000);
    });

    it("updates transaction note", async () => {
      await repo.createTransaction(BASE_TX);
      const updated = await repo.updateTransaction("tx-1", { note: "lunch" });
      expect(updated.note).toBe("lunch");
    });
  });

  describe("budget", () => {
    it("returns null when no budget set", async () => {
      expect(await repo.getBudget()).toBeNull();
    });

    it("creates budget via upsert", async () => {
      const budget = await repo.upsertBudget({ id: "budget-1", monthly_limit: 5_000_000 });
      expect(budget.monthly_limit).toBe(5_000_000);
    });

    it("updates existing budget", async () => {
      await repo.upsertBudget({ id: "budget-1", monthly_limit: 5_000_000 });
      const updated = await repo.upsertBudget({ id: "budget-1", monthly_limit: 8_000_000 });
      expect(updated.monthly_limit).toBe(8_000_000);
      expect((await repo.getBudget())?.monthly_limit).toBe(8_000_000);
    });
  });
});
