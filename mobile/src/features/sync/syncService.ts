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
  listAccounts(): Promise<Account[]>;
  listCategories(): Promise<Category[]>;
  listTransactions(params?: Record<string, unknown>): Promise<{ items: Transaction[]; total: number }>;
  getBudget(): Promise<Budget | null>;
  listSavingsGoals(): Promise<SavingsGoal[]>;
}

type SyncApiFn = (payload: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
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

export async function syncLocalData(
  localRepo: SyncableRepo,
  syncApiFn: SyncApiFn
): Promise<SyncResult> {
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
    budgets: budget ? [budget] : [],
    savings_goals: savingsGoals,
  });

  return { skipped: false, imported };
}
