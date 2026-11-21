import "server-only";
import { promotionPriceJoins, effectiveHasDiscount, effectiveDiscount, effectiveUnitPrice } from "@/lib/promotions/sql";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth/require-auth";
import type { CartAttribute, CartSelection } from "@/lib/cart/types";
import { validateCartSelection } from "@/lib/cart/validation";
import type { OrderInfo, OrderListItem, OrderQuote, OrderSource, OrderStatus, PlaceOrderBody, ShippingDetails } from "./types";
import { normalizePakistanMobile } from "./phone";

export class OrderError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = "OrderError"; }
}
export type OrderActor = { id: string; email: string; role: "user" | "admin" };
export const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const uuid = () => crypto.randomUUID();
const MAX_LINES = 30;
const shippingFeePaisa = 0; // COD; change only with an explicit pricing/shipping policy.
const storeName = "Anoosha Store";
// Store address must be read from the runtime Cloudflare binding, not at build/module load time.

function record(x: unknown): x is Record<string, unknown> { return !!x && typeof x === "object" && !Array.isArray(x); }
export async function actor(role: "user" | "admin"): Promise<OrderActor> {
  const user = await getCurrentUser();
  if (!user || typeof user.id !== "string" || typeof user.email !== "string") throw new OrderError(401, "Please sign in first.");
  if (user.role !== role) throw new OrderError(403, role === "user" ? "Only customers can place orders." : "Administrator access is required.");
  return { id: user.id, email: user.email.trim().toLowerCase(), role };
}
export function db() {
  // Call inside a request only. Cloudflare D1 binding is not safe to access at module scope.
  return getCloudflareContext().env.DB;
}
export function orderErrorResponse(err: unknown): Response {
  const status = err instanceof OrderError ? err.status : 500;
  if (status === 500) console.error("Order request failed:", err);
  return Response.json({ success: false, message: err instanceof OrderError ? err.message : "Unable to process this order. Please try again." }, { status, headers: privateHeaders });
}
export function sameOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) throw new OrderError(403, "Invalid request origin.");
}
export async function bodyJson(req: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers.get("content-type") || "")) throw new OrderError(415, "Expected a JSON request.");
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 20000) throw new OrderError(413, "Request is too large.");
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > 20000) throw new OrderError(413, "Request is too large.");
  try { return JSON.parse(raw) as unknown; } catch { throw new OrderError(400, "Invalid JSON."); }
}
function clean(value: unknown, label: string, max: number, min = 1): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new OrderError(400, `${label} must contain ${min}–${max} characters.`);
  return value.trim();
}
function optionalText(v: unknown, max = 150): string | null { return v == null || v === "" ? null : clean(v, "Optional field", max); }
export function parseShipping(raw: unknown): ShippingDetails {
  if (!record(raw)) throw new OrderError(400, "Delivery information is required.");
  // Client and server share the same normalizer. Reachability is not
  // independently verified; server-side SMS/voice OTP would be needed for that.
  const phone = normalizePakistanMobile(raw.phone);
  if (!phone) throw new OrderError(400, "Enter a Pakistani mobile number in 03XXXXXXXXX or +923XXXXXXXXX format.");
  return { customerName: clean(raw.customerName, "Full name", 100, 2), phone,
    addressLine1: clean(raw.addressLine1, "Delivery address", 200, 8),
    addressLine2: optionalText(raw.addressLine2, 150) || "",
    city: clean(raw.city, "City", 90), province: clean(raw.province, "Province/region", 90),
    postalCode: optionalText(raw.postalCode, 20) || "" };
}
function parseSource(raw: unknown): OrderSource {
  if (!record(raw)) throw new OrderError(400, "Invalid order request.");
  if (raw.mode === "cart") return { mode: "cart" };
  if (raw.mode === "direct" && record(raw.item)) {
    const v = raw.item;
    if (typeof v.variantId !== "string" || v.variantId.length > 128 || !v.variantId ||
      !Number.isSafeInteger(v.quantity) || (v.quantity as number) < 1 || (v.quantity as number) > 99 || !Array.isArray(v.attributes)) {
      throw new OrderError(400, "Invalid product, quantity or selected options.");
    }
    return { mode: "direct", item: { variantId: v.variantId, quantity: v.quantity as number, attributes: v.attributes as CartSelection[] } };
  }
  throw new OrderError(400, "Choose cart checkout or a product to order.");
}
export function parsePlaceOrder(raw: unknown): PlaceOrderBody {
  if (!record(raw)) throw new OrderError(400, "Invalid order.");
  const source = parseSource(raw);
  const key = clean(raw.idempotencyKey, "Request ID", 80, 16);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw new OrderError(400, "Invalid request ID.");
  let expectedPrices: PlaceOrderBody["expectedPrices"];
  if (raw.expectedPrices !== undefined) {
    if (!Array.isArray(raw.expectedPrices) || raw.expectedPrices.length < 1 || raw.expectedPrices.length > MAX_LINES) {
      throw new OrderError(400, "Invalid displayed price details.");
    }
    const ids = new Set<string>();
    expectedPrices = raw.expectedPrices.map((entry: unknown) => {
      if (!record(entry) || typeof entry.variantId !== "string" ||
          entry.variantId.length < 1 || entry.variantId.length > 128 || ids.has(entry.variantId) ||
          !Number.isSafeInteger(entry.quantity) || (entry.quantity as number) < 1 ||
          (entry.quantity as number) > 99 ||
          !Number.isSafeInteger(entry.unitPaisa) || (entry.unitPaisa as number) < 0 ||
          !Number.isInteger(entry.discountPercentage) || (entry.discountPercentage as number) < 0 ||
          (entry.discountPercentage as number) > 99 ||
          (entry.appliedPromotionId !== null &&
            (typeof entry.appliedPromotionId !== "string" || entry.appliedPromotionId.length > 128))) {
        throw new OrderError(400, "Invalid displayed price details.");
      }
      ids.add(entry.variantId);
      return {
        variantId: entry.variantId,
        quantity: entry.quantity as number,
        unitPaisa: entry.unitPaisa as number,
        discountPercentage: entry.discountPercentage as number,
        appliedPromotionId: entry.appliedPromotionId as string | null,
      };
    });
  }
  return { ...source, shipping: parseShipping(raw.shipping), idempotencyKey: key,
    ...(expectedPrices ? { expectedPrices } : {}) };
}

