CREATE TABLE `guest_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL
);
