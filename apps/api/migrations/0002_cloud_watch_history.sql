CREATE TABLE `user_history_meta` (
	`user_id` text PRIMARY KEY NOT NULL,
	`epoch` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_history` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`generation` text NOT NULL,
	`entry` text,
	`stamp` text NOT NULL,
	`episode_stamps` text NOT NULL,
	`version` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
