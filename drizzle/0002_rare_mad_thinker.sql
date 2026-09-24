CREATE TABLE `provider_records` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`owner` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_provider_records_run_owner` ON `provider_records` (`run_id`,`owner`);