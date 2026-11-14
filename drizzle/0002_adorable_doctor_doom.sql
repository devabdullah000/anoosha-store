CREATE TABLE `attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value_type` text NOT NULL,
	`unit` text,
	`display_type` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "attributes_value_type_check" CHECK("attributes"."value_type" in ('text', 'number', 'boolean', 'color')),
	CONSTRAINT "attributes_display_type_check" CHECK("attributes"."display_type" in ('dropdown', 'button', 'color'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attributes_name_unique` ON `attributes` (lower("name"));--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`product_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "categories_product_count_check" CHECK("categories"."product_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (lower("name"));--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`movement_type` text NOT NULL,
	`previous_qty` integer NOT NULL,
	`new_qty` integer NOT NULL,
	`qty_diff` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "inventory_movements_previous_qty_check" CHECK("inventory_movements"."previous_qty" >= 0),
	CONSTRAINT "inventory_movements_new_qty_check" CHECK("inventory_movements"."new_qty" >= 0),
	CONSTRAINT "inventory_movements_qty_diff_check" CHECK("inventory_movements"."qty_diff" = ("inventory_movements"."new_qty" - "inventory_movements"."previous_qty"))
);
--> statement-breakpoint
CREATE INDEX `inventory_movements_variant_created_idx` ON `inventory_movements` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inventory_movements_type_created_idx` ON `inventory_movements` (`movement_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`sort_order` integer NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "product_images_sort_order_check" CHECK("product_images"."sort_order" between 1 and 5),
	CONSTRAINT "product_images_primary_check" CHECK("product_images"."is_primary" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_images_variant_sort_order_unique` ON `product_images` (`variant_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_images_one_primary_per_variant_idx` ON `product_images` (`variant_id`) WHERE "product_images"."is_primary" = 1;--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`short_description` text,
	`sku` text NOT NULL,
	`sale_price` integer NOT NULL,
	`purchase_price` integer NOT NULL,
	`has_discount` integer DEFAULT false NOT NULL,
	`discount_percentage` integer DEFAULT 0 NOT NULL,
	`tag` text,
	`is_default` integer DEFAULT false NOT NULL,
	`status` integer DEFAULT true NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "product_variants_sale_price_check" CHECK("product_variants"."sale_price" >= 0),
	CONSTRAINT "product_variants_purchase_price_check" CHECK("product_variants"."purchase_price" >= 0),
	CONSTRAINT "product_variants_stock_check" CHECK("product_variants"."stock" >= 0),
	CONSTRAINT "product_variants_discount_check" CHECK((
        ("product_variants"."has_discount" = 0 AND "product_variants"."discount_percentage" = 0)
        OR
        ("product_variants"."has_discount" = 1 AND "product_variants"."discount_percentage" BETWEEN 1 AND 99)
      )),
	CONSTRAINT "product_variants_default_check" CHECK("product_variants"."is_default" in (0, 1)),
	CONSTRAINT "product_variants_status_check" CHECK("product_variants"."status" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_product_name_unique` ON `product_variants` (`product_id`,lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (lower("sku"));--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_slug_unique` ON `product_variants` (lower("slug"));--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_one_default_per_product_idx` ON `product_variants` (`product_id`) WHERE "product_variants"."is_default" = 1;--> statement-breakpoint
CREATE INDEX `product_variants_product_status_default_idx` ON `product_variants` (`product_id`,`status`,`is_default`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text NOT NULL,
	`status` integer DEFAULT true NOT NULL,
	`has_variants` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "products_status_check" CHECK("products"."status" in (0, 1)),
	CONSTRAINT "products_has_variants_check" CHECK("products"."has_variants" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (lower("name"));--> statement-breakpoint
CREATE INDEX `products_category_listing_idx` ON `products` (`category_id`,`status`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_status_deleted_created_idx` ON `products` (`status`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `variant_attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`attribute_id` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`attribute_id`) REFERENCES `attributes`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variant_attributes_variant_attribute_unique` ON `variant_attributes` (`variant_id`,`attribute_id`);--> statement-breakpoint
CREATE INDEX `variant_attributes_attribute_id_idx` ON `variant_attributes` (`attribute_id`);