type CandidateRow = {
  cartId: string | null; cartQuantity: number | null; cartSelections: string | null;
  variantId: string; productId: string; name: string; variantName: string;
  salePrice: number; hasDiscount: number; discountPercentage: number; stock: number;
  appliedPromotionId: string | null; appliedPromotionName: string | null;
  productUpdatedAt: string; variantUpdatedAt: string;
  productStatus: number; productDeletedAt: string | null; variantStatus: number; variantDeletedAt: string | null;
  attributeId: string | null; attributeName: string | null;
  attributeValue: string | null; displayType: CartAttribute["displayType"] | null;
  valueType: CartAttribute["valueType"] | null; unit: string | null;
};
type Candidate = {
  cartId: string | null; cartSelections: string | null; variantId: string; productId: string;
  name: string; variantName: string; salePrice: number; hasDiscount: number;
  discountPercentage: number; stock: number; productUpdatedAt: string; variantUpdatedAt: string;
  appliedPromotionId: string | null; appliedPromotionName: string | null;
  quantity: number; selections: CartSelection[]; attributes: CartAttribute[];
  unitPaisa: number; grossPaisa: number; netPaisa: number; discountPaisa: number;
};
function price(r: { salePrice: number; hasDiscount: number; discountPercentage: number }): number {
  return r.hasDiscount ? Math.floor((r.salePrice * (100 - r.discountPercentage) + 50) / 100) : r.salePrice;
}
const selectCandidatesSql = (source: OrderSource) => `
  SELECT ${source.mode === "cart" ? "ci.id" : "NULL"} AS cartId,
         ${source.mode === "cart" ? "ci.quantity" : "NULL"} AS cartQuantity,
         ${source.mode === "cart" ? "ci.selections_json" : "NULL"} AS cartSelections,
    v.id AS variantId, p.id AS productId, p.name, v.name AS variantName,
    v.sale_price AS salePrice, ${effectiveHasDiscount} AS hasDiscount, ${effectiveDiscount} AS discountPercentage,
    promo_active.id AS appliedPromotionId, promo_active.name AS appliedPromotionName,
    v.stock AS stock, p.status AS productStatus, p.deleted_at AS productDeletedAt,
    v.status AS variantStatus, v.deleted_at AS variantDeletedAt, p.updated_at AS productUpdatedAt, v.updated_at AS variantUpdatedAt,
    a.id AS attributeId, a.name AS attributeName, va.value AS attributeValue,
    a.display_type AS displayType, a.value_type AS valueType, a.unit AS unit
  FROM ${source.mode === "cart" ? "cart_items ci JOIN product_variants v ON v.id = ci.variant_id" : "product_variants v"}
  JOIN products p ON p.id = v.product_id
  ${promotionPriceJoins}
  LEFT JOIN variant_attributes va ON va.variant_id = v.id
  LEFT JOIN attributes a ON a.id = va.attribute_id
  WHERE ${source.mode === "cart" ? "ci.user_id = ? AND ci.user_email = ?" : "v.id = ?"}
  ORDER BY v.id, a.id
`;
export async function candidates(identity: OrderActor, source: OrderSource): Promise<Candidate[]> {
  const res = await db().prepare(selectCandidatesSql(source)).bind(...(source.mode === "cart" ? [identity.id, identity.email] : [source.item.variantId])).all<CandidateRow>();
  const grouped = new Map<string, CandidateRow[]>();
  for (const row of res.results) {
    const rows = grouped.get(row.variantId) ?? []; rows.push(row); grouped.set(row.variantId, rows);
  }
  if (!grouped.size) throw new OrderError(409, source.mode === "cart" ? "Your cart is empty or its products are no longer available." : "This product is unavailable.");
  if (grouped.size > MAX_LINES) throw new OrderError(400, `Maximum ${MAX_LINES} variants per order.`);
  const result: Candidate[] = [];
  for (const rows of grouped.values()) {
    const r = rows[0];
    if (r.productStatus !== 1 || r.variantStatus !== 1 || r.productDeletedAt !== null || r.variantDeletedAt !== null)
      throw new OrderError(409, `${r.name} — ${r.variantName} is no longer available.`);
    // Product and variant visibility are part of the same read and are enforced again at commit.
    const attributes: CartAttribute[] = rows.filter(x => x.attributeId && x.attributeValue !== null && x.displayType && x.valueType).map(x => ({
      id: x.attributeId!, name: x.attributeName!, value: x.attributeValue!,
      displayType: x.displayType!, valueType: x.valueType!, unit: x.unit,
    }));
    let selections: CartSelection[];
    try { selections = source.mode === "cart" ? JSON.parse(r.cartSelections || "[]") as CartSelection[] : source.item.attributes; }
    catch { throw new OrderError(409, `Saved options for ${r.name} are invalid. Update your cart.`); }
    const quantity = source.mode === "cart" ? r.cartQuantity! : source.item.quantity;
    const checked = validateCartSelection(quantity, selections, attributes, r.stock);
    if (!checked.ok) throw new OrderError(409, `${r.name} — ${r.variantName}: ${checked.message}`);
    const unitPaisa = price(r), grossPaisa = r.salePrice * quantity, netPaisa = unitPaisa * quantity;
    if (!Number.isSafeInteger(grossPaisa) || !Number.isSafeInteger(netPaisa)) throw new OrderError(400, "Order amount exceeds allowed limits.");
    result.push({ cartId: r.cartId, cartSelections: r.cartSelections, variantId: r.variantId, productId: r.productId,
      name: r.name, variantName: r.variantName, salePrice: r.salePrice, hasDiscount: r.hasDiscount,
      discountPercentage: r.discountPercentage, stock: r.stock, productUpdatedAt: r.productUpdatedAt,
      appliedPromotionId: r.appliedPromotionId, appliedPromotionName: r.appliedPromotionName,
      variantUpdatedAt: r.variantUpdatedAt, quantity, selections: checked.normalized, attributes,
      unitPaisa, grossPaisa, netPaisa, discountPaisa: grossPaisa - netPaisa });
  }
  return result;
}
export async function quote(identity: OrderActor, source: OrderSource): Promise<OrderQuote> {
  const rows = await candidates(identity, source);
  const subtotalPaisa = rows.reduce((s, c) => s + c.netPaisa, 0);
  return { lines: rows.map(c => ({ variantId: c.variantId, name: c.name, variantName: c.variantName,
      quantity: c.quantity, unitPaisa: c.unitPaisa, linePaisa: c.netPaisa,
      originalUnitPaisa: c.salePrice, discountPercentage: c.discountPercentage,
      appliedPromotionName: c.appliedPromotionName, appliedPromotionId: c.appliedPromotionId })),
    subtotalPaisa, shippingPaisa: shippingFeePaisa, totalPaisa: subtotalPaisa + shippingFeePaisa };
}

