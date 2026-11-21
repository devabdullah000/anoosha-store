import "server-only";
import {
  promotionPriceJoins,
  effectiveHasDiscount,
  effectiveDiscount,
} from "@/lib/promotions/sql";

import { getCurrentUser } from "@/lib/auth/require-auth";
import { storefrontEnv } from "@/lib/storefront/runtime";
import { cartImageUrls } from "./images";
import type {
  CartAttribute,
  CartItem,
  CartPayload,
  CartSelection,
} from "./types";
import { validateCartSelection } from "./validation";

export type CartIdentity = { id: string; email: string };
export class CartError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CartError";
  }
}

/** One authenticated identity check; admins never access the cart. */
export async function cartIdentity(): Promise<CartIdentity> {
  const user = await getCurrentUser();
  if (!user) throw new CartError(401, "Sign in to use your cart.");
  if (user.role !== "user") {
    throw new CartError(
      403,
      "The shopping cart is available to customer accounts only.",
    );
  }
  if (
    typeof user.id !== "string" ||
    !user.id.trim() ||
    typeof user.email !== "string" ||
    !user.email.trim()
  ) {
    throw new CartError(401, "A valid customer session is required.");
  }
  return { id: user.id, email: user.email.trim().toLowerCase() };
}

export const cartNoStore = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

export function cartResponse(error: unknown): Response {
  const status = error instanceof CartError ? error.status : 500;
  if (status === 500) console.error("Cart request failed", error);
  return Response.json(
    {
      success: false,
      message:
        error instanceof CartError
          ? error.message
          : "Unable to process your cart request.",
    },
    { status, headers: cartNoStore },
  );
}

/** Reject forged cross-origin mutations; GET has no side effects. */
export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new CartError(403, "Invalid request origin.");
  }
}

