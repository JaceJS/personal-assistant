import { syncLocalData } from "../syncService";

const makeRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  listAccounts: jest.fn().mockResolvedValue([]),
  listCategories: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getBudget: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const IMPORTED = { accounts: 1, categories: 1, transactions: 1, budgets: 1 };
const ACCOUNT = { id: "acc-1", name: "Cash", type: "cash", currency: "IDR" };
const CATEGORY = { id: "cat-1", name: "Food", type: "expense" };
const TRANSACTION = { id: "tx-1", amount: -50000, account_id: "acc-1" };
const BUDGET = { id: "bud-1", monthly_limit: 5_000_000, updated_at: "2024-01-01T00:00:00Z" };

describe("syncLocalData", () => {
  it("skips sync when no accounts, transactions, or budget exist", async () => {
    const repo = makeRepo();
    const syncApi = jest.fn();

    const result = await syncLocalData(repo, syncApi);

    expect(result.skipped).toBe(true);
    expect(syncApi).not.toHaveBeenCalled();
  });

  it("skips sync when only categories exist (default categories)", async () => {
    const repo = makeRepo({
      listCategories: jest.fn().mockResolvedValue([CATEGORY]),
    });
    const syncApi = jest.fn();

    const result = await syncLocalData(repo, syncApi);

    expect(result.skipped).toBe(true);
    expect(syncApi).not.toHaveBeenCalled();
  });

  it("sends all local data to sync API when accounts exist", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
      listCategories: jest.fn().mockResolvedValue([CATEGORY]),
      listTransactions: jest.fn().mockResolvedValue({ items: [TRANSACTION], total: 1 }),
      getBudget: jest.fn().mockResolvedValue(BUDGET),
    });
    const syncApi = jest.fn().mockResolvedValue(IMPORTED);

    const result = await syncLocalData(repo, syncApi);

    expect(syncApi).toHaveBeenCalledWith({
      accounts: [ACCOUNT],
      categories: [CATEGORY],
      transactions: [TRANSACTION],
      budgets: [BUDGET],
    });
    expect(result).toEqual({ skipped: false, imported: IMPORTED });
  });

  it("syncs when only transactions exist", async () => {
    const repo = makeRepo({
      listTransactions: jest.fn().mockResolvedValue({ items: [TRANSACTION], total: 1 }),
    });
    const syncApi = jest.fn().mockResolvedValue({ accounts: 0, categories: 0, transactions: 1, budgets: 0 });

    const result = await syncLocalData(repo, syncApi);

    expect(result.skipped).toBe(false);
    expect(syncApi).toHaveBeenCalled();
  });

  it("syncs when only budget exists", async () => {
    const repo = makeRepo({
      getBudget: jest.fn().mockResolvedValue(BUDGET),
    });
    const syncApi = jest.fn().mockResolvedValue({ accounts: 0, categories: 0, transactions: 0, budgets: 1 });

    const result = await syncLocalData(repo, syncApi);

    expect(result.skipped).toBe(false);
    expect(syncApi).toHaveBeenCalled();
  });

  it("wraps budget in array for API payload", async () => {
    const repo = makeRepo({
      getBudget: jest.fn().mockResolvedValue(BUDGET),
    });
    const syncApi = jest.fn().mockResolvedValue({ accounts: 0, categories: 0, transactions: 0, budgets: 1 });

    await syncLocalData(repo, syncApi);

    expect(syncApi).toHaveBeenCalledWith(
      expect.objectContaining({ budgets: [BUDGET] })
    );
  });

  it("sends empty budgets array when budget is null", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockResolvedValue({ accounts: 1, categories: 0, transactions: 0, budgets: 0 });

    await syncLocalData(repo, syncApi);

    expect(syncApi).toHaveBeenCalledWith(
      expect.objectContaining({ budgets: [] })
    );
  });

  it("propagates sync API errors", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(syncLocalData(repo, syncApi)).rejects.toThrow("Network error");
  });
});