// Full immutable catalog snapshots are generated INSIDE the placement transaction,
// using the current database records. This avoids a race with admin catalog edits.
const productSnapshotExpr = `json_object('id',p.id,'name',p.name,'categoryId',p.category_id,'status',p.status,'hasVariants',p.has_variants,'createdAt',p.created_at,'updatedAt',p.updated_at,'deletedAt',p.deleted_at)`;
const variantSnapshotExpr = `json_object('id',v.id,'productId',v.product_id,'name',v.name,'slug',v.slug,'description',v.description,'shortDescription',v.short_description,'sku',v.sku,'salePrice',v.sale_price,'purchasePrice',v.purchase_price,'hasDiscount',${effectiveHasDiscount},'discountPercentage',${effectiveDiscount},'individualHasDiscount',v.has_discount,'individualDiscountPercentage',v.discount_percentage,'appliedPromotionDiscountPercentage',promo_active.discount_percentage,'tag',v.tag,'isDefault',v.is_default,'status',v.status,'stockBeforeOrder',v.stock,'createdAt',v.created_at,'updatedAt',v.updated_at,'deletedAt',v.deleted_at,'appliedPromotionId',promo_active.id,'appliedPromotionName',promo_active.name)`;
const attributesSnapshotExpr = `(SELECT COALESCE(json_group_array(json_object('id',a.id,'name',a.name,'value',va.value,'unit',a.unit,'displayType',a.display_type,'valueType',a.value_type)),'[]') FROM variant_attributes va JOIN attributes a ON a.id=va.attribute_id WHERE va.variant_id=v.id)`;
const imagesSnapshotExpr = `(SELECT COALESCE(json_group_array(json_object('id',pi.id,'storageKey',pi.storage_key,'sortOrder',pi.sort_order,'isPrimary',pi.is_primary)),'[]') FROM product_images pi WHERE pi.variant_id=v.id)`;
const netPriceExpr = effectiveUnitPrice;

