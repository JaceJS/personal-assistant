export type AccountType = "cash" | "bank" | "ewallet" | "credit";
export type CategoryType = "expense" | "income";
export type TransactionSource = "voice" | "manual" | "import" | "receipt";
export type TransactionStatus = "draft" | "confirmed";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  budget_limit: number | null;
  is_fixed: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  merchant: string | null;
  note: string | null;
  occurred_at: string;
  source: TransactionSource;
  status: TransactionStatus;
  voice_log_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  monthly_limit: number;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  is_archived: boolean;
  is_completed: boolean;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalCreate {
  name: string;
  icon?: string | null;
  target_amount: number;
  target_date?: string | null;
}

export interface SavingsGoalUpdate {
  name?: string;
  icon?: string | null;
  target_amount?: number;
  target_date?: string | null;
}

export interface SavingsGoalContribute {
  amount: number;
}

export interface BudgetUpsert {
  monthly_limit: number;
}

export interface Meta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
  meta: Meta | null;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
}

export interface AccountCreate {
  name: string;
  type: AccountType;
  currency?: string;
}

export interface AccountUpdate {
  name?: string;
  is_archived?: boolean;
}

export interface CategoryCreate {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export interface CategoryUpdate {
  name?: string | null;
  icon?: string | null;
  color?: string | null;
  budget_limit?: number | null;
  is_fixed?: boolean;
  is_archived?: boolean | null;
}

export interface TransactionCreate {
  account_id: string;
  category_id?: string | null;
  amount: number;
  currency?: string;
  merchant?: string | null;
  note?: string | null;
  occurred_at: string;
}

export interface TransactionUpdate {
  account_id?: string | null;
  category_id?: string | null;
  amount?: number;
  merchant?: string | null;
  note?: string | null;
  occurred_at?: string;
  status?: TransactionStatus;
}
