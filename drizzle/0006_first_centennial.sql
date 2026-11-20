CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`selections_json` text DEFAULT '[]' NOT NULL,
	`product_name_snapshot` text NOT NULL,
	`variant_name_snapshot` text NOT NULL,
	`unit_price_snapshot` integer NOT NULL,
	`image_key_snapshot` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "cart_items_quantity_check" CHECK("cart_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "cart_items_selection_json_check" CHECK(json_valid("cart_items"."selections_json")),
	CONSTRAINT "cart_items_unit_price_check" CHECK("cart_items"."unit_price_snapshot" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_items_user_variant_unique` ON `cart_items` (`user_id`,`variant_id`);--> statement-breakpoint
CREATE INDEX `cart_items_user_created_idx` ON `cart_items` (`user_id`,`created_at`);