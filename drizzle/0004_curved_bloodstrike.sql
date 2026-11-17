CREATE TABLE `product_image_cleanup_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_image_cleanup_storage_key_unique` ON `product_image_cleanup_jobs` (`storage_key`);--> statement-breakpoint
CREATE INDEX `product_image_cleanup_created_idx` ON `product_image_cleanup_jobs` (`created_at`);