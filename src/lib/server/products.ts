import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  sql,
} from "drizzle-orm";
import { getDb } from "../../db/index";
import {
  attributes,
  categories,
  inventoryMovements,
  productImages,
  productImageCleanupJobs,
  productVariants,
  products,
  variantAttributes,
} from "../../db/product-schema";
import type {
  AttributeDefinition,
  Product,
  ProductAttributeValue,
  ProductDraft,
  ProductImage,
  ProductListItem,
  ProductVariant,
} from "../../components/admin/products/product-types";
import { successResponse, errorResponse, serverError } from "./api-response";
import {
  ProductInputError,
  parseProductDraft,
  validateAttributeDefinitions,
} from "./product-validation";
import {
  ImageInputError,
  ImageConfigurationError,
  processImageCleanupJobs,
  queueOrphanImageCleanup,
  requireImagePurgeConfig,
  imageEnvironment,
  imageUrl,
  uploadImages,
  validateImageFiles,
  type ImageCleanupJob,
} from "./product-images";

const now = sql`CURRENT_TIMESTAMP`;

type SqlQuery = { sql: string; params: unknown[] };
type ToSQL = { toSQL: () => SqlQuery };

/** All statements are compiled by Drizzle; D1 executes the batch atomically. */
async function atomic(queries: ToSQL[]) {
  if (!queries.length) return;
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;
  const statements = queries.map((query) => {
    const compiled = query.toSQL();
    // Drizzle's D1 adapter converts booleans to SQLite integers in toSQL().
    return db
      .prepare(compiled.sql)
      .bind(...(compiled.params as D1PreparedStatement[]));
  });
  await db.batch(statements);
}

const uniqueError = (error: unknown) =>
  /UNIQUE constraint failed|_unique/i.test(
    String(error instanceof Error ? error.message : error),
  );
const relationError = (error: unknown) =>
  /FOREIGN KEY constraint failed/i.test(
    String(error instanceof Error ? error.message : error),
  );
const isInputError = (error: unknown) =>
  error instanceof ProductInputError || error instanceof ImageInputError;
function handleMutationError(operation: string, error: unknown) {
  if (error instanceof ImageConfigurationError) return errorResponse(error.message, 500);
  if (isInputError(error)) return errorResponse((error as Error).message);
  if (uniqueError(error))
    return errorResponse(
      "A product name, variant name, SKU, or slug is already in use.",
    );
  if (relationError(error))
    return errorResponse(
      "The product references an unavailable category, attribute, or related record.",
    );
  if (/CHECK constraint failed/i.test(String(error)))
    return errorResponse("A product value violates a database constraint.");
  return serverError(`products ${operation}`, error);
}

const keyMap = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "item";
const slugFor = (product: string, variant: string) =>
  `${keyMap(product)}-${keyMap(variant)}-${crypto.randomUUID().slice(0, 8)}`;

function decodeAttribute(
  attributeId: string,
  displayType: string,
  value: string,
): ProductAttributeValue {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      "kind" in parsed &&
      "attributeId" in parsed
    ) {
      const record = parsed as ProductAttributeValue;
      if (
        record.attributeId === attributeId &&
        (record.kind === "dropdown" ||
          record.kind === "button" ||
          record.kind === "color")
      ) {
        // Preserve the stored kind even if an admin later changes the global
        // attribute definition. The editor can then show the mismatch instead
        // of silently turning structured JSON into a plain string.
        return record;
      }
    }
  } catch {
    /* Older plain-text assignments are read below. */
  }
  if (displayType === "dropdown")
    return {
      attributeId,
      kind: "dropdown",
      options: [{ label: value, quantity: 0 }],
    };
  if (displayType === "color")
    return { attributeId, kind: "color", values: [value] };
  return { attributeId, kind: "button", values: [value] };
}

