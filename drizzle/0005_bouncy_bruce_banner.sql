CREATE TABLE `inventory_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_type` text NOT NULL,
	`reference` text,
	`note` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "inventory_documents_type_check" CHECK("inventory_documents"."operation_type" in ('purchase', 'increase', 'decrease'))
);
--> statement-breakpoint
CREATE INDEX `inventory_documents_created_idx` ON `inventory_documents` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_documents_purchase_reference_unique` ON `inventory_documents` (lower("reference")) WHERE "inventory_documents"."operation_type" = 'purchase' AND "inventory_documents"."reference" IS NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD `document_id` text REFERENCES inventory_documents(id);--> statement-breakpoint
CREATE INDEX `inventory_movements_document_idx` ON `inventory_movements` (`document_id`);