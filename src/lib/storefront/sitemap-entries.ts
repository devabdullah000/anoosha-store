import "server-only";
import type { MetadataRoute } from "next";
import { storefrontEnv } from "./runtime";
import { canonical, categoryHref, productHref } from "./utils";
/** Merge these into your existing src/app/sitemap.ts; do not replace your legal-page entries. */
export async function storefrontSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const { DB } = await storefrontEnv();
  const [products, categories] = await Promise.all([
    DB.prepare(
      `SELECT p.id FROM products p WHERE p.status=1 AND p.deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.status=1 AND v.deleted_at IS NULL)
      ORDER BY p.created_at DESC LIMIT 10000`,
    ).all<{ id: string }>(),
    DB.prepare(
      `SELECT c.id FROM categories c WHERE EXISTS (
      SELECT 1 FROM products p WHERE p.category_id=c.id AND p.status=1 AND p.deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.status=1 AND v.deleted_at IS NULL))
      ORDER BY c.name COLLATE NOCASE LIMIT 5000`,
    ).all<{ id: string }>(),
  ]);
  return [
    { url: canonical("/shop"), changeFrequency: "weekly", priority: 0.9 },
    ...categories.results.map((c) => ({
      url: canonical(categoryHref(c.id)),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.results.map((p) => ({
      url: canonical(productHref(p.id)),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
