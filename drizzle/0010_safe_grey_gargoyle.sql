PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
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
	CONSTRAINT "orders_status_check" CHECK("__new_orders"."status" IN ('pending','processing','delivered','cancelled')),
	CONSTRAINT "orders_payment_check" CHECK("__new_orders"."payment_method" IN ('cod','easypaisa','jazzcash')),
	CONSTRAINT "orders_totals_check" CHECK("__new_orders"."gross_paisa" >= 0 AND "__new_orders"."discount_paisa" >= 0 AND "__new_orders"."subtotal_paisa" >= 0 AND "__new_orders"."shipping_paisa" >= 0 AND "__new_orders"."total_paisa"="__new_orders"."subtotal_paisa"+"__new_orders"."shipping_paisa" AND "__new_orders"."subtotal_paisa"="__new_orders"."gross_paisa"-"__new_orders"."discount_paisa")
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "order_number", "user_id", "user_email", "idempotency_key", "customer_name", "customer_phone", "address_line1", "address_line2", "city", "province", "postal_code", "country", "store_name_snapshot", "store_address_snapshot", "payment_method", "status", "gross_paisa", "discount_paisa", "subtotal_paisa", "shipping_paisa", "total_paisa", "cancellation_reason", "cancelled_by", "cancelled_at", "delivered_at", "last_action_id", "created_at", "updated_at") SELECT "id", "order_number", "user_id", "user_email", "idempotency_key", "customer_name", "customer_phone", "address_line1", "address_line2", "city", "province", "postal_code", "country", "store_name_snapshot", "store_address_snapshot", "payment_method", "status", "gross_paisa", "discount_paisa", "subtotal_paisa", "shipping_paisa", "total_paisa", "cancellation_reason", "cancelled_by", "cancelled_at", "delivered_at", "last_action_id", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_owner_idempotency_unique` ON `orders` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `orders_user_date_idx` ON `orders` (`user_id`,`user_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_date_idx` ON `orders` (`status`,`created_at`);