import type { Account, Category, Transaction, Budget } from "@/features/finance/types";

export interface ImportCounts {
  accounts: number;
  categories: number;
  transactions: number;
  budgets: number;
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
}

type SyncApiFn = (payload: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}) => Promise<ImportCounts>;

function hasMeaningfulData(
  accounts: Account[],
  transactions: Transaction[],
  budget: Budget | null
): boolean {
  return accounts.length > 0 || transactions.length > 0 || budget !== null;
}

export async function syncLocalData(
  localRepo: SyncableRepo,
  syncApiFn: SyncApiFn
): Promise<SyncResult> {
  const [accounts, categories, { items: transactions }, budget] = await Promise.all([
    localRepo.listAccounts(),
    localRepo.listCategories(),
    localRepo.listTransactions(),
    localRepo.getBudget(),
  ]);

  if (!hasMeaningfulData(accounts, transactions, budget)) {
    return { skipped: true };
  }

  const imported = await syncApiFn({
    accounts,
    categories,
    transactions,
    budgets: budget ? [budget] : [],
  });

  return { skipped: false, imported };
}
