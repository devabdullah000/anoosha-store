CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`previous_status` text,
	`next_status` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `order_events_order_date_idx` ON `order_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id_snapshot` text NOT NULL,
	`variant_id_snapshot` text NOT NULL,
	`product_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`has_variants` integer NOT NULL,
	`sku` text NOT NULL,
	`quantity` integer NOT NULL,
	`image_key` text,
	`original_unit_paisa` integer NOT NULL,
	`discount_percentage` integer NOT NULL,
	`final_unit_paisa` integer NOT NULL,
	`gross_paisa` integer NOT NULL,
	`discount_paisa` integer NOT NULL,
	`net_paisa` integer NOT NULL,
	`selected_attributes_json` text NOT NULL,
	`product_snapshot_json` text NOT NULL,
	`variant_snapshot_json` text NOT NULL,
	`attributes_snapshot_json` text NOT NULL,
	`images_snapshot_json` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_items_qty_check" CHECK("order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_amounts_check" CHECK("order_items"."original_unit_paisa">=0 AND "order_items"."final_unit_paisa">=0 AND "order_items"."net_paisa"="order_items"."final_unit_paisa"*"order_items"."quantity" AND "order_items"."gross_paisa"="order_items"."original_unit_paisa"*"order_items"."quantity" AND "order_items"."discount_paisa"="order_items"."gross_paisa"-"order_items"."net_paisa"),
	CONSTRAINT "order_items_json_check" CHECK(json_valid("order_items"."selected_attributes_json") AND json_valid("order_items"."product_snapshot_json") AND json_valid("order_items"."variant_snapshot_json") AND json_valid("order_items"."attributes_snapshot_json") AND json_valid("order_items"."images_snapshot_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_items_variant_per_order_unique` ON `order_items` (`order_id`,`variant_id_snapshot`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`address_line1` text NOT NULL,
	`address_line2` text,
	`city` text NOT NULL,
	`province` text NOT NULL,
	`postal_code` text,
	`country` text DEFAULT 'Pakistan' NOT NULL,
	`store_name_snapshot` text NOT NULL,
	`store_address_snapshot` text NOT NULL,
	`payment_method` text DEFAULT 'cod' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`gross_paisa` integer NOT NULL,
	`discount_paisa` integer NOT NULL,
	`subtotal_paisa` integer NOT NULL,
	`shipping_paisa` integer DEFAULT 0 NOT NULL,
	`total_paisa` integer NOT NULL,
	`cancellation_reason` text,
	`cancelled_by` text,
	`cancelled_at` text,
	`delivered_at` text,
	`last_action_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "orders_status_check" CHECK("orders"."status" IN ('pending','processing','delivered','cancelled')),
	CONSTRAINT "orders_payment_check" CHECK("orders"."payment_method"='cod'),
	CONSTRAINT "orders_totals_check" CHECK("orders"."gross_paisa" >= 0 AND "orders"."discount_paisa" >= 0 AND "orders"."subtotal_paisa" >= 0 AND "orders"."shipping_paisa" >= 0 AND "orders"."total_paisa"="orders"."subtotal_paisa"+"orders"."shipping_paisa" AND "orders"."subtotal_paisa"="orders"."gross_paisa"-"orders"."discount_paisa")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_owner_idempotency_unique` ON `orders` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `orders_user_date_idx` ON `orders` (`user_id`,`user_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_date_idx` ON `orders` (`status`,`created_at`);