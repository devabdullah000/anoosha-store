import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth/require-auth";
import type {
  CatalogPage,
  CategoryTarget,
  Page,
  ProductTarget,
  PromotionDetail,
  PromotionListRow,
  PromotionScope,
  PromotionTargets,
} from "./types";

export class PromotionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PromotionError";
  }
}
export const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const DB = () => getCloudflareContext().env.DB;
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const idPattern = /^[a-zA-Z0-9_-]{1,128}$/;
const validId = (x: unknown): x is string =>
  typeof x === "string" && idPattern.test(x);
const assertId = (v: unknown, what = "Identifier") => {
  if (!validId(v)) throw new PromotionError(400, `${what} is invalid.`);
  return v;
};
const asArray = (v: unknown, max: number, field: string): unknown[] => {
  if (!Array.isArray(v) || v.length > max)
    throw new PromotionError(
      400,
      `${field} must be an array with at most ${max} entries.`,
    );
  return v;
};
const idList = (v: unknown, max: number, field: string): string[] => {
  const ids = asArray(v, max, field).map((x) => assertId(x, field));
  if (new Set(ids).size !== ids.length)
    throw new PromotionError(
      400,
      `Duplicate ${field} entries are not allowed.`,
    );
  return ids;
};
function productTarget(raw: unknown): ProductTarget {
  if (!object(raw)) throw new PromotionError(400, "Invalid product selection.");
  return {
    productId: assertId(raw.productId, "Product ID"),
    variantIds:
      raw.variantIds === null
        ? null
        : idList(raw.variantIds, 200, "Variant IDs"),
  };
}
function products(raw: unknown): ProductTarget[] {
  const list = asArray(raw, 800, "Products").map(productTarget);
  if (new Set(list.map((p) => p.productId)).size !== list.length)
    throw new PromotionError(
      400,
      "A product may appear only once in the selection.",
    );
  return list;
}
function categoryTarget(raw: unknown): CategoryTarget {
  if (!object(raw) || typeof raw.allProducts !== "boolean")
    throw new PromotionError(400, "Invalid category selection.");
  return {
    categoryId: assertId(raw.categoryId, "Category ID"),
    allProducts: raw.allProducts,
    products: products(raw.products),
    excludedVariantIds: idList(
      raw.excludedVariantIds,
      2000,
      "Excluded variant IDs",
    ),
  };
}
export function parseTargets(input: unknown): PromotionTargets {
  if (
    !object(input) ||
    !["store", "categories", "products"].includes(String(input.scope))
  )
    throw new PromotionError(400, "Choose store, categories, or products.");
  const scope = input.scope as PromotionScope;
  const categories = asArray(input.categories, 200, "Categories").map(
    categoryTarget,
  );
  const productList = products(input.products);
  const excludedVariantIds = idList(
    input.excludedVariantIds,
    3000,
    "Excluded variant IDs",
  );
  if (new Set(categories.map((c) => c.categoryId)).size !== categories.length)
    throw new PromotionError(
      400,
      "Duplicate category selections are not allowed.",
    );
  if (scope === "categories" && !categories.length)
    throw new PromotionError(400, "Select at least one category.");
  if (scope === "products" && !productList.length)
    throw new PromotionError(400, "Select at least one product.");
  if (
    scope === "categories" &&
    categories.some((c) => !c.allProducts && !c.products.length)
  )
    throw new PromotionError(
      400,
      "For every selective category, select at least one product.",
    );
  // Ignore unrelated form state: only one scope is authoritative at a time.
  return {
    scope,
    categories: scope === "categories" ? categories : [],
    products: scope === "products" ? productList : [],
    excludedVariantIds: scope === "store" ? excludedVariantIds : [],
  };
}
function input(raw: unknown) {
  if (!object(raw)) throw new PromotionError(400, "Invalid promotion request.");
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const discount = Number(raw.discountPercentage);
  if (name.length < 2 || name.length > 100)
    throw new PromotionError(400, "Promotion name must be 2–100 characters.");
  if (description.length > 500)
    throw new PromotionError(
      400,
      "Description must be at most 500 characters.",
    );
  if (!Number.isInteger(discount) || discount < 1 || discount > 99)
    throw new PromotionError(
      400,
      "Discount must be a whole percentage from 1 to 99.",
    );
  if (typeof raw.isActive !== "boolean")
    throw new PromotionError(
      400,
      "Promotion activation must be true or false.",
    );
  const targets = parseTargets(raw.targets);
  const serialized = JSON.stringify(targets);
  if (serialized.length > 85000)
    throw new PromotionError(
      413,
      "Too many target selections. Reduce the selection size.",
    );
  return {
    name,
    description: description || null,
    discount,
    targets,
    serialized,
    isActive: raw.isActive,
  };
}
export async function requireAdmin() {
  const user = await getCurrentUser({ forceFresh: true });
  if (!user) throw new PromotionError(401, "Sign in to continue.");
  if (user.role !== "admin")
    throw new PromotionError(403, "Administrator access required.");
}
export function verifyOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    throw new PromotionError(403, "Invalid request origin.");
}
export async function readBody(req: Request) {
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(
      req.headers.get("content-type") || "",
    )
  )
    throw new PromotionError(415, "Expected JSON.");
  const text = await req.text();
  if (text.length > 100000)
    throw new PromotionError(413, "Promotion request is too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PromotionError(400, "Invalid JSON.");
  }
}
export function errorResponse(err: unknown) {
  if (!(err instanceof PromotionError))
    console.error("Promotion request failed:", err);
  return Response.json(
    {
      success: false,
      message:
        err instanceof PromotionError
          ? err.message
          : "Unable to save the promotion.",
    },
    { status: err instanceof PromotionError ? err.status : 500, headers },
  );
}

