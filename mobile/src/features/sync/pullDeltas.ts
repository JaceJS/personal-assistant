import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { accounts, categories, transactions, budgets, savingsGoals } from "@/lib/db/schema";
import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import * as budgetApi from "@/features/finance/api/budget";
import * as savingsGoalsApi from "@/features/finance/api/savingsGoals";
import { shouldApplyServerRow } from "./syncMerge";
import type { Account, Category, Transaction, Budget, SavingsGoal } from "@/features/finance/types";

// Cap well above realistic personal-finance volume, to avoid paging: this
// pulls whatever changed since the last sync, not the full history.
const TRANSACTION_PULL_LIMIT = 1000;

function lastSyncedKey(userId: string, resource: string): string {
  return `sync:last_pulled:${resource}:${userId}`;
}

async function getLastSynced(userId: string, resource: string): Promise<string | undefined> {
  return (await AsyncStorage.getItem(lastSyncedKey(userId, resource))) ?? undefined;
}

async function setLastSynced(userId: string, resource: string, iso: string): Promise<void> {
  await AsyncStorage.setItem(lastSyncedKey(userId, resource), iso);
}

// Applies one server row to the local mirror, unless a newer unsynced local
// edit should win instead (see syncMerge.shouldApplyServerRow).
function upsertRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  id: string,
  row: Record<string, unknown> & { updated_at: string }
): void {
  const existing = db.select().from(table).where(eq(table.id, id)).get();
  if (!shouldApplyServerRow(existing ?? null, row)) return;
  if (existing) {
    db.update(table).set(row).where(eq(table.id, id)).run();
  } else {
    db.insert(table).values({ id, ...row }).run();
  }
}

function accountRow(userId: string, a: Account) {
  return {
    user_id: userId,
    name: a.name,
    type: a.type,
    currency: a.currency,
    initial_balance: a.initial_balance,
    balance: a.balance,
    is_archived: a.is_archived,
    pending_sync: false,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

function categoryRow(userId: string, c: Category) {
  return {
    user_id: c.user_id ?? userId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    budget_limit: c.budget_limit,
    is_fixed: c.is_fixed,
    is_archived: c.is_archived,
    pending_sync: false,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function transactionRow(userId: string, t: Transaction) {
  return {
    user_id: userId,
    account_id: t.account_id,
    category_id: t.category_id,
    amount: t.amount,
    currency: t.currency,
    merchant: t.merchant,
    note: t.note,
    occurred_at: t.occurred_at,
    source: t.source,
    status: t.status,
    voice_log_id: t.voice_log_id,
    pending_sync: false,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

function savingsGoalRow(userId: string, g: SavingsGoal) {
  return {
    user_id: userId,
    name: g.name,
    icon: g.icon,
    target_amount: g.target_amount,
    current_amount: g.current_amount,
    target_date: g.target_date,
    is_archived: g.is_archived,
    pending_sync: false,
    created_at: g.created_at,
    updated_at: g.updated_at,
  };
}

function budgetRow(userId: string, b: Budget) {
  return { user_id: userId, monthly_limit: b.monthly_limit, pending_sync: false, updated_at: b.updated_at };
}

// Refreshes the local mirror from the server: pulls whatever changed since
// the last pull per resource (or a row the backend itself created, e.g. from
// voice/receipt processing) and merges it in, deferring to a newer unsynced
// local edit where one exists. Run on app foreground / after login.
export async function pullDeltas(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any = defaultDb
): Promise<void> {
  const accountsSince = await getLastSynced(userId, "accounts");
  const accountsResult = await accountsApi.listAccounts({ updatedSince: accountsSince });
  for (const a of accountsResult.items) upsertRow(db, accounts, a.id, accountRow(userId, a));
  await setLastSynced(userId, "accounts", new Date().toISOString());

  const categoriesSince = await getLastSynced(userId, "categories");
  const categoriesResult = await categoriesApi.listCategories({ updatedSince: categoriesSince });
  for (const c of categoriesResult) upsertRow(db, categories, c.id, categoryRow(userId, c));
  await setLastSynced(userId, "categories", new Date().toISOString());

  const transactionsSince = await getLastSynced(userId, "transactions");
  const transactionsResult = await transactionsApi.listTransactions({
    updatedSince: transactionsSince,
    limit: TRANSACTION_PULL_LIMIT,
  });
  for (const t of transactionsResult.items) upsertRow(db, transactions, t.id, transactionRow(userId, t));
  await setLastSynced(userId, "transactions", new Date().toISOString());

  const goalsSince = await getLastSynced(userId, "savings_goals");
  const goalsResult = await savingsGoalsApi.listSavingsGoals({ updatedSince: goalsSince });
  for (const g of goalsResult) upsertRow(db, savingsGoals, g.id, savingsGoalRow(userId, g));
  await setLastSynced(userId, "savings_goals", new Date().toISOString());

  // Single row per user: no updated_since concept, just re-fetch and merge.
  const budget = await budgetApi.getBudget();
  if (budget) upsertRow(db, budgets, budget.id, budgetRow(userId, budget));
}