function queryPagination(params: URLSearchParams) {
  const rawPage = params.get("page") ?? "1";
  const rawLimit = params.get("limit") ?? "10";
  if (!/^[1-9]\d*$/.test(rawPage) || !/^[1-9]\d*$/.test(rawLimit)) {
    throw new ProductInputError("Page and limit must be positive integers.");
  }
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    limit > 100
  ) {
    throw new ProductInputError(
      "Page must be positive and limit must be between 1 and 100.",
    );
  }
  const rawSearch = params.get("search") ?? "";
  if (rawSearch.length > 80)
    throw new ProductInputError("Search text cannot exceed 80 characters.");
  const search = rawSearch.trim().toLowerCase().replace(/[%_]/g, "");
  const categoryId = params.get("categoryId")?.trim() || undefined;
  if (categoryId && categoryId.length > 160)
    throw new ProductInputError("Invalid category filter.");
  const rawStatus = params.get("status");
  if (rawStatus && !["active", "inactive"].includes(rawStatus))
    throw new ProductInputError("Invalid status filter.");
  return { page, limit, search, categoryId, status: rawStatus };
}

/** Admin list includes inactive products; public list includes active products/variants only. */
export async function getProducts(params: URLSearchParams, admin = false) {
  try {
    const { page, limit, search, categoryId, status } = queryPagination(params);
    const db = getDb();
    const filter = and(
      isNull(products.deletedAt),
      admin ? undefined : eq(products.status, true),
      admin
        ? undefined
        : sql`EXISTS (
        SELECT 1 FROM ${productVariants}
        WHERE ${productVariants.productId} = ${products.id}
          AND ${productVariants.status} = 1
          AND ${productVariants.deletedAt} IS NULL
      )`,
      categoryId ? eq(products.categoryId, categoryId) : undefined,
      admin && status ? eq(products.status, status === "active") : undefined,
      search ? like(sql`lower(${products.name})`, `${search}%`) : undefined,
    );
    const totalRows = await db
      .select({ total: count() })
      .from(products)
      .where(filter);
    const total = Number(totalRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);
    const resolvedPage = totalPages ? Math.min(page, totalPages) : 1;
    // Use correlated aggregates instead of fetching every variant and image
    // into the Worker for each listing. Two D1 read queries per page:
    // one count + one paginated, summary-only listing.
    const visibleVariantClause = admin ? sql`` : sql`AND v.status = 1`;
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        status: products.status,
        hasVariants: products.hasVariants,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        variantCount: sql<number>`(
        SELECT COUNT(*) FROM ${productVariants} v
        WHERE v.product_id = ${products.id} AND v.deleted_at IS NULL ${visibleVariantClause}
      )`,
        totalStock: sql<number>`(
        SELECT COALESCE(SUM(v.stock), 0) FROM ${productVariants} v
        WHERE v.product_id = ${products.id} AND v.deleted_at IS NULL ${visibleVariantClause}
      )`,
        startingPrice: sql<number>`(
        SELECT COALESCE(MIN(
          CASE WHEN v.has_discount = 1
            THEN CAST((v.sale_price * (100 - v.discount_percentage) + 50) / 100 AS INTEGER)
            ELSE v.sale_price END
        ), 0) FROM ${productVariants} v
        WHERE v.product_id = ${products.id} AND v.deleted_at IS NULL ${visibleVariantClause}
      )`,
        coverKey: sql<string | null>`(
        SELECT i.storage_key FROM ${productImages} i
        INNER JOIN ${productVariants} v ON v.id = i.variant_id
        WHERE v.product_id = ${products.id}
          AND v.deleted_at IS NULL ${visibleVariantClause}
        ORDER BY v.is_default DESC, i.is_primary DESC, i.sort_order ASC
        LIMIT 1
      )`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(filter)
      .orderBy(desc(products.createdAt), asc(products.name))
      .limit(limit)
      .offset((resolvedPage - 1) * limit);
    const { baseUrl } = await imageEnvironment();
    const data: ProductListItem[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      status: row.status,
      hasVariants: row.hasVariants,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      variantCount: Number(row.variantCount),
      totalStock: Number(row.totalStock),
      startingPrice: Number(row.startingPrice),
      primaryImageUrl: row.coverKey ? imageUrl(baseUrl, row.coverKey) : null,
    }));
    return successResponse("Products retrieved successfully.", data, {
      pagination: {
        page: resolvedPage,
        limit,
        total,
        totalPages,
        hasNextPage: resolvedPage < totalPages,
        hasPreviousPage: resolvedPage > 1,
      },
    });
  } catch (error) {
    if (isInputError(error)) return errorResponse((error as Error).message);
    return serverError("products list", error);
  }
}

