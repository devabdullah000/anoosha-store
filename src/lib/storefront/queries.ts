import "server-only";
import {
  promotionPriceJoins,
  effectiveHasDiscount,
  effectiveDiscount,
} from "@/lib/promotions/sql";
import { cache } from "react";
import { storefrontEnv, r2Url, r2FallbackUrl } from "./runtime";
import { pagination } from "./utils";
import type {
  ProductCardModel,
  StoreCategory,
  StoreProduct,
  StoreVariant,
  StorefrontPage,
} from "./types";

type CardRow = {
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
  appliedPromotionName: string | null;
  imageKey: string | null;
  categoryRow?: number;
};
type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};
type CountRow = { total: number };

const visibleParent = `p.status = 1 AND p.deleted_at IS NULL`;
const visibleVariant = `v.status = 1 AND v.deleted_at IS NULL`;
const variantExists = `EXISTS (SELECT 1 FROM product_variants ev WHERE ev.product_id = p.id AND ev.status = 1 AND ev.deleted_at IS NULL)`;
const cardColumns = `
  p.id AS productId, p.name AS name, p.category_id AS categoryId, c.name AS categoryName,
  p.has_variants AS hasVariants,
  (SELECT COUNT(*) FROM product_variants cv WHERE cv.product_id = p.id AND cv.status=1 AND cv.deleted_at IS NULL) AS variantCount,
  v.id AS representativeVariantId, v.name AS representativeVariantName,
  v.description AS description, v.short_description AS shortDescription,
  v.sale_price AS salePrice, ${effectiveHasDiscount} AS hasDiscount,
  ${effectiveDiscount} AS discountPercentage,
  promo_active.name AS appliedPromotionName, v.stock AS stock,
  COALESCE(
    (SELECT i.storage_key FROM product_images i
     WHERE i.variant_id=v.id
     ORDER BY i.is_primary DESC, i.sort_order ASC LIMIT 1),
    (SELECT i.storage_key FROM product_images i
     JOIN product_variants iv ON iv.id=i.variant_id
     WHERE iv.product_id=p.id AND iv.status=1 AND iv.deleted_at IS NULL
     ORDER BY iv.is_default DESC, i.is_primary DESC, i.sort_order ASC
     LIMIT 1)
  ) AS imageKey`;

function representativeVariant(extra = "") {
  // Prefer an actually discounted promotional variant on the card. Otherwise
  // preserve the previous best-discount / lowest-price / default tie-breaks.
  return `JOIN product_variants v ON v.id = (
    SELECT rv.id FROM product_variants rv
    WHERE rv.product_id=p.id AND rv.status=1 AND rv.deleted_at IS NULL ${extra}
    ORDER BY
      CASE WHEN EXISTS(
        SELECT 1 FROM promotion_variants pv
        JOIN promotions pr ON pr.id=pv.promotion_id AND pr.is_active=1
        WHERE pv.variant_id=rv.id
      ) THEN 1 ELSE 0 END DESC,
      CASE WHEN rv.has_discount=1 THEN rv.discount_percentage ELSE 0 END DESC,
      CAST((rv.sale_price*(100-(CASE WHEN rv.has_discount=1 THEN rv.discount_percentage ELSE 0 END))+50)/100 AS INTEGER) ASC,
      rv.is_default DESC, rv.id ASC
    LIMIT 1
  )`;
}

function projectCard(row: CardRow, base?: string): ProductCardModel {
  const card = {
    productId: row.productId,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    hasVariants: !!row.hasVariants,
    variantCount: Number(row.variantCount),
    representativeVariantId: row.representativeVariantId,
    representativeVariantName: row.representativeVariantName,
    description: row.description,
    shortDescription: row.shortDescription,
    salePrice: row.salePrice,
    hasDiscount: !!row.hasDiscount,
    discountPercentage: row.discountPercentage,
    appliedPromotionName: row.appliedPromotionName,
    stock: row.stock,
    imageUrl: row.imageKey ? r2Url(row.imageKey, base) : null,
    fallbackImageUrl: row.imageKey ? r2FallbackUrl(row.imageKey) : null,
  };
  return card;
}

