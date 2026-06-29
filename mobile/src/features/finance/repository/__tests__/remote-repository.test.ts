jest.mock("@/features/finance/api/accounts", () => ({
  listAccounts: jest.fn(),
  getAccount: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  archiveAccount: jest.fn(),
}));
jest.mock("@/features/finance/api/categories", () => ({
  listCategories: jest.fn(),
  createCategory: jest.fn(),
}));
jest.mock("@/features/finance/api/transactions", () => ({
  listTransactions: jest.fn(),
  getTransaction: jest.fn(),
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}));
jest.mock("@/features/finance/api/budget", () => ({
  getBudget: jest.fn(),
  upsertBudget: jest.fn(),
}));

import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import * as budgetApi from "@/features/finance/api/budget";
import { RemoteRepository } from "../remote-repository";
import type { Account, Category, Transaction, Budget } from "../../types";

const mockAccount: Account = {
  id: "acc-1", user_id: "u1", name: "Wallet", type: "cash",
  currency: "IDR", initial_balance: 0, balance: 0, is_archived: false,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const mockCategory: Category = {
  id: "cat-1", user_id: null, name: "Makan", type: "expense",
  icon: null, color: null, budget_limit: null, is_fixed: false, is_archived: false,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const mockTx: Transaction = {
  id: "tx-1", user_id: "u1", account_id: "acc-1", category_id: null,
  amount: 50000, currency: "IDR", merchant: null, note: null,
  occurred_at: "2026-01-01T00:00:00Z", source: "manual", status: "confirmed",
  voice_log_id: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const mockBudget: Budget = {
  id: "bud-1", user_id: "u1", monthly_limit: 5_000_000, updated_at: "2026-01-01T00:00:00Z",
};

describe("RemoteRepository", () => {
  let repo: RemoteRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new RemoteRepository();
  });

  describe("accounts", () => {
    it("listAccounts delegates to api and returns items array", async () => {
      (accountsApi.listAccounts as jest.Mock).mockResolvedValue({ items: [mockAccount], total: 1 });
      const result = await repo.listAccounts();
      expect(result).toEqual([mockAccount]);
      expect(accountsApi.listAccounts).toHaveBeenCalledTimes(1);
    });

    it("getAccount returns account from api", async () => {
      (accountsApi.getAccount as jest.Mock).mockResolvedValue(mockAccount);
      const result = await repo.getAccount("acc-1");
      expect(result).toEqual(mockAccount);
    });

    it("getAccount returns null when api throws 404-like", async () => {
      (accountsApi.getAccount as jest.Mock).mockRejectedValue(new Error("Not found"));
      const result = await repo.getAccount("missing");
      expect(result).toBeNull();
    });

    it("createAccount ignores client id and calls api", async () => {
      (accountsApi.createAccount as jest.Mock).mockResolvedValue(mockAccount);
      const result = await repo.createAccount({ id: "ignored-id", name: "Wallet", type: "cash" });
      expect(result).toEqual(mockAccount);
      expect(accountsApi.createAccount).toHaveBeenCalledWith({ name: "Wallet", type: "cash" });
    });

    it("updateAccount delegates to api", async () => {
      (accountsApi.updateAccount as jest.Mock).mockResolvedValue({ ...mockAccount, name: "Updated" });
      const result = await repo.updateAccount("acc-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });

  describe("categories", () => {
    it("listCategories returns array from api", async () => {
      (categoriesApi.listCategories as jest.Mock).mockResolvedValue([mockCategory]);
      const result = await repo.listCategories();
      expect(result).toEqual([mockCategory]);
    });

    it("createCategory ignores client id and calls api", async () => {
      (categoriesApi.createCategory as jest.Mock).mockResolvedValue(mockCategory);
      const result = await repo.createCategory({ id: "ignored", name: "Makan", type: "expense" });
      expect(result).toEqual(mockCategory);
      expect(categoriesApi.createCategory).toHaveBeenCalledWith({ name: "Makan", type: "expense" });
    });
  });

  describe("transactions", () => {
    it("listTransactions delegates to api", async () => {
      (transactionsApi.listTransactions as jest.Mock).mockResolvedValue({ items: [mockTx], total: 1 });
      const result = await repo.listTransactions();
      expect(result.items).toEqual([mockTx]);
      expect(result.total).toBe(1);
    });

    it("createTransaction ignores client id and calls api", async () => {
      (transactionsApi.createTransaction as jest.Mock).mockResolvedValue(mockTx);
      const result = await repo.createTransaction({
        id: "ignored", account_id: "acc-1", amount: 50000, occurred_at: "2026-01-01T00:00:00Z",
      });
      expect(result).toEqual(mockTx);
      expect(transactionsApi.createTransaction).toHaveBeenCalledWith({
        account_id: "acc-1", amount: 50000, occurred_at: "2026-01-01T00:00:00Z",
      });
    });

    it("deleteTransaction calls api", async () => {
      (transactionsApi.deleteTransaction as jest.Mock).mockResolvedValue(undefined);
      await repo.deleteTransaction("tx-1");
      expect(transactionsApi.deleteTransaction).toHaveBeenCalledWith("tx-1");
    });
  });

  describe("budget", () => {
    it("getBudget returns budget from api", async () => {
      (budgetApi.getBudget as jest.Mock).mockResolvedValue(mockBudget);
      const result = await repo.getBudget();
      expect(result).toEqual(mockBudget);
    });

    it("upsertBudget ignores client id and calls api", async () => {
      (budgetApi.upsertBudget as jest.Mock).mockResolvedValue(mockBudget);
      const result = await repo.upsertBudget({ id: "ignored", monthly_limit: 5_000_000 });
      expect(result).toEqual(mockBudget);
      expect(budgetApi.upsertBudget).toHaveBeenCalledWith({ monthly_limit: 5_000_000 });
    });
  });
});
