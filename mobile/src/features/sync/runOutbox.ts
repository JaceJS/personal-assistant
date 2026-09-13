import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { accounts, categories, transactions, savingsGoals, pendingDeletes } from "@/lib/db/schema";
import * as accountsApi from "@/features/finance/api/accounts";
import * as categoriesApi from "@/features/finance/api/categories";
import * as transactionsApi from "@/features/finance/api/transactions";
import * as savingsGoalsApi from "@/features/finance/api/savingsGoals";
import { ApiError } from "@/lib/api/client";
import { logger } from "@/lib/logger";

// Replays every locally-pending write against the server, for when a write
// was made offline (or its earlier best-effort push in SyncedRepository
// failed). Run on reconnect / app foreground.
//
// Each row is pushed via CREATE (idempotent: a no-op if the row already
// exists on the server, see the backend's client-id create) *then* an
// explicit update/archive call with the row's current field values. Doing
// both, in that order, for every pending row — rather than tracking
// create/update as separate queue entries — sidesteps the ordering hazard of
// an update racing ahead of its own row's create: a genuinely-new row's
// second call is just a harmless no-op update.
//
// Known gap: a savings-goal contribution made offline sets pending_sync, but
// SavingsGoalUpdate has no field to carry an amount delta, so it is not
// replayed here — the local progress is correct, but the contributed amount
// itself does not reach the server until the goal is touched again while
// online. Revisit if this turns out to matter in practice.

interface AccountRow {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "credit";
  currency: string;
  initial_balance: number;
  is_archived: boolean;
}
interface CategoryRow {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string | null;
  color: string | null;
  budget_limit: number | null;
  is_fixed: boolean;
  is_archived: boolean;
}
interface TransactionRow {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  merchant: string | null;
  note: string | null;
  occurred_at: string;
  status: "draft" | "confirmed" | "cancelled";
}
interface SavingsGoalRow {
  id: string;
  name: string;
  icon: string | null;
  target_amount: number;
  target_date: string | null;
  is_archived: boolean;
}

async function pushAccount(row: AccountRow): Promise<void> {
  await accountsApi.createAccount({
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initial_balance: row.initial_balance,
  });
  await accountsApi.updateAccount(row.id, {
    name: row.name,
    initial_balance: row.initial_balance,
    is_archived: row.is_archived,
  });
}

async function pushCategory(row: CategoryRow): Promise<void> {
  await categoriesApi.createCategory({
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
  });
  if (row.is_archived) {
    await categoriesApi.archiveCategory(row.id);
  } else {
    await categoriesApi.updateCategory(row.id, {
      name: row.name,
      icon: row.icon,
      color: row.color,
      budget_limit: row.budget_limit,
      is_fixed: row.is_fixed,
    });
  }
}

async function pushTransaction(row: TransactionRow): Promise<void> {
  await transactionsApi.createTransaction({
    id: row.id,
    account_id: row.account_id,
    category_id: row.category_id,
    amount: row.amount,
    currency: row.currency,
    merchant: row.merchant,
    note: row.note,
    occurred_at: row.occurred_at,
  });
  await transactionsApi.updateTransaction(row.id, {
    account_id: row.account_id,
    category_id: row.category_id,
    amount: row.amount,
    merchant: row.merchant,
    note: row.note,
    occurred_at: row.occurred_at,
    status: row.status,
  });
}

async function pushSavingsGoal(row: SavingsGoalRow): Promise<void> {
  await savingsGoalsApi.createSavingsGoal({
    id: row.id,
    name: row.name,
    icon: row.icon,
    target_amount: row.target_amount,
    target_date: row.target_date,
  });
  if (row.is_archived) {
    await savingsGoalsApi.deleteSavingsGoal(row.id);
  } else {
    await savingsGoalsApi.updateSavingsGoal(row.id, {
      name: row.name,
      icon: row.icon,
      target_amount: row.target_amount,
      target_date: row.target_date,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runOutbox(db: any = defaultDb): Promise<void> {
  try {
    for (const row of db.select().from(accounts).where(eq(accounts.pending_sync, true)).all()) {
      await pushAccount(row);
      db.update(accounts).set({ pending_sync: false }).where(eq(accounts.id, row.id)).run();
    }
    for (const row of db.select().from(categories).where(eq(categories.pending_sync, true)).all()) {
      await pushCategory(row);
      db.update(categories).set({ pending_sync: false }).where(eq(categories.id, row.id)).run();
    }
    for (const row of db
      .select()
      .from(transactions)
      .where(eq(transactions.pending_sync, true))
      .all()) {
      await pushTransaction(row);
      db.update(transactions).set({ pending_sync: false }).where(eq(transactions.id, row.id)).run();
    }
    for (const row of db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.pending_sync, true))
      .all()) {
      await pushSavingsGoal(row);
      db.update(savingsGoals).set({ pending_sync: false }).where(eq(savingsGoals.id, row.id)).run();
    }
    for (const tombstone of db.select().from(pendingDeletes).all()) {
      try {
        await transactionsApi.deleteTransaction(tombstone.id);
      } catch (err) {
        // Already gone server-side counts as done, not a failure to retry.
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      db.delete(pendingDeletes).where(eq(pendingDeletes.id, tombstone.id)).run();
    }
  } catch (err) {
    // Still offline, or a transient failure: leave whatever is left pending
    // and stop — the next foreground/reconnect trigger will retry.
    logger.warn("outbox run stopped early, will retry later", { err });
  }
}
