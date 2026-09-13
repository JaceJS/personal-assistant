ALTER TABLE `accounts` ADD `pending_sync` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `budgets` ADD `pending_sync` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `pending_sync` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `savings_goals` ADD `pending_sync` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `pending_sync` integer DEFAULT false NOT NULL;