/** Bound request size even if Content-Length is absent or spoofed. */
export async function parseCartJson(request: Request): Promise<unknown> {
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    throw new CartError(415, "Expected JSON content.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > 16384) throw new CartError(413, "Cart request is too large.");
  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new CartError(400, "Unable to read the request body.");
  }
  if (new TextEncoder().encode(text).length > 16384) {
    throw new CartError(413, "Cart request is too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CartError(400, "Invalid JSON body.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateItemInput(
  raw: unknown,
  updating: boolean,
): {
  variantId?: string;
  quantity: number;
  attributes: CartSelection[];
} {
  if (
    !isRecord(raw) ||
    !Number.isSafeInteger(raw.quantity) ||
    (raw.quantity as number) < 1 ||
    (raw.quantity as number) > 99 ||
    !Array.isArray(raw.attributes)
  ) {
    throw new CartError(
      400,
      "Provide a valid quantity and dropdown selections.",
    );
  }
  if (
    !updating &&
    (typeof raw.variantId !== "string" ||
      raw.variantId.length < 1 ||
      raw.variantId.length > 128)
  ) {
    throw new CartError(400, "Invalid variant ID.");
  }
  return {
    ...(!updating ? { variantId: raw.variantId as string } : {}),
    quantity: raw.quantity as number,
    attributes: raw.attributes as CartSelection[],
  };
}

function assertItemId(itemId: string): void {
  if (!itemId || itemId.length > 128)
    throw new CartError(400, "Invalid cart item ID.");
}

function priceAfterDiscount(row: {
  salePrice: number;
  hasDiscount: number;
  discountPercentage: number;
}): number {
  return row.hasDiscount
    ? Math.round((row.salePrice * (100 - row.discountPercentage)) / 100)
    : row.salePrice;
}

function decodeSelections(raw: string): CartSelection[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is CartSelection =>
        isRecord(entry) &&
        typeof entry.attributeId === "string" &&
        Array.isArray(entry.values) &&
        entry.values.every((v) => typeof v === "string"),
    );
  } catch {
    return [];
  }
}

type DbRow = {
  itemId: string;
  variantId: string;
  quantity: number;
  selectionsJson: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  unitPriceSnapshot: number;
  imageKeySnapshot: string | null;
  updatedAt: string;
  productId: string | null;
  productName: string | null;
  categoryId: string | null;
  variantName: string | null;
  sku: string | null;
  salePrice: number | null;
  hasDiscount: number | null;
  discountPercentage: number | null;
  appliedPromotionName: string | null;
  appliedPromotionId: string | null;
  stock: number | null;
  imageKey: string | null;
  hasUncartedVariant: number;
  attributeId: string | null;
  attributeName: string | null;
  attributeValue: string | null;
  displayType: CartAttribute["displayType"] | null;
  valueType: CartAttribute["valueType"] | null;
  unit: string | null;
};

/** One joined D1 read for the entire authenticated cart, including live stock and price. */
const cartReadSql = `
  SELECT
    ci.id AS itemId, ci.variant_id AS variantId, ci.quantity,
    ci.selections_json AS selectionsJson,
    ci.product_name_snapshot AS productNameSnapshot,
    ci.variant_name_snapshot AS variantNameSnapshot,
    ci.unit_price_snapshot AS unitPriceSnapshot,
    ci.image_key_snapshot AS imageKeySnapshot,
    ci.updated_at AS updatedAt,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN p.id END AS productId,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN p.name END AS productName,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN p.category_id END AS categoryId,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN v.name END AS variantName,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN v.sku END AS sku,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN v.sale_price END AS salePrice,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN ${effectiveHasDiscount} END AS hasDiscount,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN ${effectiveDiscount} END AS discountPercentage,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN promo_active.name END AS appliedPromotionName,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN promo_active.id END AS appliedPromotionId,
    CASE WHEN p.status = 1 AND p.deleted_at IS NULL
                   AND v.status = 1 AND v.deleted_at IS NULL THEN v.stock END AS stock,
    (SELECT pi.storage_key FROM product_images pi
      WHERE pi.variant_id = v.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS imageKey,
    -- Is another active variant of this same product missing from this user's cart?
    -- EXISTS stops at the first match; no additional D1 request is needed.
    EXISTS (
      SELECT 1
      FROM product_variants other
      WHERE other.product_id = p.id
        AND other.id <> v.id
        AND other.status = 1
        AND other.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM cart_items owned
          WHERE owned.user_id = ci.user_id
            AND owned.user_email = ci.user_email
            AND owned.variant_id = other.id
        )
    ) AS hasUncartedVariant,
    a.id AS attributeId, a.name AS attributeName, va.value AS attributeValue,
    a.display_type AS displayType, a.value_type AS valueType, a.unit
  FROM cart_items ci
  LEFT JOIN product_variants v ON v.id = ci.variant_id
  ${promotionPriceJoins}
  LEFT JOIN products p ON p.id = v.product_id
  LEFT JOIN variant_attributes va ON va.variant_id = ci.variant_id
  LEFT JOIN attributes a ON a.id = va.attribute_id
  WHERE ci.user_id = ? AND ci.user_email = ?
  ORDER BY ci.created_at DESC, ci.id, a.id
`;

function collectAttributes<
  T extends {
    attributeId: string | null;
    attributeName: string | null;
    attributeValue: string | null;
    displayType: CartAttribute["displayType"] | null;
    valueType: CartAttribute["valueType"] | null;
    unit: string | null;
  },
>(rows: T[]): CartAttribute[] {
  const seen = new Set<string>();
  const result: CartAttribute[] = [];
  for (const row of rows) {
    if (
      !row.attributeId ||
      row.attributeName === null ||
      row.attributeValue === null ||
      !row.displayType ||
      !row.valueType ||
      seen.has(row.attributeId)
    )
      continue;
    seen.add(row.attributeId);
    result.push({
      id: row.attributeId,
      name: row.attributeName,
      value: row.attributeValue,
      displayType: row.displayType,
      valueType: row.valueType,
      unit: row.unit,
    });
  }
  return result;
}

export async function loadCart(user: CartIdentity): Promise<CartPayload> {
  const { DB, R2_PUBLIC_BASE_URL } = await storefrontEnv();
  const response = await DB.prepare(cartReadSql)
    .bind(user.id, user.email)
    .all<DbRow>();
  const grouped = new Map<string, DbRow[]>();
  for (const row of response.results) {
    const group = grouped.get(row.itemId);
    if (group) group.push(row);
    else grouped.set(row.itemId, [row]);
  }
  const items: CartItem[] = Array.from(grouped.values(), (rows) => {
    const row = rows[0];
    const attributes = collectAttributes(rows);
    const available =
      row.productId !== null && row.salePrice !== null && row.stock !== null;
    const stock = available ? row.stock! : 0;
    const selections = decodeSelections(row.selectionsJson);
    const result = available
      ? validateCartSelection(row.quantity, selections, attributes, stock)
      : {
          ok: false as const,
          message: "This product or variant is unavailable.",
        };
    const livePrice = available
      ? priceAfterDiscount({
          salePrice: row.salePrice!,
          hasDiscount: row.hasDiscount!,
          discountPercentage: row.discountPercentage!,
        })
      : row.unitPriceSnapshot;
    const imageKey = available
      ? (row.imageKey ?? row.imageKeySnapshot)
      : row.imageKeySnapshot;
    const { imageUrl, fallbackImageUrl } = cartImageUrls(
      imageKey,
      R2_PUBLIC_BASE_URL,
    );
    return {
      id: row.itemId,
      productId: row.productId,
      variantId: row.variantId,
      productName: row.productName ?? row.productNameSnapshot,
      variantName: row.variantName ?? row.variantNameSnapshot,
      sku: row.sku,
      categoryId: row.categoryId,
      imageUrl,
      fallbackImageUrl,
      quantity: row.quantity,
      stock,
      available,
      canAddAnotherVariant: available && row.hasUncartedVariant === 1,
      unitPricePaisa: livePrice,
      originalUnitPricePaisa: available ? row.salePrice! : row.unitPriceSnapshot,
      discountPercentage: available ? row.discountPercentage! : 0,
      appliedPromotionName: available ? row.appliedPromotionName : null,
      appliedPromotionId: available ? row.appliedPromotionId : null,
      previousUnitPricePaisa: row.unitPriceSnapshot,
      priceChanged: available && row.unitPriceSnapshot !== livePrice,
      selections,
      attributes,
      issues: result.ok ? [] : [result.message],
      updatedAt: row.updatedAt,
    };
  });

  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalPaisa: items
      .filter((item) => item.available)
      .reduce((sum, item) => sum + item.quantity * item.unitPricePaisa, 0),
    checkoutReady:
      items.length > 0 && items.every((item) => item.issues.length === 0),
  };
}