// One set-based insert handles all-store, multiple whole/selected categories,
// individual products, and individual variant exclusions without an N+1 loop.
const membershipFrom = `FROM product_variants v JOIN products p ON p.id=v.product_id
 CROSS JOIN (SELECT ? AS rules_json) cfg
 WHERE p.status=1 AND p.deleted_at IS NULL AND v.status=1 AND v.deleted_at IS NULL
 AND (
   (json_extract(cfg.rules_json,'$.scope')='store'
     AND NOT EXISTS (SELECT 1 FROM json_each(cfg.rules_json,'$.excludedVariantIds') x WHERE x.value=v.id))
   OR (json_extract(cfg.rules_json,'$.scope')='products' AND EXISTS (
     SELECT 1 FROM json_each(cfg.rules_json,'$.products') pt
     WHERE json_extract(pt.value,'$.productId')=p.id AND (
       json_type(pt.value,'$.variantIds')='null' OR EXISTS (
         SELECT 1 FROM json_each(pt.value,'$.variantIds') vx WHERE vx.value=v.id
       )
     )
   ))
   OR (json_extract(cfg.rules_json,'$.scope')='categories' AND EXISTS (
     SELECT 1 FROM json_each(cfg.rules_json,'$.categories') ct
     WHERE json_extract(ct.value,'$.categoryId')=p.category_id
       AND NOT EXISTS (SELECT 1 FROM json_each(ct.value,'$.excludedVariantIds') x WHERE x.value=v.id)
       AND (
         json_extract(ct.value,'$.allProducts')=1
         OR EXISTS (SELECT 1 FROM json_each(ct.value,'$.products') pt
            WHERE json_extract(pt.value,'$.productId')=p.id AND (
              json_type(pt.value,'$.variantIds')='null' OR EXISTS(
                SELECT 1 FROM json_each(pt.value,'$.variantIds') vx WHERE vx.value=v.id
              )
            )
         )
       )
   ))
 )`;
const insertMembership = `INSERT INTO promotion_variants(promotion_id,product_id,variant_id)
  SELECT ?,p.id,v.id ${membershipFrom}`;
