import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as SQLite from "expo-sqlite";
import * as schema from "./schema";
import migrations from "./migrations/migrations";

const sqlite = SQLite.openDatabaseSync("personal_assistant.db");

export const db = drizzle(sqlite, { schema });

export async function runMigrations(): Promise<void> {
  try {
    await migrate(db, migrations);
  } catch (e) {
    console.error("[migrations] failed:", e);
    throw e;
  }
}

export type DB = typeof db;
