DROP INDEX `product_variants_product_name_unique`;--> statement-breakpoint
DROP INDEX `product_variants_one_default_per_product_idx`;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `deleted_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_product_name_unique` ON `product_variants` (`product_id`,lower("name")) WHERE "product_variants"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_one_default_per_product_idx` ON `product_variants` (`product_id`) WHERE "product_variants"."is_default" = 1 AND "product_variants"."deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX `products_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (lower("name")) WHERE "products"."deleted_at" IS NULL;