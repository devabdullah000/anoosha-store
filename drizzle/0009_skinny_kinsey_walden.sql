CREATE TABLE `active_promotion_categories` (
	`category_id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `active_promotion_categories_promotion_idx` ON `active_promotion_categories` (`promotion_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_single_active_store` ON `promotions` (`scope`) WHERE "promotions"."scope"='store' AND "promotions"."is_active"=1;