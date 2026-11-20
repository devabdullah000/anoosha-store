import type {
  AttributeSelection,
  VariantAttribute,
} from "@/lib/storefront/types";

export type CartSelection = AttributeSelection;
export type CartAttribute = VariantAttribute;
export type CartItem = {
  id: string;
  productId: string | null;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  fallbackImageUrl: string | null;
  quantity: number;
  stock: number;
  available: boolean;
  /** True only if this product has another active variant not in this user's cart. */
  canAddAnotherVariant: boolean;
  unitPricePaisa: number;
  previousUnitPricePaisa: number;
  priceChanged: boolean;
  selections: CartSelection[];
  attributes: CartAttribute[];
  issues: string[];
  updatedAt: string;
};
export type CartPayload = {
  items: CartItem[];
  totalQuantity: number;
  subtotalPaisa: number;
  /** Informational only: checkout must recalculate atomically. */
  checkoutReady: boolean;
};
export type CartMutation = {
  variantId: string;
  quantity: number;
  attributes: CartSelection[];
};