export async function findProduct(
  productId: string,
  admin = false,
): Promise<Product | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      status: products.status,
      hasVariants: products.hasVariants,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.id, productId),
        isNull(products.deletedAt),
        admin ? undefined : eq(products.status, true),
      ),
    )
    .limit(1);
  if (!rows[0]) return null;
  const rowsV = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        isNull(productVariants.deletedAt),
        admin ? undefined : eq(productVariants.status, true),
      ),
    )
    .orderBy(desc(productVariants.isDefault), asc(productVariants.createdAt));
  const ids = rowsV.map((row) => row.id);
  const images = ids.length
    ? await db
        .select()
        .from(productImages)
        .where(inArray(productImages.variantId, ids))
        .orderBy(asc(productImages.sortOrder))
    : [];
  const assignments = ids.length
    ? await db
        .select({
          variantId: variantAttributes.variantId,
          attributeId: variantAttributes.attributeId,
          value: variantAttributes.value,
          displayType: attributes.displayType,
        })
        .from(variantAttributes)
        .innerJoin(attributes, eq(attributes.id, variantAttributes.attributeId))
        .where(inArray(variantAttributes.variantId, ids))
    : [];
  const { baseUrl } = await imageEnvironment();
  const variants: ProductVariant[] = rowsV.map((variant) => ({
    id: variant.id,
    productId: variant.productId,
    name: variant.name,
    slug: variant.slug,
    description: variant.description,
    shortDescription: variant.shortDescription,
    sku: variant.sku,
    salePrice: variant.salePrice,
    purchasePrice: variant.purchasePrice,
    hasDiscount: variant.hasDiscount,
    discountPercentage: variant.discountPercentage,
    tag: variant.tag,
    isDefault: variant.isDefault,
    status: variant.status,
    stock: variant.stock,
    images: images
      .filter((image) => image.variantId === variant.id)
      .map(
        (image): ProductImage => ({
          id: image.id,
          storageKey: image.storageKey,
          url: imageUrl(baseUrl, image.storageKey),
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        }),
      ),
    attributes: assignments
      .filter((attr) => attr.variantId === variant.id)
      .map((attr) =>
        decodeAttribute(attr.attributeId, attr.displayType, attr.value),
      ),
  }));
  if (!admin && variants.length === 0) return null;
  return { ...rows[0], variants };
}

export async function getProduct(productId: string, admin = false) {
  try {
    if (!productId || productId.length > 160)
      return errorResponse("Valid product ID required.");
    const product = await findProduct(productId, admin);
    if (!product) return errorResponse("Product not found.");
    const data = admin
      ? product
      : {
          ...product,
          variants: product.variants.map(
            ({ purchasePrice: _purchasePrice, ...variant }) => variant,
          ),
        };
    return successResponse("Product retrieved successfully.", data);
  } catch (error) {
    return serverError("products detail", error);
  }
}

async function parseSubmission(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ProductInputError("Expected multipart/form-data.");
  }
  const json = form.get("payload");
  if (typeof json !== "string" || json.length > 256 * 1024) {
    throw new ProductInputError("Missing or oversized product JSON payload.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ProductInputError("Invalid product JSON.");
  }
  const draft = parseProductDraft(raw);
  const ids = draft.variants.flatMap((variant) =>
    variant.images.flatMap((image) => (image.uploadId ? [image.uploadId] : [])),
  );
  const files = await validateImageFiles(form, ids);
  const fileById = new Map(files.map(({ uploadId, file }) => [uploadId, file]));
  return { draft, fileById };
}

async function validateRelations(draft: ProductDraft) {
  const db = getDb();
  const category = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, draft.categoryId))
    .limit(1);
  if (!category.length)
    throw new ProductInputError("Select an existing category.");
  const ids = [
    ...new Set(
      draft.variants.flatMap((variant) =>
        variant.attributes.map((attr) => attr.attributeId),
      ),
    ),
  ];
  const defs: AttributeDefinition[] = ids.length
    ? ((await db
        .select({
          id: attributes.id,
          name: attributes.name,
          valueType: attributes.valueType,
          unit: attributes.unit,
          displayType: attributes.displayType,
        })
        .from(attributes)
        .where(inArray(attributes.id, ids))) as AttributeDefinition[])
    : [];
  if (defs.length !== ids.length)
    throw new ProductInputError(
      "An attribute used in the form no longer exists.",
    );
  validateAttributeDefinitions(draft, defs);
}

