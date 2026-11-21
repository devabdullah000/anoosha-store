CREATE TABLE `active_promotion_products` (
	`product_id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `active_promotion_promotion_idx` ON `active_promotion_products` (`promotion_id`);--> statement-breakpoint
CREATE TABLE `promotion_variants` (
	`promotion_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	PRIMARY KEY(`promotion_id`, `variant_id`),
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `promotion_variants_product_idx` ON `promotion_variants` (`product_id`,`promotion_id`);--> statement-breakpoint
CREATE INDEX `promotion_variants_variant_idx` ON `promotion_variants` (`variant_id`,`promotion_id`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`discount_percentage` integer NOT NULL,
	`scope` text NOT NULL,
	`targets_json` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "promotions_discount_check" CHECK("promotions"."discount_percentage" BETWEEN 1 AND 99),
	CONSTRAINT "promotions_scope_check" CHECK("promotions"."scope" IN ('store','categories','products')),
	CONSTRAINT "promotions_active_check" CHECK("promotions"."is_active" IN (0,1)),
	CONSTRAINT "promotions_targets_check" CHECK(json_valid("promotions"."targets_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_name_unique` ON `promotions` (lower(trim("name")));--> statement-breakpoint
CREATE INDEX `promotions_active_updated_idx` ON `promotions` (`is_active`,`updated_at`);