export async function placeOrder(identity: OrderActor, payload: PlaceOrderBody): Promise<{ id: string; orderNumber: string }> {
  // Fast retry check: a network timeout must not create a second order.
  const database = db();
  const existing = await database.prepare("SELECT id,order_number AS orderNumber FROM orders WHERE user_id=? AND idempotency_key=?")
    .bind(identity.id, payload.idempotencyKey).first<{id:string;orderNumber:string}>();
  if (existing) return existing;
  const rows = await candidates(identity, payload);
  if (payload.expectedPrices) {
    const expectedByVariant = new Map(payload.expectedPrices.map((line) => [line.variantId, line]));
    if (expectedByVariant.size !== rows.length || rows.some((line) => {
      const expected = expectedByVariant.get(line.variantId);
      return !expected || expected.quantity !== line.quantity ||
        expected.unitPaisa !== line.unitPaisa ||
        expected.discountPercentage !== line.discountPercentage ||
        expected.appliedPromotionId !== line.appliedPromotionId;
    })) {
      throw new OrderError(409, "Promotion or price changed since checkout was displayed. Review updated prices and confirm again.");
    }
  }
  const gross = rows.reduce((s, r) => s + r.grossPaisa, 0);
  const discount = rows.reduce((s, r) => s + r.discountPaisa, 0);
  const subtotal = gross - discount;
  const total = subtotal + shippingFeePaisa;
  if (![gross, discount, subtotal, total].every(Number.isSafeInteger)) throw new OrderError(400, "Order value exceeds supported limits.");
  const storeAddress = (getCloudflareContext().env as unknown as {ORDER_STORE_ADDRESS?:string}).ORDER_STORE_ADDRESS?.trim() || "Pakistan";
  const orderId = `ord_${uuid()}`;
  const orderNumber = `AN-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${uuid().slice(0,8).toUpperCase()}`;
  const s = payload.shipping;
  const tuple = rows.map(() => "(?,?,?,?,?,?,?,?)").join(",");
  // The INSERT is conditional on ALL live variants being present, active, unchanged and in stock.
  // All subsequent writes depend on this newly inserted order ID. A 0-row INSERT never changes inventory.
  const guards: string[] = [];
  const guardArgs: unknown[] = [];
  for (const r of rows) {
    guards.push(`(SELECT COUNT(*) FROM variant_attributes WHERE variant_id=?)=?`);
    guardArgs.push(r.variantId, r.attributes.length);
    for (const a of r.attributes) {
      guards.push(`EXISTS (SELECT 1 FROM variant_attributes WHERE variant_id=? AND attribute_id=? AND value=?)`);
      guardArgs.push(r.variantId, a.id, a.value);
    }
    if (payload.mode === "cart") {
      guards.push(`EXISTS (SELECT 1 FROM cart_items ci WHERE ci.id=? AND ci.user_id=? AND ci.user_email=? AND ci.variant_id=? AND ci.quantity=? AND ci.selections_json=?)`);
      guardArgs.push(r.cartId, identity.id, identity.email, r.variantId, r.quantity, r.cartSelections);
    }
  }
  const insertOrder = `WITH requested(variant_id,qty,sale_price,has_discount,discount_percentage,promotion_id,product_updated_at,variant_updated_at) AS (VALUES ${tuple})
    INSERT OR IGNORE INTO orders
    (id,order_number,user_id,user_email,idempotency_key,customer_name,customer_phone,address_line1,address_line2,city,province,postal_code,country,store_name_snapshot,store_address_snapshot,gross_paisa,discount_paisa,subtotal_paisa,shipping_paisa,total_paisa)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'Pakistan',?,?,?,?,?,?,?
    WHERE NOT EXISTS (
      SELECT 1 FROM requested r
      LEFT JOIN product_variants v ON v.id=r.variant_id
      LEFT JOIN products p ON p.id=v.product_id
      ${promotionPriceJoins}
      WHERE v.id IS NULL OR p.id IS NULL OR v.status<>1 OR v.deleted_at IS NOT NULL OR p.status<>1 OR p.deleted_at IS NOT NULL
        OR v.stock<r.qty OR v.sale_price<>r.sale_price OR (${effectiveHasDiscount})<>r.has_discount
        OR (${effectiveDiscount})<>r.discount_percentage
        OR promo_active.id IS NOT r.promotion_id OR p.updated_at<>r.product_updated_at OR v.updated_at<>r.variant_updated_at
    ) AND ${guards.length ? guards.join(" AND ") : "1=1"}`;
  const requestedValues = rows.flatMap(r => [r.variantId, r.quantity, r.salePrice, r.hasDiscount, r.discountPercentage, r.appliedPromotionId, r.productUpdatedAt, r.variantUpdatedAt]);
  const stmts = [database.prepare(insertOrder).bind(...requestedValues, orderId, orderNumber, identity.id, identity.email, payload.idempotencyKey,
    s.customerName, s.phone, s.addressLine1, s.addressLine2 || null, s.city, s.province, s.postalCode || null,
    storeName, storeAddress, gross, discount, subtotal, shippingFeePaisa, total, ...guardArgs)];
  for (const r of rows) {
    stmts.push(database.prepare(`INSERT INTO order_items
      (id,order_id,product_id_snapshot,variant_id_snapshot,product_name,variant_name,has_variants,sku,quantity,image_key,
       original_unit_paisa,discount_percentage,final_unit_paisa,gross_paisa,discount_paisa,net_paisa,
       selected_attributes_json,product_snapshot_json,variant_snapshot_json,attributes_snapshot_json,images_snapshot_json)
      SELECT ?,?,p.id,v.id,p.name,v.name,p.has_variants,v.sku,?,
      (SELECT pi.storage_key FROM product_images pi WHERE pi.variant_id=v.id ORDER BY pi.is_primary DESC,pi.sort_order LIMIT 1),
      v.sale_price, ${effectiveDiscount},
      ${netPriceExpr}, v.sale_price*?, (v.sale_price-${netPriceExpr})*?, ${netPriceExpr}*?,
      ?,${productSnapshotExpr},${variantSnapshotExpr},${attributesSnapshotExpr},${imagesSnapshotExpr}
      FROM product_variants v JOIN products p ON p.id=v.product_id ${promotionPriceJoins} WHERE v.id=?
      AND EXISTS (SELECT 1 FROM orders o WHERE o.id=? AND o.idempotency_key=?)`)
      .bind(`oi_${uuid()}`, orderId, r.quantity, r.quantity, r.quantity, r.quantity,
        JSON.stringify(r.selections), r.variantId, orderId, payload.idempotencyKey));
    stmts.push(database.prepare(`UPDATE product_variants SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock>=?
      AND EXISTS (SELECT 1 FROM orders WHERE id=? AND idempotency_key=?)`)
      .bind(r.quantity, r.variantId, r.quantity, orderId, payload.idempotencyKey));
    stmts.push(database.prepare(`INSERT INTO inventory_movements (id,variant_id,movement_type,previous_qty,new_qty,qty_diff,note)
      SELECT ?,v.id,'order',v.stock+?,v.stock,?,? FROM product_variants v
      WHERE v.id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND idempotency_key=?)`)
      .bind(`mov_${uuid()}`, r.quantity, -r.quantity, `Order ${orderNumber}`, r.variantId, orderId, payload.idempotencyKey));
  }
  stmts.push(database.prepare(`INSERT INTO order_events (id,order_id,actor_id,actor_role,previous_status,next_status,note)
    SELECT ?,? ,?,'user',NULL,'pending','Order placed' WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND idempotency_key=?)`)
    .bind(`oe_${uuid()}`, orderId, identity.id, orderId, payload.idempotencyKey));
  if (payload.mode === "cart") {
    // Only remove the unchanged cart rows included in this order.
    for (const r of rows) {
      stmts.push(database.prepare(`DELETE FROM cart_items WHERE id=? AND user_id=? AND user_email=? AND quantity=? AND selections_json=?
        AND EXISTS(SELECT 1 FROM orders WHERE id=? AND idempotency_key=?)`)
        .bind(r.cartId, identity.id, identity.email, r.quantity, r.cartSelections, orderId, payload.idempotencyKey));
    }
  }
  const result = await database.batch(stmts);
  if ((result[0]?.meta?.changes ?? 0) === 1) return { id: orderId, orderNumber };
  const duplicate = await database.prepare("SELECT id,order_number AS orderNumber FROM orders WHERE user_id=? AND idempotency_key=?")
    .bind(identity.id, payload.idempotencyKey).first<{ id: string; orderNumber: string }>();
  if (duplicate) return duplicate;
  // Failure-only read to give the customer a specific stock/option message.
  // Normal orders do not pay for this extra D1 operation.
  try { await candidates(identity, payload); }
  catch (failure) { if (failure instanceof OrderError) throw failure; }
  throw new OrderError(409, "Availability or pricing changed while the order was being confirmed. Refresh checkout before retrying.");
}