function storedAttributeValue(value: ProductAttributeValue) {
  return JSON.stringify(value);
}

type PlannedVariant = {
  id: string;
  draft: ProductDraft["variants"][number];
  previous?: ProductVariant;
};

function variantInsert(
  db: ReturnType<typeof getDb>,
  productId: string,
  planned: PlannedVariant,
  productName: string,
) {
  const { draft, id } = planned;
  return db.insert(productVariants).values({
    id,
    productId,
    name: draft.name,
    slug: slugFor(productName, draft.name),
    description: draft.description,
    shortDescription: draft.shortDescription,
    sku: draft.sku,
    salePrice: draft.salePrice,
    purchasePrice: draft.purchasePrice,
    hasDiscount: draft.hasDiscount,
    discountPercentage: draft.discountPercentage,
    tag: draft.tag,
    isDefault: draft.isDefault,
    status: draft.status,
    stock: draft.stock,
  });
}
function variantUpdate(db: ReturnType<typeof getDb>, planned: PlannedVariant) {
  const { draft, id } = planned;
  return db
    .update(productVariants)
    .set({
      name: draft.name,
      description: draft.description,
      shortDescription: draft.shortDescription,
      sku: draft.sku,
      salePrice: draft.salePrice,
      purchasePrice: draft.purchasePrice,
      hasDiscount: draft.hasDiscount,
      discountPercentage: draft.discountPercentage,
      tag: draft.tag,
      isDefault: draft.isDefault,
      status: draft.status,
      // Stock belongs exclusively to the Inventory module after creation.
      updatedAt: now,
    })
    .where(and(eq(productVariants.id, id), isNull(productVariants.deletedAt)));
}
/** Record initial inventory in the same D1 transaction that inserts a variant. */
function initialInventoryQuery(
  db: ReturnType<typeof getDb>,
  variantId: string,
  openingStock: number,
) {
  return db.insert(inventoryMovements).values({
    id: `mov_${crypto.randomUUID()}`,
    variantId,
    movementType: "adjustment",
    previousQty: 0,
    newQty: openingStock,
    qtyDiff: openingStock,
    note: "Initial stock recorded at variant creation (Products module)",
  });
}

function makeCleanupJobs(keys: string[]): ImageCleanupJob[] {
  return [...new Set(keys)].map((storageKey) => ({
    id: `imgclean_${crypto.randomUUID()}`,
    storageKey,
  }));
}

/** Include cleanup tasks in the SAME D1 batch as image-row removals. */
function insertCleanupJobs(
  db: ReturnType<typeof getDb>,
  jobs: ImageCleanupJob[],
): ToSQL[] {
  const queries: ToSQL[] = [];
  for (let start = 0; start < jobs.length; start += 25) {
    queries.push(db.insert(productImageCleanupJobs)
      .values(jobs.slice(start, start + 25))
      .onConflictDoNothing({ target: productImageCleanupJobs.storageKey }));
  }
  return queries;
}

async function completeImageCleanup(
  jobs: ImageCleanupJob[],
  config: Awaited<ReturnType<typeof imageEnvironment>>,
): Promise<string[]> {
  if (!jobs.length) return [];
  try {
    const result = await processImageCleanupJobs(jobs, config);
    return result.warnings;
  } catch (error) {
    console.error("Cleanup after product commit failed; tasks remain in D1", error);
    return ["Image cleanup is pending. Product changes were saved; use Retry image cleanup from Products."];
  }
}

