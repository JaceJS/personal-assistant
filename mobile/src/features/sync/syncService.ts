import type { Account, Category, Transaction, Budget, SavingsGoal } from "@/features/finance/types";

export interface ImportCounts {
  accounts: number;
  categories: number;
  transactions: number;
  budgets: number;
  savings_goals: number;
}

export interface SyncResult {
  skipped: boolean;
  imported?: ImportCounts;
}

interface SyncableRepo {
  migrateNonUuidCategoryIds(): Promise<void>;
  listAccounts(): Promise<Account[]>;
  listCategories(): Promise<Category[]>;
  listTransactions(params?: Record<string, unknown>): Promise<{ items: Transaction[]; total: number }>;
  getBudget(): Promise<Budget | null>;
  listSavingsGoals(): Promise<SavingsGoal[]>;
  clearFinanceData(): Promise<void>;
}

type SyncApiFn = (payload: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budget: Budget | null;
  savings_goals: SavingsGoal[];
}) => Promise<ImportCounts>;

function hasMeaningfulData(
  accounts: Account[],
  transactions: Transaction[],
  budget: Budget | null,
  savingsGoals: SavingsGoal[]
): boolean {
  return accounts.length > 0 || transactions.length > 0 || budget !== null || savingsGoals.length > 0;
}

export interface LocalDataSummary {
  accounts: number;
  transactions: number;
  hasBudget: boolean;
  savingsGoals: number;
}

/** Read-only preview of local guest data, for the merge-confirmation prompt.
 * Returns null when there is nothing worth syncing (mirrors syncLocalData's
 * skip condition). Does not run the category-id migration since it never
 * touches the server. */
export async function getLocalDataSummary(
  localRepo: Pick<SyncableRepo, "listAccounts" | "listTransactions" | "getBudget" | "listSavingsGoals">
): Promise<LocalDataSummary | null> {
  const [accounts, { items: transactions }, budget, savingsGoals] = await Promise.all([
    localRepo.listAccounts(),
    localRepo.listTransactions(),
    localRepo.getBudget(),
    localRepo.listSavingsGoals(),
  ]);

  if (!hasMeaningfulData(accounts, transactions, budget, savingsGoals)) {
    return null;
  }

  return {
    accounts: accounts.length,
    transactions: transactions.length,
    hasBudget: budget !== null,
    savingsGoals: savingsGoals.length,
  };
}

export async function syncLocalData(
  localRepo: SyncableRepo,
  syncApiFn: SyncApiFn
): Promise<SyncResult> {
  // Legacy seeded categories used non-UUID slug ids the backend rejects.
  await localRepo.migrateNonUuidCategoryIds();

  const [accounts, categories, { items: transactions }, budget, savingsGoals] = await Promise.all([
    localRepo.listAccounts(),
    localRepo.listCategories(),
    localRepo.listTransactions(),
    localRepo.getBudget(),
    localRepo.listSavingsGoals(),
  ]);

  if (!hasMeaningfulData(accounts, transactions, budget, savingsGoals)) {
    return { skipped: true };
  }

  const imported = await syncApiFn({
    accounts,
    categories,
    transactions,
    budget,
    savings_goals: savingsGoals,
  });

  // Server is now source of truth for this data; stale local rows must not
  // resurface (or re-clobber a server-side edit) on a future sync.
  await localRepo.clearFinanceData();

  return { skipped: false, imported };
}
