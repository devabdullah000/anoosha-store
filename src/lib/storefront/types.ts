/** Public projections deliberately omit purchase_price, status and deleted_at. */
export type ProductCardModel = {
  productId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  hasVariants: boolean;
  variantCount: number;
  representativeVariantId: string;
  representativeVariantName: string;
  description: string;
  shortDescription: string | null;
  salePrice: number; // PKR paisa
  hasDiscount: boolean;
  discountPercentage: number;
  /** Name of the active promotion for the representative variant (or null). */
  appliedPromotionName: string | null;
  stock: number;
  imageUrl: string | null;
  fallbackImageUrl?: string | null;
};

export type StoreCategory = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  products: ProductCardModel[];
};

export type PageInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type StorefrontPage<T> = {
  data: T[];
  pagination: PageInfo;
};

export type VariantImage = {
  id: string;
  url: string;
  // The queries.ts projection already supplies this property when available.
  fallbackImageUrl?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type VariantAttribute = {
  id: string;
  name: string;
  value: string;
  displayType: 'dropdown' | 'button' | 'color';
  valueType: 'text' | 'number' | 'boolean' | 'color';
  unit: string | null;
};

export type StoreVariant = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string | null;
  salePrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  /** Active promotion affecting this variant; null means individual pricing. */
  appliedPromotionName: string | null;
  isDefault: boolean;
  stock: number;
  images: VariantImage[];
  attributes: VariantAttribute[];
};

export type StoreProduct = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  hasVariants: boolean;
  variants: StoreVariant[];
};

export type HeroSlide = {
  id: string;
  imageKey: string;
  imageUrl: string;
  fallbackImageUrl?: string | null;
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
};

export type HeroManifest = {
  version: 1;
  intervalMs: number;
  slides: HeroSlide[];
};

export const DEFAULT_HERO_MANIFEST: HeroManifest = {
  version: 1,
  intervalMs: 6500,
  slides: [],
};

/** One selected option label counts as one selection; it is not a per-option quantity allocation. */
export type AttributeSelection = {
  attributeId: string;
  values: string[];
};

export type PurchaseIntent = {
  productId: string;
  variantId: string;
  quantity: number;
  attributes: AttributeSelection[];
};

export type AttributeChoice = {
  label: string;
  /** Null means that the stored record has no per-option stock information. */
  quantity: number | null;
  /** Optional CSS color representation for color-type attributes. */
  color: string | null;
};

export type StorefrontEnv = {
  DB: D1Database;
  IMAGES_BUCKET?: R2Bucket;
  R2_PUBLIC_BASE_URL?: string;
};

export type CardRow = {
  productId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  hasVariants: number;
  variantCount: number;
  representativeVariantId: string;
  representativeVariantName: string;
  description: string;
  shortDescription: string | null;
  salePrice: number;
  hasDiscount: number;
  discountPercentage: number;
  stock: number;
  imageKey: string | null;
  categoryRow?: number;
};
export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};
export type CountRow = { total: number };

export type ProductRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  hasVariants: number;
};

export type VariantRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string | null;
  salePrice: number;
  hasDiscount: number;
  discountPercentage: number;
  isDefault: number;
  stock: number;
};

export type ImageRow = {
  id: string;
  variantId: string;
  storageKey: string;
  sortOrder: number;
  isPrimary: number;
};

export type AttributeRow = {
  id: string;
  variantId: string;
  name: string;
  value: string;
  displayType: "dropdown" | "button" | "color";
  valueType: "text" | "number" | "boolean" | "color";
  unit: string | null;
};

export type StorefrontEnvPurge = {
  CF_ZONE_ID?: string;
  CF_CACHE_PURGE_TOKEN?: string;
};