type Conflict = { promotionName: string; productName: string };
/** Failure-only diagnostics. The database triggers are the authoritative guard. */
async function conflictMessage(
  id: string,
  serialized?: string,
): Promise<string | null> {
  const database = DB();
  const current = serialized
    ? {
        scope: JSON.parse(serialized).scope as PromotionScope,
        targetsJson: serialized,
      }
    : await database
        .prepare(
          "SELECT scope,targets_json AS targetsJson FROM promotions WHERE id=?",
        )
        .bind(id)
        .first<{ scope: PromotionScope; targetsJson: string }>();
  if (!current) throw new PromotionError(404, "Promotion not found.");
  const store = await database
    .prepare(
      `SELECT name FROM promotions
    WHERE is_active=1 AND id<>? AND (?='store' OR scope='store')
    ORDER BY created_at ASC LIMIT 1`,
    )
    .bind(id, current.scope)
    .first<{ name: string }>();
  if (store)
    return `"${store.name}" is already active. A store-wide promotion cannot run alongside another promotion. Deactivate "${store.name}" or save this promotion as inactive.`;
  if (current.scope === "categories") {
    const category = await database
      .prepare(
        `
      SELECT pr.name AS promotionName,c.name AS categoryName
      FROM active_promotion_categories ac
      JOIN promotions pr ON pr.id=ac.promotion_id AND pr.is_active=1
      JOIN categories c ON c.id=ac.category_id
      JOIN json_each(?,'$.categories') incoming
        ON json_extract(incoming.value,'$.categoryId')=ac.category_id
      WHERE ac.promotion_id<>? LIMIT 1`,
      )
      .bind(current.targetsJson, id)
      .first<{ promotionName: string; categoryName: string }>();
    if (category)
      return `"${category.promotionName}" is already active for category "${category.categoryName}". Deactivate it or save this promotion as inactive.`;
  }
  // Include the incoming scope's *resolved* product IDs, even if it is store-wide.
  const productSql = serialized
    ? `SELECT pr.name AS promotionName,p.name AS productName
       FROM promotion_variants assigned
       JOIN promotions pr ON pr.id=assigned.promotion_id AND pr.is_active=1
       JOIN products p ON p.id=assigned.product_id
       WHERE pr.id<>? AND assigned.product_id IN (
          SELECT DISTINCT v.product_id ${membershipFrom}
       ) LIMIT 1`
    : `SELECT pr.name AS promotionName,p.name AS productName
       FROM promotion_variants assigned
       JOIN promotions pr ON pr.id=assigned.promotion_id AND pr.is_active=1
       JOIN products p ON p.id=assigned.product_id
       WHERE pr.id<>? AND assigned.product_id IN (
          SELECT product_id FROM promotion_variants WHERE promotion_id=?
       ) LIMIT 1`;
  const product = serialized
    ? await database.prepare(productSql).bind(id, serialized).first<Conflict>()
    : await database.prepare(productSql).bind(id, id).first<Conflict>();
  if (product)
    return `"${product.promotionName}" on "${product.productName}" is already active. Remove the product from "${product.promotionName}", deactivate that promotion, or save this promotion as inactive.`;
  return null;
}
async function assertNoConflict(
  id: string,
  serialized?: string,
): Promise<void> {
  const message = await conflictMessage(id, serialized);
  if (message) throw new PromotionError(409, message);
}
async function explainConflict(
  id: string,
  serialized?: string,
): Promise<never> {
  const message = await conflictMessage(id, serialized);
  throw new PromotionError(
    409,
    message ??
      "Promotion could not be activated. Check active catalog membership and verify the promotions hardening migration is installed.",
  );
}

