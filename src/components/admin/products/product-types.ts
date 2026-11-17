/** Shared, serializable product DTOs. All prices are integer PKR paisa. */
export type ProductAttributeValue =
  | { attributeId: string; kind: "dropdown"; options: { label: string; quantity: number }[] }
  | { attributeId: string; kind: "button" | "color"; values: string[] };

export type ProductImage = {
  id: string;
  storageKey: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
};
export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  sku: string;
  salePrice: number;
  purchasePrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  tag: string | null;
  isDefault: boolean;
  status: boolean;
  stock: number;
  images: ProductImage[];
  attributes: ProductAttributeValue[];
};
export type Product = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  status: boolean;
  hasVariants: boolean;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
};
export type ProductListItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  status: boolean;
  hasVariants: boolean;
  variantCount: number;
  totalStock: number;
  startingPrice: number;
  primaryImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
export type AttributeDefinition = {
  id: string;
  name: string;
  valueType: "text" | "number" | "boolean" | "color";
  displayType: "dropdown" | "button" | "color";
  unit: string | null;
};
export type CategoryDefinition = { id: string; name: string };

/** The editor's JSON contract. Files are submitted separately in FormData. */
export type DraftImage = {
  id?: string;
  uploadId?: string;
  isPrimary: boolean;
};
export type DraftVariant = {
  id?: string;
  name: string;
  description: string;
  shortDescription: string | null;
  sku: string;
  salePrice: number;
  purchasePrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  tag: string | null;
  isDefault: boolean;
  status: boolean;
  stock: number;
  images: DraftImage[];
  attributes: ProductAttributeValue[];
};
export type ProductDraft = {
  // Optimistic edit guard; not required when creating a new product.
  expectedUpdatedAt?: string;
  name: string;
  categoryId: string;
  status: boolean;
  hasVariants: boolean;
  variants: DraftVariant[];
};
