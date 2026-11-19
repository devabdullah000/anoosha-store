// This file contains all the type declarations in lib/server folder
export type AttributeValueType = "text" | "number" | "boolean" | "color";
export type AttributeDisplayType = "dropdown" | "button" | "color";

export type AttributeRecord = {
  id: string;
  name: string;
  valueType: string;
  unit: string | null;
  displayType: string;
  createdAt: string;
  updatedAt: string;
};
export type CategoryRecord = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
export type Database = D1Database;
export type CatalogProductRow = { id: string; name: string; hasVariants: number; deletedAt: string | null };
export type CatalogVariantRow = { id: string; productId: string; name: string; sku: string; stock: number; isDefault: number };
export type StockRow = { id: string; stock: number; productName: string; variantName: string; sku: string };
export type InventoryOperationType = "purchase" | "increase" | "decrease";
export type InventoryLineInput = { variantId: string; quantity: number };
export type InventoryDocumentInput = {
  documentId: string;
  operationType: InventoryOperationType;
  reference: string | null;
  note: string | null;
  lines: InventoryLineInput[];
};
export type ImageEnvironment = {
  IMAGES_BUCKET?: R2Bucket;
  R2_PUBLIC_BASE_URL?: string;
  CF_ZONE_ID?: string;
  CF_CACHE_PURGE_TOKEN?: string;
};
export type FileData = { uploadId: string; file: File };
export type ImageCleanupJob = { id: string; storageKey: string };
export type ImageCleanupReport = {
  completed: number;
  pending: number;
  warnings: string[];
};
export type SqlQuery = { sql: string; params: unknown[] };
export type ToSQL = { toSQL: () => SqlQuery };