export async function listPromotions(
  page = 1,
  pageSize = 10,
): Promise<Page<PromotionListRow>> {
  page = Math.max(1, Math.min(10000, Math.floor(page) || 1));
  pageSize = [10, 20, 50, 100].includes(pageSize) ? pageSize : 10;
  const rows = await DB()
    .prepare(
      `SELECT pr.id,pr.name,pr.description,pr.discount_percentage AS discountPercentage,
    pr.scope,pr.is_active AS isActive,pr.created_at AS createdAt,pr.updated_at AS updatedAt,
    (SELECT count(DISTINCT pv.product_id) FROM promotion_variants pv WHERE pv.promotion_id=pr.id) AS productsCount,
    (SELECT count(*) FROM promotion_variants pv WHERE pv.promotion_id=pr.id) AS variantsCount,
    count(*) OVER() AS total
    FROM promotions pr ORDER BY pr.created_at DESC,pr.id DESC LIMIT ? OFFSET ?`,
    )
    .bind(pageSize, (page - 1) * pageSize)
    .all<PromotionListRow & { total: number }>();
  return {
    data: rows.results.map(({ total: _total, ...row }) => ({
      ...row,
      isActive: !!row.isActive,
    })),
    page,
    pageSize,
    total: Number(rows.results[0]?.total ?? 0),
  };
}
export async function promotionDetail(id: string): Promise<PromotionDetail> {
  assertId(id, "Promotion ID");
  const row = await DB()
    .prepare(
      `SELECT p.id,p.name,p.description,p.discount_percentage AS discountPercentage,
    p.scope,p.targets_json AS targetsJson,p.is_active AS isActive,p.created_at AS createdAt,p.updated_at AS updatedAt,
    (SELECT count(DISTINCT pv.product_id) FROM promotion_variants pv WHERE pv.promotion_id=p.id) AS productsCount,
    (SELECT count(*) FROM promotion_variants pv WHERE pv.promotion_id=p.id) AS variantsCount
    FROM promotions p WHERE p.id=?`,
    )
    .bind(id)
    .first<PromotionListRow & { targetsJson: string }>();
  if (!row) throw new PromotionError(404, "Promotion not found.");
  const { targetsJson, ...rest } = row;
  return {
    ...rest,
    isActive: !!row.isActive,
    targets: JSON.parse(targetsJson) as PromotionTargets,
  };
}
export async function createPromotion(raw: unknown) {
  const data = input(raw),
    id = `promo_${crypto.randomUUID()}`,
    database = DB();
  // Friendly preflight for rare admin writes. Triggers remain the atomic authority.
  if (data.isActive) await assertNoConflict(id, data.serialized);
  const stmts = [
    database
      .prepare(
        `INSERT INTO promotions(id,name,description,discount_percentage,scope,targets_json)
      VALUES(?,?,?,?,?,?)`,
      )
      .bind(
        id,
        data.name,
        data.description,
        data.discount,
        data.targets.scope,
        data.serialized,
      ),
    database.prepare(insertMembership).bind(id, data.serialized),
  ];
  if (data.isActive)
    stmts.push(
      database
        .prepare(
          "UPDATE promotions SET is_active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
        .bind(id),
    );
  try {
    await database.batch(stmts);
  } catch (e) {
    if (/promotions_name_unique|promotions\.name/i.test(String(e)))
      throw new PromotionError(409, "Promotion name already exists.");
    if (data.isActive) await explainConflict(id, data.serialized);
    throw e;
  }
  return { id };
}
export async function updatePromotion(id: string, raw: unknown) {
  assertId(id, "Promotion ID");
  const data = input(raw),
    existing = await promotionDetail(id),
    database = DB();
  if (data.isActive) await assertNoConflict(id, data.serialized);
  if (
    existing.isActive &&
    (data.serialized !== JSON.stringify(existing.targets) ||
      data.targets.scope !== existing.scope)
  )
    throw new PromotionError(
      409,
      "Deactivate this promotion before changing its products or variants.",
    );
  const targetChanged = data.serialized !== JSON.stringify(existing.targets);
  if (existing.isActive && targetChanged)
    throw new PromotionError(
      409,
      "Deactivate the promotion before editing targets.",
    );
  if (existing.isActive && !data.isActive) {
    // Deactivate first, then allow target replacement in the same transaction.
  }
  const stmts = [
    database
      .prepare(
        `UPDATE promotions SET name=?,description=?,discount_percentage=?,scope=?,targets_json=?,
    is_active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      )
      .bind(
        data.name,
        data.description,
        data.discount,
        data.targets.scope,
        data.serialized,
        id,
      ),
  ];
  if (targetChanged || !existing.isActive) {
    stmts.push(
      database
        .prepare("DELETE FROM promotion_variants WHERE promotion_id=?")
        .bind(id),
    );
    stmts.push(database.prepare(insertMembership).bind(id, data.serialized));
  }
  if (data.isActive)
    stmts.push(
      database.prepare("UPDATE promotions SET is_active=1 WHERE id=?").bind(id),
    );
  try {
    await database.batch(stmts);
  } catch (e) {
    if (/promotions_name_unique|promotions\.name/i.test(String(e)))
      throw new PromotionError(409, "Promotion name already exists.");
    if (data.isActive) await explainConflict(id, data.serialized);
    throw e;
  }
  return { id };
}
export async function togglePromotion(id: string, active: boolean) {
  assertId(id, "Promotion ID");
  const database = DB();
  if (active) {
    await assertNoConflict(id);
    // Resolve live catalog again when enabling (including products created while inactive).
    // All three statements execute atomically, including the product uniqueness trigger.
    const dynamicSql = insertMembership.replace(
      "CROSS JOIN (SELECT ? AS rules_json) cfg",
      "CROSS JOIN (SELECT targets_json AS rules_json FROM promotions WHERE id=? AND is_active=0) cfg",
    );
    try {
      const results = await database.batch([
        database
          .prepare(
            `DELETE FROM promotion_variants WHERE promotion_id=?
          AND EXISTS(SELECT 1 FROM promotions WHERE id=? AND is_active=0)`,
          )
          .bind(id, id),
        database.prepare(dynamicSql).bind(id, id),
        database
          .prepare(
            "UPDATE promotions SET is_active=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND is_active=0",
          )
          .bind(id),
      ]);
      if ((results[2]?.meta?.changes ?? 0) !== 1) {
        const row = await database
          .prepare("SELECT id FROM promotions WHERE id=?")
          .bind(id)
          .first();
        if (!row) throw new PromotionError(404, "Promotion not found.");
      }
    } catch (e) {
      const row = await database
        .prepare(
          "SELECT targets_json AS targetsJson FROM promotions WHERE id=?",
        )
        .bind(id)
        .first<{ targetsJson: string }>();
      if (!row) throw new PromotionError(404, "Promotion not found.");
      await explainConflict(id, row.targetsJson);
    }
    return;
  }
  const result = await database
    .prepare(
      "UPDATE promotions SET is_active=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND is_active=1",
    )
    .bind(id)
    .run();
  if (!result.meta.changes) {
    const row = await database
      .prepare("SELECT id FROM promotions WHERE id=?")
      .bind(id)
      .first();
    if (!row) throw new PromotionError(404, "Promotion not found.");
  }
}
export async function deletePromotion(id: string) {
  assertId(id, "Promotion ID");
  const result = await DB()
    .prepare("DELETE FROM promotions WHERE id=?")
    .bind(id)
    .run();
  if (!result.meta.changes)
    throw new PromotionError(404, "Promotion not found.");
}
export async function catalog(
  page = 1,
  pageSize = 20,
  q = "",
  categoryId = "",
  includeCategories = false,
): Promise<CatalogPage> {
  page = Math.max(1, Math.min(10000, Math.floor(page) || 1));
  pageSize = Math.max(1, Math.min(40, Math.floor(pageSize) || 20));
  q = q.trim().slice(0, 70);
  if (categoryId) assertId(categoryId, "Category ID");
  const database = DB();
  const statement = database
    .prepare(
      `WITH matched AS (
    SELECT p.id,p.name,p.category_id AS categoryId,c.name AS categoryName,p.has_variants AS hasVariants,
      count(*) OVER() AS total
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.status=1 AND p.deleted_at IS NULL
      AND (?='' OR p.category_id=?) AND (?='' OR p.name LIKE ? ESCAPE '!')
      AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.status=1 AND v.deleted_at IS NULL)
    ORDER BY p.name COLLATE NOCASE,p.id LIMIT ? OFFSET ?
  ) SELECT m.*,
    (SELECT json_group_array(json_object('id',v.id,'name',v.name,'sku',v.sku,'stock',v.stock))
     FROM product_variants v WHERE v.product_id=m.id AND v.status=1 AND v.deleted_at IS NULL) AS variantsJson
    FROM matched m ORDER BY m.name COLLATE NOCASE,m.id`,
    )
    .bind(
      categoryId,
      categoryId,
      q,
      q ? `%${q.replace(/[!%_]/g, "!$&")}%` : "",
      pageSize,
      (page - 1) * pageSize,
    );
  const categoriesStatement = database.prepare(
    "SELECT id,name FROM categories ORDER BY name COLLATE NOCASE ASC",
  );
  const result = includeCategories
    ? await database.batch([statement, categoriesStatement])
    : [await statement.all(), { results: [] }];
  type CatalogRow = {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    hasVariants: number;
    total: number;
    variantsJson: string;
  };
  const rows = (result[0].results ?? []) as CatalogRow[];
  return {
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      hasVariants: !!r.hasVariants,
      variants: JSON.parse(
        r.variantsJson,
      ) as CatalogPage["data"][number]["variants"],
    })),
    total: Number(rows[0]?.total ?? 0),
    page,
    pageSize,
    categories: (result[1].results ?? []) as Array<{
      id: string;
      name: string;
    }>,
  };
}