function replacementRows(
  db: ReturnType<typeof getDb>,
  planned: PlannedVariant[],
  uploads: Map<string, string>,
  existingImageIds: Map<string, ProductImage>,
  sections: { images?: boolean; attributes?: boolean } = {
    images: true,
    attributes: true,
  },
): ToSQL[] {
  const queries: ToSQL[] = [];
  for (const item of planned) {
    if (sections.images && item.draft.images.length) {
      const rows = item.draft.images.map((image, index) => {
        const key = image.id
          ? existingImageIds.get(image.id)?.storageKey
          : uploads.get(image.uploadId!);
        if (!key)
          throw new ProductInputError(
            "A saved image is missing or its upload failed.",
          );
        return {
          id: image.id ?? `img_${crypto.randomUUID()}`,
          variantId: item.id,
          storageKey: key,
          sortOrder: index + 1,
          isPrimary: image.isPrimary,
        };
      });
      // A multirow insert saves up to five image records in one D1 statement.
      queries.push(db.insert(productImages).values(rows));
    }
    if (sections.attributes && item.draft.attributes.length) {
      const rows = item.draft.attributes.map((assignment) => ({
        id: `vattr_${crypto.randomUUID()}`,
        variantId: item.id,
        attributeId: assignment.attributeId,
        value: storedAttributeValue(assignment),
      }));
      // Batch in small groups to avoid SQLite parameter limits.
      for (let offset = 0; offset < rows.length; offset += 25) {
        queries.push(
          db.insert(variantAttributes).values(rows.slice(offset, offset + 25)),
        );
      }
    }
  }
  return queries;
}

function imageListChanged(
  previous: ProductImage[],
  draft: ProductDraft["variants"][number]["images"],
): boolean {
  if (previous.length !== draft.length) return true;
  return draft.some(
    (image, index) =>
      previous[index]?.id !== image.id ||
      previous[index].isPrimary !== image.isPrimary,
  );
}

function attributeListChanged(
  previous: ProductAttributeValue[],
  current: ProductAttributeValue[],
): boolean {
  // Only compare logically assigned values; sort by attribute ID to avoid
  // deleting/recreating rows merely because the admin reordered form cards.
  const normalize = (items: ProductAttributeValue[]) =>
    JSON.stringify(
      [...items].sort((a, b) => a.attributeId.localeCompare(b.attributeId)),
    );
  return normalize(previous) !== normalize(current);
}

function variantDetailsChanged(
  previous: ProductVariant,
  current: ProductDraft["variants"][number],
): boolean {
  return (
    previous.name !== current.name ||
    previous.description !== current.description ||
    previous.shortDescription !== current.shortDescription ||
    previous.sku !== current.sku ||
    previous.salePrice !== current.salePrice ||
    previous.purchasePrice !== current.purchasePrice ||
    previous.hasDiscount !== current.hasDiscount ||
    previous.discountPercentage !== current.discountPercentage ||
    previous.tag !== current.tag ||
    previous.isDefault !== current.isDefault ||
    previous.status !== current.status
  );
}

/** POST /api/admin/products : no image upload until submit confirmation. */
export async function createProduct(request: Request) {
  let createdUploads = new Map<string, string>();
  let config: Awaited<ReturnType<typeof imageEnvironment>> | null = null;
  try {
    const { draft, fileById } = await parseSubmission(request);
    if (draft.variants.some((v) => v.id || v.images.some((i) => i.id))) {
      throw new ProductInputError(
        "New products cannot contain existing variant/image IDs.",
      );
    }
    await validateRelations(draft);
    config = await imageEnvironment();
    const productId = `prod_${crypto.randomUUID()}`;
    const planned = draft.variants.map((variant) => ({
      id: `var_${crypto.randomUUID()}`,
      draft: variant,
    }));
    const assignments = planned.flatMap((item) =>
      item.draft.images.flatMap((image) =>
        image.uploadId
          ? [
              {
                variantId: item.id,
                uploadId: image.uploadId,
                file: fileById.get(image.uploadId)!,
              },
            ]
          : [],
      ),
    );
    createdUploads = await uploadImages(config.bucket, productId, assignments);
    const db = getDb();
    const queries: ToSQL[] = [
      db.insert(products).values({
        id: productId,
        name: draft.name,
        categoryId: draft.categoryId,
        status: draft.status,
        hasVariants: draft.hasVariants,
      }),
      db
        .update(categories)
        .set({
          productCount: sql`${categories.productCount} + 1`,
          updatedAt: now,
        })
        .where(eq(categories.id, draft.categoryId)),
    ];
    for (const item of planned) {
      queries.push(variantInsert(db, productId, item, draft.name));
      queries.push(initialInventoryQuery(db, item.id, item.draft.stock));
    }
    queries.push(...replacementRows(db, planned, createdUploads, new Map()));
    await atomic(queries);
    createdUploads = new Map(); // D1 now owns these R2 objects.
    // The editor immediately refreshes the table; avoid an unnecessary
    // four-query detail reload after a successful save.
    return successResponse("Product created successfully.", { id: productId });
  } catch (error) {
    if (config && createdUploads.size) {
      try {
        await config.bucket.delete([...createdUploads.values()]);
      } catch (cleanupError) {
        console.error(
          "R2 compensation after database failure did not complete",
          cleanupError,
        );
        try { await queueOrphanImageCleanup([...createdUploads.values()]); }
        catch (queueError) { console.error("Could not persist orphan-upload cleanup tasks", queueError); }
      }
    }
    return handleMutationError("create", error);
  }
}

