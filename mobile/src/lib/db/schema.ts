import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Mirrors backend finance models. user_id is nullable (null = guest mode, no account yet).

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "ewallet", "credit"] }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  initial_balance: integer("initial_balance").notNull().default(0),
  balance: integer("balance").notNull().default(0),
  is_archived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  pending_sync: integer("pending_sync", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  type: text("type", { enum: ["expense", "income"] }).notNull(),
  budget_limit: integer("budget_limit"),
  is_fixed: integer("is_fixed", { mode: "boolean" }).notNull().default(false),
  is_archived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  pending_sync: integer("pending_sync", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  account_id: text("account_id").notNull(),
  category_id: text("category_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("IDR"),
  merchant: text("merchant"),
  note: text("note"),
  occurred_at: text("occurred_at").notNull(),
  source: text("source", { enum: ["voice", "manual", "import", "receipt"] })
    .notNull()
    .default("manual"),
  status: text("status", { enum: ["draft", "confirmed"] }).notNull().default("confirmed"),
  voice_log_id: text("voice_log_id"),
  pending_sync: integer("pending_sync", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  monthly_limit: integer("monthly_limit").notNull(),
  pending_sync: integer("pending_sync", { mode: "boolean" }).notNull().default(false),
  updated_at: text("updated_at").notNull(),
});

export const savingsGoals = sqliteTable("savings_goals", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  name: text("name").notNull(),
  icon: text("icon"),
  target_amount: integer("target_amount").notNull(),
  current_amount: integer("current_amount").notNull().default(0),
  target_date: text("target_date"),
  is_archived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  pending_sync: integer("pending_sync", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

// Tracks offline voice recordings waiting to be uploaded + processed
export const voiceQueue = sqliteTable("voice_queue", {
  id: text("id").primaryKey(),
  file_uri: text("file_uri").notNull(),
  account_id: text("account_id"),
  status: text("status", { enum: ["pending", "uploading", "done", "failed"] })
    .notNull()
    .default("pending"),
  error: text("error"),
  created_at: text("created_at").notNull(),
});

// Tombstone for a hard-deleted row (currently only transactions hard-delete)
// made while offline: the row itself is gone, so this is what the outbox
// replays as a DELETE against the server once connectivity returns.
export const pendingDeletes = sqliteTable("pending_deletes", {
  id: text("id").primaryKey(),
  resource: text("resource", { enum: ["transaction"] }).notNull(),
  created_at: text("created_at").notNull(),
});

export const guestChatMessages = sqliteTable("guest_chat_messages", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  created_at: text("created_at").notNull(),
  payload: text("payload").notNull(),
});

export type DbAccount = typeof accounts.$inferSelect;
export type DbCategory = typeof categories.$inferSelect;
export type DbTransaction = typeof transactions.$inferSelect;
export type DbBudget = typeof budgets.$inferSelect;
export type DbSavingsGoal = typeof savingsGoals.$inferSelect;
export type DbVoiceQueueItem = typeof voiceQueue.$inferSelect;
export type DbPendingDelete = typeof pendingDeletes.$inferSelect;
export type DbGuestChatMessage = typeof guestChatMessages.$inferSelect;