type OrderDbRow = {
  id: string; orderNumber: string; status: OrderStatus; userEmail: string;
  customerName: string; phone: string; addressLine1: string; addressLine2: string | null;
  city: string; province: string; postalCode: string | null; country: string;
  storeName: string; storeAddress: string; paymentMethod: "cod";
  grossPaisa: number; discountPaisa: number; subtotalPaisa: number;
  shippingPaisa: number; totalPaisa: number; createdAt: string;
  cancelledAt: string | null; cancellationReason: string | null;
};
type LineDbRow = {
  id: string; productId: string; variantId: string; name: string; variantName: string;
  hasVariants: number; sku: string; quantity: number; imageKey: string | null;
  originalUnitPaisa: number; discountPercentage: number; finalUnitPaisa: number;
  grossPaisa: number; discountPaisa: number; netPaisa: number;
  selectedAttributesJson: string; attributesSnapshotJson: string;
  appliedPromotionName: string | null;
};
function dbUtcTimestamp(raw: string): number {
  // SQLite CURRENT_TIMESTAMP uses UTC without suffix.
  return Date.parse(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
}
function canCustomerCancel(status: OrderStatus, createdAt: string): boolean {
  const age = Date.now() - dbUtcTimestamp(createdAt);
  return (status === "pending" || status === "processing") && age >= 0 && age <= 15 * 60_000;
}
const orderColumns = `id,order_number AS orderNumber,status,user_email AS userEmail,
  customer_name AS customerName,customer_phone AS phone,address_line1 AS addressLine1,
  address_line2 AS addressLine2,city,province,postal_code AS postalCode,country,
  store_name_snapshot AS storeName,store_address_snapshot AS storeAddress,
  payment_method AS paymentMethod,gross_paisa AS grossPaisa,discount_paisa AS discountPaisa,
  subtotal_paisa AS subtotalPaisa,shipping_paisa AS shippingPaisa,total_paisa AS totalPaisa,
  created_at AS createdAt,cancelled_at AS cancelledAt,cancellation_reason AS cancellationReason`;
export async function orderDetails(identity: OrderActor, id: string): Promise<OrderInfo> {
  if (!/^ord_[a-z0-9-]{36}$/i.test(id)) throw new OrderError(404, "Order not found.");
  const database = db();
  const condition = identity.role === "user" ? "AND user_id=? AND user_email=?" : "";
  const header = await database.prepare(`SELECT ${orderColumns} FROM orders WHERE id=? ${condition}`)
    .bind(...(identity.role === "user" ? [id, identity.id, identity.email] : [id])).first<OrderDbRow>();
  if (!header) throw new OrderError(404, "Order not found.");
  const result = await database.prepare(`SELECT id,product_id_snapshot AS productId,variant_id_snapshot AS variantId,
    product_name AS name,variant_name AS variantName,has_variants AS hasVariants,sku,quantity,image_key AS imageKey,
    original_unit_paisa AS originalUnitPaisa,discount_percentage AS discountPercentage,final_unit_paisa AS finalUnitPaisa,
    gross_paisa AS grossPaisa,discount_paisa AS discountPaisa,net_paisa AS netPaisa,
    selected_attributes_json AS selectedAttributesJson,attributes_snapshot_json AS attributesSnapshotJson,
    json_extract(variant_snapshot_json, '$.appliedPromotionName') AS appliedPromotionName
    FROM order_items WHERE order_id=? ORDER BY rowid`).bind(id).all<LineDbRow>();
  const events = identity.role === "admin"
    ? (await database.prepare(`SELECT id,previous_status AS previousStatus,next_status AS nextStatus,
        actor_role AS actorRole,note,created_at AS createdAt FROM order_events
        WHERE order_id=? ORDER BY created_at DESC,id DESC`).bind(id).all<{
          id:string;previousStatus:string|null;nextStatus:OrderStatus;actorRole:string;note:string|null;createdAt:string
        }>()).results
    : undefined;
  return {
    ...header,
    ...(events ? { events } : {}),
    cancelDeadline: new Date(dbUtcTimestamp(header.createdAt) + 15 * 60_000).toISOString(),
    canCustomerCancel: canCustomerCancel(header.status, header.createdAt),
    items: result.results.map(row => {
      const selections = JSON.parse(row.selectedAttributesJson) as CartSelection[];
      const attrs = JSON.parse(row.attributesSnapshotJson) as Array<{id:string;name:string}>;
      return {
        id: row.id, productId: row.productId, variantId: row.variantId, name: row.name,
        variantName: row.variantName, hasVariants: !!row.hasVariants, sku: row.sku,
        quantity: row.quantity, imageKey: row.imageKey, originalUnitPaisa: row.originalUnitPaisa,
        discountPercentage: row.discountPercentage, appliedPromotionName: row.appliedPromotionName,
        finalUnitPaisa: row.finalUnitPaisa,
        grossPaisa: row.grossPaisa, discountPaisa: row.discountPaisa, netPaisa: row.netPaisa,
        selections: selections.map(s => ({ attributeId: s.attributeId,
          name: attrs.find(a => a.id === s.attributeId)?.name ?? s.attributeId, values: s.values })),
      };
    }),
  };
}
export async function orderList(
  identity: OrderActor,
  page: number,
  status?: OrderStatus,
  requestedPageSize = 20,
) {
  // Customers stay at 20 orders/page; only admins may request 10/20/50/100.
  // Whitelist sizes at the database boundary to prevent unbounded scans.
  const pageSize =
    identity.role === "admin"
      ? ([10, 20, 50, 100].includes(requestedPageSize)
          ? requestedPageSize
          : 10)
      : 20;
  const safePage = Math.min(10000, Math.max(1, Number.isInteger(page) ? page : 1));
  const where = identity.role === "user" ? "WHERE user_id=? AND user_email=?" : status ? "WHERE status=?" : "";
  const args = identity.role === "user" ? [identity.id, identity.email] : status ? [status] : [];
  const result = await db().prepare(`SELECT id,order_number AS orderNumber,status,total_paisa AS totalPaisa,
    created_at AS createdAt,customer_name AS customerName,user_email AS userEmail,
    customer_phone AS phone,
    COUNT(*) OVER() AS totalRows FROM orders ${where}
    ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(...args, pageSize, (safePage-1)*pageSize)
    .all<OrderListItem & { totalRows:number }>();
  return {
    data: result.results.map(o => ({ id:o.id,orderNumber:o.orderNumber,status:o.status,
      totalPaisa:o.totalPaisa,createdAt:o.createdAt,customerName:o.customerName,userEmail:o.userEmail,phone:o.phone,
      canCustomerCancel: canCustomerCancel(o.status,o.createdAt) })),
    page: safePage, total: result.results[0]?.totalRows ?? 0, pageSize,
  };
}

type StatusRow = {status: OrderStatus; createdAt: string; variantId: string; quantity: number};
export async function changeStatus(identity: OrderActor, id: string, desired: OrderStatus, reasonRaw?: unknown) {
  if (!/^ord_[a-z0-9-]{36}$/i.test(id)) throw new OrderError(404, "Order not found.");
  const database = db();
  const owner = identity.role === "user" ? "AND o.user_id=? AND o.user_email=?" : "";
  const result = await database.prepare(`SELECT o.status,o.created_at AS createdAt,oi.variant_id_snapshot AS variantId,
    oi.quantity FROM orders o JOIN order_items oi ON oi.order_id=o.id
    WHERE o.id=? ${owner}`)
    .bind(...(identity.role === "user" ? [id,identity.id,identity.email] : [id])).all<StatusRow>();
  if (!result.results.length) throw new OrderError(404, "Order not found.");
  const current = result.results[0].status;
  if (current === "cancelled") throw new OrderError(409, "This order is already cancelled.");
  if (identity.role === "user") {
    if (desired !== "cancelled") throw new OrderError(403, "Customers can only cancel orders.");
    if (!canCustomerCancel(current, result.results[0].createdAt)) throw new OrderError(409, "The 15-minute cancellation window has ended. Please contact support with your order number.");
  } else {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      pending: ["processing","delivered","cancelled"],
      processing: ["delivered","cancelled"], delivered: ["cancelled"], cancelled: [],
    };
    if (!allowed[current].includes(desired)) throw new OrderError(409, `Cannot change an order from ${current} to ${desired}.`);
  }
  const isCancel = desired === "cancelled";
  const reason = isCancel ? clean(reasonRaw, "Cancellation reason", 500, 5) : optionalText(reasonRaw, 500);
  const actionId = uuid();
  const guard = identity.role === "user" ? "AND user_id=? AND user_email=? AND unixepoch('now')-unixepoch(created_at) BETWEEN 0 AND 900" : "";
  const update = database.prepare(`UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP,last_action_id=?,
    cancellation_reason=CASE WHEN ?='cancelled' THEN ? ELSE cancellation_reason END,
    cancelled_by=CASE WHEN ?='cancelled' THEN ? ELSE cancelled_by END,
    cancelled_at=CASE WHEN ?='cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END,
    delivered_at=CASE WHEN ?='delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
    WHERE id=? AND status=? ${guard}`)
    .bind(desired,actionId,desired,reason,desired,identity.id,desired,desired,id,current,
      ...(identity.role === "user" ? [identity.id,identity.email] : []));
  const statements = [update];
  // Delivered parcels should NOT automatically be restocked on administrative cancellation.
  // A physically returned parcel must be received through your normal inventory module.
  if (isCancel && current !== "delivered") {
    for (const r of result.results) {
      statements.push(database.prepare(`UPDATE product_variants SET stock=stock+?,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='cancelled' AND last_action_id=?)`)
        .bind(r.quantity,r.variantId,id,actionId));
      statements.push(database.prepare(`INSERT INTO inventory_movements
        (id,variant_id,movement_type,previous_qty,new_qty,qty_diff,note)
        SELECT ?,v.id,'order_cancel',v.stock-?,v.stock,?,? FROM product_variants v
        WHERE v.id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='cancelled' AND last_action_id=?)`)
        .bind(`mov_${uuid()}`,r.quantity,r.quantity,`Cancelled order ${id}: ${reason}`,r.variantId,id,actionId));
    }
  }
  statements.push(database.prepare(`INSERT INTO order_events (id,order_id,actor_id,actor_role,previous_status,next_status,note)
    SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND last_action_id=?)`)
    .bind(`oe_${uuid()}`,id,identity.id,identity.role,current,desired,reason,id,actionId));
  const batch = await database.batch(statements);
  if ((batch[0]?.meta?.changes ?? 0) !== 1) throw new OrderError(409, "Order status changed. Refresh and try again.");
  return { id, status: desired };
}
export function parseStatus(raw: unknown): {status:OrderStatus; reason?: unknown} {
  if (!record(raw) || !["processing","delivered","cancelled"].includes(String(raw.status))) throw new OrderError(400,"Invalid order status.");
  return { status: raw.status as OrderStatus, reason: raw.reason };
}
export function parseCancellation(raw: unknown): string {
  if (!record(raw)) throw new OrderError(400,"A cancellation reason is required.");
  return clean(raw.reason,"Cancellation reason",500,5);
}
