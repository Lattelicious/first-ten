CREATE TABLE `budgets` (
	`pool` text PRIMARY KEY NOT NULL,
	`limit_micros` integer NOT NULL,
	`spent_micros` integer DEFAULT 0 NOT NULL,
	`reserved_micros` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cached_records` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`kind` text NOT NULL,
	`search_text` text NOT NULL,
	`data_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cached_records_dataset` ON `cached_records` (`dataset_id`);--> statement-breakpoint
CREATE INDEX `idx_cached_records_kind` ON `cached_records` (`kind`);--> statement-breakpoint
CREATE TABLE `catalogs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`file_key` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catalogs_owner` ON `catalogs` (`owner`);--> statement-breakpoint
CREATE TABLE `daily_claims` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`run_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_claims_owner_day` ON `daily_claims` (`owner`,`day`);--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`dataset_date` text NOT NULL,
	`imported_at` text NOT NULL,
	`row_count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_datasets_kind` ON `datasets` (`kind`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`pool` text NOT NULL,
	`status` text NOT NULL,
	`stage` text NOT NULL,
	`input_json` text NOT NULL,
	`results_json` text DEFAULT '[]' NOT NULL,
	`limitations_json` text DEFAULT '[]' NOT NULL,
	`response_id` text,
	`raw_text` text,
	`source_urls_json` text DEFAULT '[]' NOT NULL,
	`cost_micros` integer DEFAULT 0 NOT NULL,
	`reservation_micros` integer NOT NULL,
	`settled` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_runs_owner_created` ON `runs` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_runs_status` ON `runs` (`status`);