type EditableRow = {
  productId: string;
  productName: string;
  variantName: string;
  variantId: string;
  stock: number;
  salePrice: number;
  hasDiscount: number;
  discountPercentage: number;
  imageKey: string | null;
  currentQuantity: number | null;
  currentSelections: string | null;
  attributeId: string | null;
  attributeName: string | null;
  attributeValue: string | null;
  displayType: CartAttribute["displayType"] | null;
  valueType: CartAttribute["valueType"] | null;
  unit: string | null;
};

/** One D1 lookup handles ownership, publication, live stock and current attributes. */
async function editableVariant(
  user: CartIdentity,
  lookup: { variantId: string } | { itemId: string },
): Promise<{ DB: D1Database; row: EditableRow; attributes: CartAttribute[] }> {
  const { DB } = await storefrontEnv();
  const byItem = "itemId" in lookup;
  const query = `
    SELECT p.id AS productId, p.name AS productName,
      v.id AS variantId, v.name AS variantName, v.stock,
      v.sale_price AS salePrice, ${effectiveHasDiscount} AS hasDiscount,
      ${effectiveDiscount} AS discountPercentage,
      (SELECT pi.storage_key FROM product_images pi
        WHERE pi.variant_id = v.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS imageKey,
      ci.quantity AS currentQuantity, ci.selections_json AS currentSelections,
      a.id AS attributeId, a.name AS attributeName, va.value AS attributeValue,
      a.display_type AS displayType, a.value_type AS valueType, a.unit
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    ${promotionPriceJoins}
    LEFT JOIN cart_items ci ON ci.variant_id = v.id AND ci.user_id = ? AND ci.user_email = ?
    LEFT JOIN variant_attributes va ON va.variant_id = v.id
    LEFT JOIN attributes a ON a.id = va.attribute_id
    WHERE ${byItem ? "ci.id = ?" : "v.id = ?"}
      AND v.status = 1 AND v.deleted_at IS NULL
      AND p.status = 1 AND p.deleted_at IS NULL
  `;
  const results = await DB.prepare(query)
    .bind(user.id, user.email, byItem ? lookup.itemId : lookup.variantId)
    .all<EditableRow>();
  if (!results.results.length) {
    throw new CartError(
      404,
      byItem
        ? "Cart item not found or no longer available."
        : "Product variant is not available.",
    );
  }
  return {
    DB,
    row: results.results[0],
    attributes: collectAttributes(results.results),
  };
}

