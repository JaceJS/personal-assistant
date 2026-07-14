import { syncLocalData, getLocalDataSummary } from "../syncService";

const makeRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  migrateNonUuidCategoryIds: jest.fn().mockResolvedValue(undefined),
  listAccounts: jest.fn().mockResolvedValue([]),
  listCategories: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getBudget: jest.fn().mockResolvedValue(null),
  listSavingsGoals: jest.fn().mockResolvedValue([]),
  clearFinanceData: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const IMPORTED = { accounts: 1, categories: 1, transactions: 1, budgets: 1, savings_goals: 1 };
const ACCOUNT = { id: "acc-1", name: "Cash", type: "cash", currency: "IDR" };
const CATEGORY = { id: "cat-1", name: "Food", type: "expense" };
const TRANSACTION = { id: "tx-1", amount: -50000, account_id: "acc-1" };
const BUDGET = { id: "bud-1", monthly_limit: 5_000_000, updated_at: "2024-01-01T00:00:00Z" };
const GOAL = { id: "goal-1", name: "Motor", target_amount: 15_000_000, current_amount: 0, target_date: null, is_archived: false };

describe("syncLocalData", () => {
  it("skips sync when no accounts, transactions, budget, or goals exist", async () => {
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

  it("migrates non-UUID category ids before reading local data", async () => {
    const callOrder: string[] = [];
    const repo = makeRepo({
      migrateNonUuidCategoryIds: jest.fn(async () => {
        callOrder.push("migrate");
      }),
      listCategories: jest.fn(async () => {
        callOrder.push("list");
        return [CATEGORY];
      }),
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockResolvedValue(IMPORTED);

    await syncLocalData(repo, syncApi);

    expect(repo.migrateNonUuidCategoryIds).toHaveBeenCalledTimes(1);
    expect(callOrder[0]).toBe("migrate");
  });

  it("sends all local data to sync API when accounts exist", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
      listCategories: jest.fn().mockResolvedValue([CATEGORY]),
      listTransactions: jest.fn().mockResolvedValue({ items: [TRANSACTION], total: 1 }),
      getBudget: jest.fn().mockResolvedValue(BUDGET),
      listSavingsGoals: jest.fn().mockResolvedValue([GOAL]),
    });
    const syncApi = jest.fn().mockResolvedValue(IMPORTED);

    const result = await syncLocalData(repo, syncApi);

    expect(syncApi).toHaveBeenCalledWith({
      accounts: [ACCOUNT],
      categories: [CATEGORY],
      transactions: [TRANSACTION],
      budget: BUDGET,
      savings_goals: [GOAL],
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

  it("sends budget as a single object, matching the backend schema", async () => {
    const repo = makeRepo({
      getBudget: jest.fn().mockResolvedValue(BUDGET),
    });
    const syncApi = jest.fn().mockResolvedValue({ accounts: 0, categories: 0, transactions: 0, budgets: 1 });

    await syncLocalData(repo, syncApi);

    expect(syncApi).toHaveBeenCalledWith(
      expect.objectContaining({ budget: BUDGET })
    );
  });

  it("sends null budget when none exists locally", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockResolvedValue({ accounts: 1, categories: 0, transactions: 0, budgets: 0 });

    await syncLocalData(repo, syncApi);

    expect(syncApi).toHaveBeenCalledWith(
      expect.objectContaining({ budget: null })
    );
  });

  it("propagates sync API errors", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(syncLocalData(repo, syncApi)).rejects.toThrow("Network error");
  });

  it("clears local data after a successful sync", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockResolvedValue(IMPORTED);

    await syncLocalData(repo, syncApi);

    expect(repo.clearFinanceData).toHaveBeenCalledTimes(1);
  });

  it("does not clear local data when sync is skipped (nothing to sync)", async () => {
    const repo = makeRepo();
    const syncApi = jest.fn();

    await syncLocalData(repo, syncApi);

    expect(repo.clearFinanceData).not.toHaveBeenCalled();
  });

  it("does not clear local data when the sync API call fails", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT]),
    });
    const syncApi = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(syncLocalData(repo, syncApi)).rejects.toThrow("Network error");
    expect(repo.clearFinanceData).not.toHaveBeenCalled();
  });
});

describe("getLocalDataSummary", () => {
  it("returns null when there is nothing meaningful to sync", async () => {
    const repo = makeRepo();

    expect(await getLocalDataSummary(repo)).toBeNull();
  });

  it("returns null when only default categories exist", async () => {
    const repo = makeRepo({ listCategories: jest.fn().mockResolvedValue([CATEGORY]) });

    expect(await getLocalDataSummary(repo)).toBeNull();
  });

  it("counts accounts, transactions, savings goals, and whether a budget is set", async () => {
    const repo = makeRepo({
      listAccounts: jest.fn().mockResolvedValue([ACCOUNT, ACCOUNT]),
      listTransactions: jest.fn().mockResolvedValue({ items: [TRANSACTION], total: 1 }),
      getBudget: jest.fn().mockResolvedValue(BUDGET),
      listSavingsGoals: jest.fn().mockResolvedValue([GOAL]),
    });

    expect(await getLocalDataSummary(repo)).toEqual({
      accounts: 2,
      transactions: 1,
      hasBudget: true,
      savingsGoals: 1,
    });
  });

  it("does not run the non-UUID category migration (read-only preview)", async () => {
    const repo = makeRepo({ listAccounts: jest.fn().mockResolvedValue([ACCOUNT]) });

    await getLocalDataSummary(repo);

    expect(repo.migrateNonUuidCategoryIds).not.toHaveBeenCalled();
  });
});
