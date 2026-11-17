export type InventoryOperationType = "purchase" | "increase" | "decrease";
export type CatalogVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  stock: number;
  isDefault: number;
};
export type CatalogProduct = {
  id: string;
  name: string;
  archived: boolean;
  hasVariants: boolean;
  variants: CatalogVariant[];
};
export type SelectedInventoryVariant = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  stock: number;
  hasVariants: boolean;
};
export type InventoryMovementRow = {
  id: string;
  variantId: string;
  movementType: "purchase" | "adjustment";
  previousQty: number;
  newQty: number;
  qtyDiff: number;
  note: string | null;
  createdAt: string;
  productId: string;
  productName: string;
  hasVariants: boolean;
  variantName: string;
  sku: string;
  documentId: string | null;
  documentType: InventoryOperationType | null;
  reference: string | null;
  documentNote: string | null;
  createdBy: string | null;
  type: InventoryOperationType | "initial";
};
export type ApiResponse<T> = { success: boolean; message?: string; data?: T };
