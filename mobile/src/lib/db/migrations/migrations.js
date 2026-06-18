// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';

const m0000 = `CREATE TABLE \`accounts\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`name\` text NOT NULL,
\t\`type\` text NOT NULL,
\t\`currency\` text DEFAULT 'IDR' NOT NULL,
\t\`balance\` integer DEFAULT 0 NOT NULL,
\t\`is_archived\` integer DEFAULT false NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`budgets\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`monthly_limit\` integer NOT NULL,
\t\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`categories\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`name\` text NOT NULL,
\t\`icon\` text,
\t\`color\` text,
\t\`type\` text NOT NULL,
\t\`budget_limit\` integer,
\t\`is_fixed\` integer DEFAULT false NOT NULL,
\t\`is_archived\` integer DEFAULT false NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`transactions\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`account_id\` text NOT NULL,
\t\`category_id\` text,
\t\`amount\` integer NOT NULL,
\t\`currency\` text DEFAULT 'IDR' NOT NULL,
\t\`merchant\` text,
\t\`note\` text,
\t\`occurred_at\` text NOT NULL,
\t\`source\` text DEFAULT 'manual' NOT NULL,
\t\`status\` text DEFAULT 'confirmed' NOT NULL,
\t\`voice_log_id\` text,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`voice_queue\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`file_uri\` text NOT NULL,
\t\`account_id\` text,
\t\`status\` text DEFAULT 'pending' NOT NULL,
\t\`error\` text,
\t\`created_at\` text NOT NULL
);`;

export default {
  journal,
  migrations: {
    m0000
  }
}