/** PATCH /api/admin/products/[id]: staged changes, one atomic D1 batch. */
export async function updateProduct(productId: string, request: Request) {
  let createdUploads = new Map<string, string>();
  let config: Awaited<ReturnType<typeof imageEnvironment>> | null = null;
  try {
    const current = await findProduct(productId, true);
    if (!current) return errorResponse("Product not found.");

    const { draft, fileById } = await parseSubmission(request);
    // Prevent a stale editor from silently overwriting a recent save.
    if (
      !draft.expectedUpdatedAt ||
      draft.expectedUpdatedAt !== current.updatedAt
    ) {
      return errorResponse(
        "This product changed since the editor was opened. Close and reopen it before saving.",
      );
    }
    await validateRelations(draft);

    // Never accept stock edits through PATCH, even from forged API requests.
    // New variants added to an existing product begin at zero; their initial
    // movement is recorded and future adjustments belong to Inventory.
    const activeStockByVariant = new Map(current.variants.map((v) => [v.id, v.stock]));
    for (const [index, incoming] of draft.variants.entries()) {
      if (!incoming.id) {
        if (incoming.stock !== 0) {
          throw new ProductInputError(
            `New variant ${index + 1} must start with stock 0 during product updates. ` +
            "Save the variant, then add stock through Inventory.",
          );
        }
      } else if (activeStockByVariant.has(incoming.id) &&
                 incoming.stock !== activeStockByVariant.get(incoming.id)) {
        throw new ProductInputError(
          `Stock for ${incoming.name} cannot be changed in Products. ` +
          "Open Inventory to make a stock adjustment. " +
          "If Inventory changed while this editor was open, reopen the product to refresh its stock.",
        );
      }
    }

    const previousById = new Map(
      current.variants.map((item) => [item.id, item]),
    );
    const existingImageIds = new Map(
      current.variants.flatMap((item) =>
        item.images.map((image) => [image.id, image] as const),
      ),
    );
    for (const variant of draft.variants) {
      if (variant.id && !previousById.has(variant.id)) {
        throw new ProductInputError(
          "A variant does not belong to this product.",
        );
      }
      for (const image of variant.images) {
        if (
          image.id &&
          (!variant.id ||
            !previousById
              .get(variant.id)
              ?.images.some((saved) => saved.id === image.id))
        ) {
          throw new ProductInputError(
            "A saved image does not belong to its variant.",
          );
        }
      }
    }

    const planned: PlannedVariant[] = draft.variants.map((variant) => ({
      id: variant.id ?? `var_${crypto.randomUUID()}`,
      draft: variant,
      previous: variant.id ? previousById.get(variant.id) : undefined,
    }));
    const retainedIds = new Set(planned.map((item) => item.id));
    const archived = current.variants.filter(
      (variant) => !retainedIds.has(variant.id),
    );
    const retainedImageIds = new Set(
      draft.variants.flatMap((variant) =>
        variant.images.flatMap((image) => (image.id ? [image.id] : [])),
      ),
    );
    const removedKeys = current.variants.flatMap((variant) =>
      variant.images
        .filter((image) => !retainedImageIds.has(image.id))
        .map((image) => image.storageKey),
    );
    const cleanupJobs = makeCleanupJobs(removedKeys);
    const uploads = planned.flatMap((item) =>
      item.draft.images.flatMap((image) =>
        image.uploadId
          ? [
              {
                variantId: item.id,
                uploadId: image.uploadId,
                file: fileById.get(image.uploadId)!,
              },
            ]
          : [],
      ),
    );

    const parentChanged =
      draft.name !== current.name ||
      draft.categoryId !== current.categoryId ||
      draft.status !== current.status ||
      draft.hasVariants !== current.hasVariants;
    const childChanged =
      archived.length > 0 ||
      planned.some(
        (item) =>
          !item.previous ||
          variantDetailsChanged(item.previous, item.draft) ||
          imageListChanged(item.previous.images, item.draft.images) ||
          attributeListChanged(item.previous.attributes, item.draft.attributes),
      );
    if (!parentChanged && !childChanged) {
      return successResponse("No product changes to save.", current);
    }

    config = await imageEnvironment();
    // Refuse removal before committing if the installation cannot invalidate
    // the year-long CDN cache. Otherwise deleted image URLs could stay live.
    if (cleanupJobs.length) requireImagePurgeConfig(config);
    createdUploads = await uploadImages(config.bucket, productId, uploads);

    const stamp = new Date().toISOString();
    const db = getDb();
    const queries: ToSQL[] = [
      db
        .update(products)
        .set({
          name: draft.name,
          categoryId: draft.categoryId,
          status: draft.status,
          hasVariants: draft.hasVariants,
          updatedAt: stamp,
        })
        .where(and(eq(products.id, productId), isNull(products.deletedAt))),
    ];
    if (draft.categoryId !== current.categoryId) {
      queries.push(
        db
          .update(categories)
          .set({
            productCount: sql`${categories.productCount} - 1`,
            updatedAt: now,
          })
          .where(eq(categories.id, current.categoryId)),
        db
          .update(categories)
          .set({
            productCount: sql`${categories.productCount} + 1`,
            updatedAt: now,
          })
          .where(eq(categories.id, draft.categoryId)),
      );
    }

    // The old variant row stays present for inventory_movement history.
    for (const old of archived) {
      queries.push(
        db
          .update(productVariants)
          .set({
            status: false,
            isDefault: false,
            deletedAt: stamp,
            updatedAt: stamp,
          })
          .where(
            and(
              eq(productVariants.id, old.id),
              isNull(productVariants.deletedAt),
            ),
          ),
      );
      queries.push(
        db.delete(productImages).where(eq(productImages.variantId, old.id)),
      );
      queries.push(
        db
          .delete(variantAttributes)
          .where(eq(variantAttributes.variantId, old.id)),
      );
    }

    // Release the old default before assigning the new one. All mutations
    // are in a single D1 batch, so no intermediate state is visible.
    const oldDefaultId = current.variants.find((v) => v.isDefault)?.id;
    const nextDefaultId = planned.find((v) => v.draft.isDefault)!.id;
    const defaultChanged = oldDefaultId !== nextDefaultId;
    if (defaultChanged) {
      queries.push(
        db
          .update(productVariants)
          .set({ isDefault: false })
          .where(
            and(
              eq(productVariants.productId, productId),
              isNull(productVariants.deletedAt),
            ),
          ),
      );
    }

    // Stage only changed names/SKUs to allow swaps between variants while
    // preserving the unique indexes. An unchanged variant is never rewritten.
    for (const item of planned) {
      if (!item.previous) continue;
      if (
        item.previous.name !== item.draft.name ||
        item.previous.sku !== item.draft.sku
      ) {
        const temp = crypto.randomUUID().replace(/-/g, "");
        queries.push(
          db
            .update(productVariants)
            .set({ name: `__tmp_${temp}`, sku: `__tmp_${temp}` })
            .where(eq(productVariants.id, item.id)),
        );
      }
    }

    for (const item of planned) {
      if (!item.previous) {
        // During default reassignment insert non-default first, then finalize.
        if (defaultChanged && item.draft.isDefault) {
          queries.push(
            db.insert(productVariants).values({
              id: item.id,
              productId,
              name: item.draft.name,
              slug: slugFor(draft.name, item.draft.name),
              description: item.draft.description,
              shortDescription: item.draft.shortDescription,
              sku: item.draft.sku,
              salePrice: item.draft.salePrice,
              purchasePrice: item.draft.purchasePrice,
              hasDiscount: item.draft.hasDiscount,
              discountPercentage: item.draft.discountPercentage,
              tag: item.draft.tag,
              isDefault: false,
              status: item.draft.status,
              stock: item.draft.stock,
            }),
          );
        } else {
          queries.push(variantInsert(db, productId, item, draft.name));
        }
        queries.push(initialInventoryQuery(db, item.id, 0));
        queries.push(
          ...replacementRows(db, [item], createdUploads, existingImageIds),
        );
        continue;
      }
      if (variantDetailsChanged(item.previous, item.draft)) {
        const row = defaultChanged
          ? { ...item, draft: { ...item.draft, isDefault: false } }
          : item;
        queries.push(variantUpdate(db, row));
      }
      if (imageListChanged(item.previous.images, item.draft.images)) {
        queries.push(
          db.delete(productImages).where(eq(productImages.variantId, item.id)),
        );
        queries.push(
          ...replacementRows(db, [item], createdUploads, existingImageIds, {
            images: true,
            attributes: false,
          }),
        );
      }
      if (
        attributeListChanged(item.previous.attributes, item.draft.attributes)
      ) {
        queries.push(
          db
            .delete(variantAttributes)
            .where(eq(variantAttributes.variantId, item.id)),
        );
        queries.push(
          ...replacementRows(db, [item], createdUploads, existingImageIds, {
            images: false,
            attributes: true,
          }),
        );
      }
    }
    if (defaultChanged) {
      queries.push(
        db
          .update(productVariants)
          .set({ isDefault: true })
          .where(eq(productVariants.id, nextDefaultId)),
      );
    }

    // Queue cleanup atomically with D1 image changes. If Cloudflare is
    // unavailable afterwards, the queue survives until a manual retry.
    queries.push(...insertCleanupJobs(db, cleanupJobs));
    await atomic(queries);
    createdUploads = new Map(); // The committed D1 rows now own these keys.
    const warnings = await completeImageCleanup(cleanupJobs, config);
    return successResponse(
      "Product updated successfully.",
      { id: productId },
      warnings.length ? { warnings } : undefined,
    );
  } catch (error) {
    if (config && createdUploads.size) {
      try {
        await config.bucket.delete([...createdUploads.values()]);
      } catch (cleanupError) {
        console.error(
          "R2 compensation after database failure did not complete",
          cleanupError,
        );
        try { await queueOrphanImageCleanup([...createdUploads.values()]); }
        catch (queueError) { console.error("Could not persist orphan-upload cleanup tasks", queueError); }
      }
    }
    return handleMutationError("update", error);
  }
}