/** Idempotent by variant per customer; increments quantity only for identical choices. */
export async function addCartItem(
  user: CartIdentity,
  raw: unknown,
): Promise<void> {
  const input = validateItemInput(raw, false);
  const variantId = input.variantId!;
  const { DB, row, attributes } = await editableVariant(user, { variantId });
  const currentQuantity = row.currentQuantity ?? 0;
  const existing = row.currentSelections !== null;
  const existingSelections = existing
    ? decodeSelections(row.currentSelections!)
    : [];
  const candidate = validateCartSelection(
    currentQuantity + input.quantity,
    existing ? existingSelections : input.attributes,
    attributes,
    row.stock,
  );
  if (!candidate.ok) throw new CartError(409, candidate.message);
  if (existing) {
    const incoming = validateCartSelection(
      input.quantity,
      input.attributes,
      attributes,
      row.stock,
    );
    if (
      !incoming.ok ||
      JSON.stringify(incoming.normalized) !==
        JSON.stringify(candidate.normalized)
    ) {
      throw new CartError(
        409,
        "This variant is already in your cart with different options. Modify it in your cart.",
      );
    }
  }

  // The conflict WHERE clause prevents a concurrent add overwriting options,
  // crossing the quantity ceiling, or exceeding currently visible stock.
  const result = await DB.prepare(
    `
    INSERT INTO cart_items (
      id, user_id, user_email, variant_id, quantity, selections_json,
      product_name_snapshot, variant_name_snapshot, unit_price_snapshot, image_key_snapshot
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN products pp ON pp.id = pv.product_id
      WHERE pv.id = ? AND pv.status = 1 AND pv.deleted_at IS NULL
        AND pp.status = 1 AND pp.deleted_at IS NULL AND pv.stock >= ?
    )
    ON CONFLICT(user_id, variant_id) DO UPDATE SET
      quantity = cart_items.quantity + excluded.quantity,
      updated_at = CURRENT_TIMESTAMP
    WHERE cart_items.user_email = excluded.user_email
      AND cart_items.selections_json = excluded.selections_json
      AND cart_items.quantity + excluded.quantity BETWEEN 1 AND 99
      AND cart_items.quantity + excluded.quantity <= (
        SELECT pv.stock FROM product_variants pv
        JOIN products pp ON pp.id = pv.product_id
        WHERE pv.id = excluded.variant_id AND pv.status = 1 AND pv.deleted_at IS NULL
          AND pp.status = 1 AND pp.deleted_at IS NULL
      )
  `,
  )
    .bind(
      crypto.randomUUID(),
      user.id,
      user.email,
      variantId,
      input.quantity,
      JSON.stringify(candidate.normalized),
      row.productName,
      row.variantName,
      priceAfterDiscount(row),
      row.imageKey,
      variantId,
      currentQuantity + input.quantity,
    )
    .run();
  if (!result.meta.changes) {
    throw new CartError(
      409,
      "Cart changed, stock decreased, or selections differ. Refresh your cart.",
    );
  }
}

export async function updateCartItem(
  user: CartIdentity,
  itemId: string,
  raw: unknown,
): Promise<void> {
  assertItemId(itemId);
  const input = validateItemInput(raw, true);
  const { DB, row, attributes } = await editableVariant(user, { itemId });
  const checked = validateCartSelection(
    input.quantity,
    input.attributes,
    attributes,
    row.stock,
  );
  if (!checked.ok) throw new CartError(409, checked.message);
  const result = await DB.prepare(
    `
    UPDATE cart_items SET
      quantity = ?, selections_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND user_email = ?
      AND quantity = ? AND selections_json = ?
      AND ? <= (SELECT pv.stock FROM product_variants pv
        JOIN products pp ON pp.id = pv.product_id
        WHERE pv.id = cart_items.variant_id
          AND pv.status = 1 AND pv.deleted_at IS NULL
          AND pp.status = 1 AND pp.deleted_at IS NULL)
  `,
  )
    .bind(
      input.quantity,
      JSON.stringify(checked.normalized),
      itemId,
      user.id,
      user.email,
      row.currentQuantity,
      row.currentSelections,
      input.quantity,
    )
    .run();
  if (!result.meta.changes)
    throw new CartError(409, "Stock or cart item changed. Refresh your cart.");
}

export async function deleteCartItem(
  user: CartIdentity,
  itemId: string,
): Promise<void> {
  assertItemId(itemId);
  const { DB } = await storefrontEnv();
  const result = await DB.prepare(
    "DELETE FROM cart_items WHERE id = ? AND user_id = ? AND user_email = ?",
  )
    .bind(itemId, user.id, user.email)
    .run();
  if (!result.meta.changes) throw new CartError(404, "Cart item not found.");
}
