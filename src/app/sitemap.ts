import type { MetadataRoute } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { STORE_URL, STOREFRONT_PAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const BASE_URL = STORE_URL.replace(/\/+$/, "");

const NON_INDEXABLE_PAGES = new Set<string>([
  "/cart",
  "/orders",
]);

type ProductSitemapRow = {
  id: string;
  productUpdatedAt: string | null;
  variantUpdatedAt: string | null;
};

type CategorySitemapRow = {
  id: string;
  categoryUpdatedAt: string | null;
  productUpdatedAt: string | null;
  variantUpdatedAt: string | null;
};

function latestValidDate(
  ...values: Array<string | null>
): Date | undefined {
  let latest = 0;

  for (const value of values) {
    if (!value) continue;

    const timestamp = Date.parse(value);

    if (
      Number.isFinite(timestamp) &&
      timestamp > latest
    ) {
      latest = timestamp;
    }
  }

  return latest ? new Date(latest) : undefined;
}

function staticPages(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/shop",
    ...STOREFRONT_PAGES.map((page) => page.href),
  ];

  return [...new Set(paths)]
    .filter(
      (path) => !NON_INDEXABLE_PAGES.has(path),
    )
    .map((path) => ({
      url:
        path === "/"
          ? BASE_URL
          : `${BASE_URL}${path}`,

      changeFrequency:
        path === "/" || path === "/shop"
          ? ("weekly" as const)
          : ("monthly" as const),

      priority:
        path === "/"
          ? 1
          : path === "/shop"
            ? 0.9
            : 0.6,
    }));
}

export default async function sitemap(): Promise<
  MetadataRoute.Sitemap
> {
  const { env } = await getCloudflareContext({
    async: true,
  });

  const db = env.DB;

  // Only visible products with at least one
  // active, non-deleted variant.
  const productsQuery = db.prepare(`
    SELECT
      p.id AS id,
      p.updated_at AS productUpdatedAt,
      MAX(v.updated_at) AS variantUpdatedAt

    FROM products p

    INNER JOIN categories c
      ON c.id = p.category_id

    INNER JOIN product_variants v
      ON v.product_id = p.id
      AND v.status = 1
      AND v.deleted_at IS NULL

    WHERE
      p.status = 1
      AND p.deleted_at IS NULL

    GROUP BY
      p.id,
      p.updated_at

    ORDER BY p.id ASC
  `);

  // Only categories containing visible products.
  const categoriesQuery = db.prepare(`
    SELECT
      c.id AS id,
      c.updated_at AS categoryUpdatedAt,
      MAX(p.updated_at) AS productUpdatedAt,
      MAX(v.updated_at) AS variantUpdatedAt

    FROM categories c

    INNER JOIN products p
      ON p.category_id = c.id
      AND p.status = 1
      AND p.deleted_at IS NULL

    INNER JOIN product_variants v
      ON v.product_id = p.id
      AND v.status = 1
      AND v.deleted_at IS NULL

    GROUP BY
      c.id,
      c.updated_at

    ORDER BY c.id ASC
  `);

  const [productsResult, categoriesResult] =
    await Promise.all([
      productsQuery.all<ProductSitemapRow>(),
      categoriesQuery.all<CategorySitemapRow>(),
    ]);

  const categories: MetadataRoute.Sitemap =
    categoriesResult.results.map((category) => ({
      url: `${BASE_URL}/shop/category/${encodeURIComponent(
        category.id,
      )}`,

      lastModified: latestValidDate(
        category.categoryUpdatedAt,
        category.productUpdatedAt,
        category.variantUpdatedAt,
      ),

      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const products: MetadataRoute.Sitemap =
    productsResult.results.map((product) => ({
      url: `${BASE_URL}/product/${encodeURIComponent(
        product.id,
      )}`,

      lastModified: latestValidDate(
        product.productUpdatedAt,
        product.variantUpdatedAt,
      ),

      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [
    ...staticPages(),
    ...categories,
    ...products,
  ];
}