export async function taggedProducts(
  tag: "featured" | "latest",
  limit = 14,
): Promise<ProductCardModel[]> {
  const { DB, R2_PUBLIC_BASE_URL } = await storefrontEnv();
  const rows = await DB.prepare(
    `SELECT ${cardColumns} FROM products p
    JOIN categories c ON c.id=p.category_id
    ${representativeVariant()}
    ${promotionPriceJoins}
    WHERE ${visibleParent}
      AND EXISTS (SELECT 1 FROM product_variants tv WHERE tv.product_id=p.id
        AND tv.status=1 AND tv.deleted_at IS NULL AND lower(trim(tv.tag))=?)
    ORDER BY p.created_at DESC,p.id DESC LIMIT ?`,
  )
    .bind(tag, Math.max(1, Math.min(limit, 30)))
    .all<CardRow>();
  return rows.results.map((r) => projectCard(r, R2_PUBLIC_BASE_URL));
}

export async function shopCategories(
  page: number,
  limit: number,
): Promise<StorefrontPage<StoreCategory>> {
  const { DB, R2_PUBLIC_BASE_URL } = await storefrontEnv();
  const countRes = await DB.prepare(
    `SELECT count(*) AS total FROM categories c WHERE EXISTS (
    SELECT 1 FROM products p WHERE p.category_id=c.id AND ${visibleParent} AND ${variantExists})`,
  ).first<CountRow>();
  const total = Number(countRes?.total ?? 0);
  const info = pagination(page, limit, total);
  const categoryRes = await DB.prepare(
    `SELECT c.id,c.name,c.description,
    (SELECT count(*) FROM products p WHERE p.category_id=c.id AND ${visibleParent} AND ${variantExists}) AS productCount
    FROM categories c WHERE EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id AND ${visibleParent} AND ${variantExists})
    ORDER BY c.name COLLATE NOCASE ASC, c.id ASC LIMIT ? OFFSET ?`,
  )
    .bind(info.limit, (info.page - 1) * info.limit)
    .all<CategoryRow>();
  const categories = categoryRes.results;
  if (!categories.length) return { data: [], pagination: info };
  const placeholders = categories.map(() => "?").join(",");
  const rows = await DB.prepare(
    `WITH ranked AS (
    SELECT ${cardColumns},
    row_number() OVER (PARTITION BY p.category_id ORDER BY p.created_at DESC,p.id DESC) AS categoryRow
    FROM products p JOIN categories c ON c.id=p.category_id
    ${representativeVariant()}
    ${promotionPriceJoins}
    WHERE ${visibleParent} AND p.category_id IN (${placeholders})
  ) SELECT * FROM ranked WHERE categoryRow<=? ORDER BY categoryId ASC,categoryRow ASC`,
  )
    .bind(...categories.map((c) => c.id), info.limit)
    .all<CardRow>();
  const grouped = new Map<string, ProductCardModel[]>();
  for (const row of rows.results)
    grouped.set(row.categoryId, [
      ...(grouped.get(row.categoryId) ?? []),
      projectCard(row, R2_PUBLIC_BASE_URL),
    ]);
  return {
    data: categories.map((c) => ({
      ...c,
      productCount: Number(c.productCount),
      products: grouped.get(c.id) ?? [],
    })),
    pagination: info,
  };
}

export async function categoryProducts(
  categoryId: string,
  page: number,
  limit: number,
): Promise<{
  category: Omit<StoreCategory, "products">;
  listing: StorefrontPage<ProductCardModel>;
} | null> {
  const { DB, R2_PUBLIC_BASE_URL } = await storefrontEnv();
  const category = await DB.prepare(
    `SELECT c.id,c.name,c.description,
    (SELECT count(*) FROM products p WHERE p.category_id=c.id AND ${visibleParent} AND ${variantExists}) AS productCount
    FROM categories c WHERE c.id=?`,
  )
    .bind(categoryId)
    .first<CategoryRow>();
  if (!category) return null;
  const total = Number(category.productCount);
  const info = pagination(page, limit, total);
  const rows = await DB.prepare(
    `SELECT ${cardColumns} FROM products p JOIN categories c ON c.id=p.category_id
    ${representativeVariant()} ${promotionPriceJoins} WHERE ${visibleParent} AND p.category_id=?
    ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?`,
  )
    .bind(categoryId, info.limit, (info.page - 1) * info.limit)
    .all<CardRow>();
  return {
    category: { ...category, productCount: total },
    listing: {
      data: rows.results.map((r) => projectCard(r, R2_PUBLIC_BASE_URL)),
      pagination: info,
    },
  };
}

type ProductRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  hasVariants: number;
};
type VariantRow = {
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
  appliedPromotionName: string | null;
};
type ImageRow = {
  id: string;
  variantId: string;
  storageKey: string;
  sortOrder: number;
  isPrimary: number;
};
type AttributeRow = {
  id: string;
  variantId: string;
  name: string;
  value: string;
  displayType: "dropdown" | "button" | "color";
  valueType: "text" | "number" | "boolean" | "color";
  unit: string | null;
};

async function productDetailsUncached(
  productId: string,
): Promise<StoreProduct | null> {
  const { DB, R2_PUBLIC_BASE_URL } = await storefrontEnv();
  const p = await DB.prepare(
    `SELECT p.id,p.name,p.category_id AS categoryId,c.name AS categoryName,p.has_variants AS hasVariants
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.id=? AND ${visibleParent} AND ${variantExists}`,
  )
    .bind(productId)
    .first<ProductRow>();
  if (!p) return null;
  const variants = await DB.prepare(
    `SELECT v.id,v.name,v.slug,v.sku,v.description,v.short_description AS shortDescription,
    v.sale_price AS salePrice,${effectiveHasDiscount} AS hasDiscount,${effectiveDiscount} AS discountPercentage,
    v.is_default AS isDefault,v.stock,promo_active.name AS appliedPromotionName
    FROM product_variants v ${promotionPriceJoins} WHERE v.product_id=? AND ${visibleVariant}
    ORDER BY v.is_default DESC,v.created_at ASC,v.id ASC`,
  )
    .bind(productId)
    .all<VariantRow>();
  if (!variants.results.length) return null;
  const ids = variants.results.map((v) => v.id);
  const qs = ids.map(() => "?").join(",");
  const [images, attrs] = await Promise.all([
    DB.prepare(
      `SELECT id,variant_id AS variantId,storage_key AS storageKey,sort_order AS sortOrder,is_primary AS isPrimary
      FROM product_images WHERE variant_id IN (${qs}) ORDER BY is_primary DESC,sort_order ASC`,
    )
      .bind(...ids)
      .all<ImageRow>(),
    DB.prepare(
      `SELECT va.variant_id AS variantId,a.id,a.name,a.value_type AS valueType,a.display_type AS displayType,
      a.unit,va.value FROM variant_attributes va JOIN attributes a ON a.id=va.attribute_id
      WHERE va.variant_id IN (${qs}) ORDER BY a.name COLLATE NOCASE ASC`,
    )
      .bind(...ids)
      .all<AttributeRow>(),
  ]);
  const resultVariants: StoreVariant[] = variants.results.map((v) => ({
    id: v.id,
    name: !p.hasVariants ? p.name : v.name,
    slug: v.slug,
    sku: v.sku,
    description: v.description,
    shortDescription: v.shortDescription,
    salePrice: v.salePrice,
    hasDiscount: !!v.hasDiscount,
    discountPercentage: v.discountPercentage,
    appliedPromotionName: v.appliedPromotionName,
    isDefault: !!v.isDefault,
    stock: v.stock,
    images: images.results
      .filter((i) => i.variantId === v.id)
      .map((i) => ({
        id: i.id,
        url: r2Url(i.storageKey, R2_PUBLIC_BASE_URL),
        fallbackImageUrl: r2FallbackUrl(i.storageKey),
        sortOrder: i.sortOrder,
        isPrimary: !!i.isPrimary,
      })),
    attributes: attrs.results
      .filter((a) => a.variantId === v.id)
      .map(({ variantId: _variantId, ...attr }) => attr),
  }));
  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    hasVariants: !!p.hasVariants,
    variants: resultVariants,
  };
}

/** Per-request React memoization can share D1 reads with generateMetadata(). */
export const productDetails = cache(productDetailsUncached);

/** Lightweight category highlights on Home, without loading their full product rails. */
export async function categoryHighlights(
  limit = 4,
): Promise<Omit<StoreCategory, "products">[]> {
  const { DB } = await storefrontEnv();
  const rows = await DB.prepare(
    `SELECT c.id,c.name,c.description,
    (SELECT count(*) FROM products p WHERE p.category_id=c.id AND ${visibleParent} AND ${variantExists}) AS productCount
    FROM categories c WHERE EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id AND ${visibleParent} AND ${variantExists})
    ORDER BY c.name COLLATE NOCASE ASC,c.id ASC LIMIT ?`,
  )
    .bind(Math.min(12, Math.max(1, limit)))
    .all<CategoryRow>();
  return rows.results.map((c) => ({
    ...c,
    productCount: Number(c.productCount),
  }));
}
