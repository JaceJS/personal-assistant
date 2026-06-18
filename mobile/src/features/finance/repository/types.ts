import type {
  Account,
  AccountCreate,
  AccountUpdate,
  Category,
  CategoryCreate,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  Budget,
  BudgetUpsert,
} from "../types";

export interface FinanceRepository {
  // Accounts
  listAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<Account | null>;
  createAccount(data: AccountCreate & { id: string }): Promise<Account>;
  updateAccount(id: string, data: AccountUpdate): Promise<Account>;

  // Categories
  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  createCategory(data: CategoryCreate & { id: string }): Promise<Category>;

  // Transactions
  listTransactions(params?: { accountId?: string; limit?: number; offset?: number }): Promise<{
    items: Transaction[];
    total: number;
  }>;
  getTransaction(id: string): Promise<Transaction | null>;
  createTransaction(data: TransactionCreate & { id: string }): Promise<Transaction>;
  updateTransaction(id: string, data: TransactionUpdate): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Budget
  getBudget(): Promise<Budget | null>;
  upsertBudget(data: BudgetUpsert & { id: string }): Promise<Budget>;
}