/** Soft delete product, archive variants, remove image records, R2 objects and purge URLs. */
export async function deleteProduct(productId: string) {
  try {
    const current = await findProduct(productId, true);
    if (!current) return errorResponse("Product not found.");
    const db = getDb();
    const variantIds = current.variants.map((v) => v.id);
    const queries: ToSQL[] = [
      db
        .update(products)
        .set({ status: false, deletedAt: now, updatedAt: now })
        .where(and(eq(products.id, productId), isNull(products.deletedAt))),
      db
        .update(categories)
        .set({
          productCount: sql`${categories.productCount} - 1`,
          updatedAt: now,
        })
        .where(eq(categories.id, current.categoryId)),
    ];
    if (variantIds.length) {
      queries.push(
        db
          .update(productVariants)
          .set({
            status: false,
            isDefault: false,
            deletedAt: now,
            updatedAt: now,
          })
          .where(inArray(productVariants.id, variantIds)),
        db
          .delete(productImages)
          .where(inArray(productImages.variantId, variantIds)),
        db
          .delete(variantAttributes)
          .where(inArray(variantAttributes.variantId, variantIds)),
      );
    }
    const config = await imageEnvironment();
    const keys = current.variants.flatMap((v) =>
      v.images.map((i) => i.storageKey),
    );
    const cleanupJobs = makeCleanupJobs(keys);
    if (cleanupJobs.length) requireImagePurgeConfig(config);
    queries.push(...insertCleanupJobs(db, cleanupJobs));
    await atomic(queries);
    const warnings = await completeImageCleanup(cleanupJobs, config);
    return successResponse(
      "Product deleted successfully. This cannot be restored.",
      { id: productId },
      warnings.length ? { warnings } : undefined,
    );
  } catch (error) {
    return handleMutationError("delete", error);
  }
}
