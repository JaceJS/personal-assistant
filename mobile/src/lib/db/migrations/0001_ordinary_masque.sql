CREATE TABLE `savings_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`icon` text,
	`target_amount` integer NOT NULL,
	`current_amount` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
