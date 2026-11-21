import "server-only";

import { actor, db, privateHeaders, sameOrigin } from "@/lib/orders/server";
import { parseTargets, PromotionError } from "@/lib/promotions/server";
import type { PromotionTargets } from "@/lib/promotions/types";
import type {
  SalesCategoryBreakdown,
  SalesProductBreakdown,
  SalesReport,
  SalesReportBreakdown,
  SalesReportLine,
  SalesReportRequest,
  SalesReportSummary,
} from "./types";
import type { OrderStatus } from "@/lib/orders/types";

const MAX_REPORT_LINES = 10000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "delivered",
  "cancelled",
];

export class SalesReportError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SalesReportError";
  }
}

export { privateHeaders };
export async function requireSalesReportAdmin() {
  return actor("admin");
}
export { sameOrigin };

export function reportErrorResponse(error: unknown): Response {
  if (
    !(error instanceof SalesReportError) &&
    !(error instanceof PromotionError) &&
    !(error instanceof Error && "status" in error)
  ) {
    console.error("Sales report failed:", error);
  }
  const code =
    error instanceof SalesReportError || error instanceof PromotionError
      ? error.status
      : error instanceof Error &&
          "status" in error &&
          typeof error.status === "number"
        ? error.status
        : 500;
  const status = [400, 401, 403, 413, 415].includes(code) ? code : 500;
  return Response.json(
    {
      success: false,
      message:
        status === 500
          ? "Unable to generate sales report."
          : error instanceof Error
            ? error.message
            : "Invalid report request.",
    },
    { status, headers: privateHeaders },
  );
}

export async function readReportBody(request: Request): Promise<unknown> {
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(
      request.headers.get("content-type") || "",
    )
  ) {
    throw new SalesReportError(415, "Expected application/json.");
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 100000)
    throw new SalesReportError(413, "Report selection is too large.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 100000) {
    throw new SalesReportError(413, "Report selection is too large.");
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new SalesReportError(400, "Invalid JSON request.");
  }
}

function validDate(date: unknown, label: string): string {
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    throw new SalesReportError(400, `${label} must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new SalesReportError(400, `${label} is not a valid date.`);
  }
  return date;
}

export function parseSalesReportRequest(raw: unknown): SalesReportRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SalesReportError(400, "Select a date range and report scope.");
  }
  const input = raw as Record<string, unknown>;
  const startDate = validDate(input.startDate, "Start date");
  const endDate = validDate(input.endDate, "End date");
  if (startDate > endDate)
    throw new SalesReportError(400, "Start date must not be after end date.");
  let targets: PromotionTargets;
  try {
    targets = parseTargets(input.targets);
  } catch (error) {
    if (error instanceof PromotionError)
      throw new SalesReportError(400, error.message);
    throw error;
  }
  // Avoid huge JSON predicates in one D1 request.
  if (JSON.stringify(targets).length > 85000) {
    throw new SalesReportError(
      413,
      "Reduce the number of selected products or variants.",
    );
  }
  return { startDate, endDate, targets };
}

/** Orders are stored as SQLite CURRENT_TIMESTAMP in UTC; report days are Pakistan local days. */
function pakistanDayStartUtc(date: string): string {
  const utcMillis = Date.parse(`${date}T00:00:00.000Z`) - 5 * 60 * 60 * 1000;
  return new Date(utcMillis).toISOString().slice(0, 19).replace("T", " ");
}
function pakistanDayAfterUtc(date: string): string {
  const utcMillis =
    Date.parse(`${date}T00:00:00.000Z`) +
    24 * 60 * 60 * 1000 -
    5 * 60 * 60 * 1000;
  return new Date(utcMillis).toISOString().slice(0, 19).replace("T", " ");
}

/** Match saved order-item IDs and category snapshots, never current catalog membership. */
export function selectionPredicate(targets: PromotionTargets): string {
  switch (targets.scope) {
    case "store":
      return `NOT EXISTS (
        SELECT 1 FROM json_each(cfg.rules_json,'$.excludedVariantIds') x
        WHERE x.value=oi.variant_id_snapshot
      )`;
    case "products":
      return `EXISTS (
        SELECT 1 FROM json_each(cfg.rules_json,'$.products') pt
        WHERE json_extract(pt.value,'$.productId')=oi.product_id_snapshot
          AND (
            json_type(pt.value,'$.variantIds')='null'
            OR EXISTS (SELECT 1 FROM json_each(pt.value,'$.variantIds') vx
              WHERE vx.value=oi.variant_id_snapshot)
          )
      )`;
    case "categories":
      return `EXISTS (
        SELECT 1 FROM json_each(cfg.rules_json,'$.categories') ct
        WHERE json_extract(ct.value,'$.categoryId')=json_extract(oi.product_snapshot_json,'$.categoryId')
          AND NOT EXISTS (SELECT 1 FROM json_each(ct.value,'$.excludedVariantIds') x
            WHERE x.value=oi.variant_id_snapshot)
          AND (
            json_extract(ct.value,'$.allProducts')=1
            OR EXISTS (
              SELECT 1 FROM json_each(ct.value,'$.products') pt
              WHERE json_extract(pt.value,'$.productId')=oi.product_id_snapshot
                AND (
                  json_type(pt.value,'$.variantIds')='null'
                  OR EXISTS (SELECT 1 FROM json_each(pt.value,'$.variantIds') vx
                    WHERE vx.value=oi.variant_id_snapshot)
                )
            )
          )
      )`;
  }
}

type StoredLine = Omit<SalesReportLine, "hasVariants"> & {
  hasVariants: number;
};

function newStatus(status: OrderStatus): SalesReportBreakdown {
  return {
    status,
    orders: 0,
    units: 0,
    grossPaisa: 0,
    discountPaisa: 0,
    netPaisa: 0,
  };
}

export async function generateSalesReport(
  input: SalesReportRequest,
): Promise<SalesReport> {
  const sql = `
    SELECT o.id AS orderId, o.order_number AS orderNumber,
      o.created_at AS orderedAt, o.status AS status,
      o.cancelled_at AS cancelledAt, o.cancellation_reason AS cancellationReason,
      o.customer_name AS customerName,
      oi.product_id_snapshot AS productId, oi.variant_id_snapshot AS variantId,
      json_extract(oi.product_snapshot_json,'$.categoryId') AS categoryId,
      COALESCE(c.name, '[Historical category]') AS categoryName,
      oi.product_name AS productName, oi.variant_name AS variantName,
      oi.has_variants AS hasVariants, oi.sku AS sku, oi.quantity AS quantity,
      oi.original_unit_paisa AS originalUnitPaisa,
      oi.final_unit_paisa AS finalUnitPaisa,
      oi.discount_percentage AS discountPercentage,
      oi.gross_paisa AS grossPaisa, oi.discount_paisa AS discountPaisa,
      oi.net_paisa AS netPaisa
    FROM orders o
    JOIN order_items oi ON oi.order_id=o.id
    LEFT JOIN categories c ON c.id=json_extract(oi.product_snapshot_json,'$.categoryId')
    CROSS JOIN (SELECT ? AS rules_json) cfg
    WHERE o.created_at >= ? AND o.created_at < ?
      AND (${selectionPredicate(input.targets)})
    ORDER BY o.created_at DESC, o.id DESC, oi.id ASC
    LIMIT ?`;
  const result = await db()
    .prepare(sql)
    .bind(
      JSON.stringify(input.targets),
      pakistanDayStartUtc(input.startDate),
      pakistanDayAfterUtc(input.endDate),
      MAX_REPORT_LINES + 1,
    )
    .all<StoredLine>();

  const fetched = result.results ?? [];
  if (fetched.length > MAX_REPORT_LINES) {
    throw new SalesReportError(
      413,
      `This report contains more than ${MAX_REPORT_LINES.toLocaleString()} order lines. Choose a shorter date range or a narrower product selection.`,
    );
  }

  const lines: SalesReportLine[] = fetched.map((row) => ({
    ...row,
    hasVariants: !!row.hasVariants,
    quantity: Number(row.quantity),
    originalUnitPaisa: Number(row.originalUnitPaisa),
    finalUnitPaisa: Number(row.finalUnitPaisa),
    discountPercentage: Number(row.discountPercentage),
    grossPaisa: Number(row.grossPaisa),
    discountPaisa: Number(row.discountPaisa),
    netPaisa: Number(row.netPaisa),
  }));
  const summary: SalesReportSummary = {
    orders: 0,
    lines: lines.length,
    units: 0,
    grossPaisa: 0,
    discountPaisa: 0,
    totalAfterDiscountPaisa: 0,
    cancelledPaisa: 0,
    netSalesPaisa: 0,
    deliveredPaisa: 0,
    activeUnits: 0,
  };
  const statuses = new Map<OrderStatus, SalesReportBreakdown>(
    VALID_STATUSES.map((s) => [s, newStatus(s)] as const),
  );
  const countedOrders = new Set<string>();
  const variantMaps = new Map<
    string,
    SalesProductBreakdown & { seenOrders: Set<string> }
  >();
  const categoryMaps = new Map<
    string,
    SalesCategoryBreakdown & { seenOrders: Set<string> }
  >();
  for (const line of lines) {
    const status = statuses.get(line.status);
    if (!status)
      throw new SalesReportError(500, "Unrecognized stored order status.");
    const statusKey = `${line.status}:${line.orderId}`;
    if (!countedOrders.has(statusKey)) {
      status.orders++;
      countedOrders.add(statusKey);
    }
    summary.units += line.quantity;
    summary.grossPaisa += line.grossPaisa;
    summary.discountPaisa += line.discountPaisa;
    summary.totalAfterDiscountPaisa += line.netPaisa;
    status.units += line.quantity;
    status.grossPaisa += line.grossPaisa;
    status.discountPaisa += line.discountPaisa;
    status.netPaisa += line.netPaisa;
    if (line.status === "cancelled") summary.cancelledPaisa += line.netPaisa;
    else summary.activeUnits += line.quantity;
    if (line.status === "delivered") summary.deliveredPaisa += line.netPaisa;

    const categoryKey = line.categoryId ?? "uncategorized";
    let category = categoryMaps.get(categoryKey);
    if (!category) {
      category = {
        categoryId: categoryKey,
        categoryName: line.categoryName,
        orders: 0,
        units: 0,
        cancelledPaisa: 0,
        netSalesPaisa: 0,
        seenOrders: new Set(),
      };
      categoryMaps.set(categoryKey, category);
    }
    if (!category.seenOrders.has(line.orderId)) {
      category.orders++;
      category.seenOrders.add(line.orderId);
    }
    if (line.status === "cancelled") category.cancelledPaisa += line.netPaisa;
    else {
      category.netSalesPaisa += line.netPaisa;
      category.units += line.quantity;
    }

    const key = line.variantId;
    let variant = variantMaps.get(key);
    if (!variant) {
      variant = {
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        categoryName: line.categoryName,
        hasVariants: line.hasVariants,
        sku: line.sku,
        orderCount: 0,
        units: 0,
        cancelledPaisa: 0,
        netSalesPaisa: 0,
        seenOrders: new Set(),
      };
      variantMaps.set(key, variant);
    }
    if (!variant.seenOrders.has(line.orderId)) {
      variant.orderCount++;
      variant.seenOrders.add(line.orderId);
    }
    if (line.status === "cancelled") variant.cancelledPaisa += line.netPaisa;
    else {
      variant.netSalesPaisa += line.netPaisa;
      variant.units += line.quantity;
    }
  }
  summary.orders = new Set(lines.map((l) => l.orderId)).size;
  summary.netSalesPaisa =
    summary.totalAfterDiscountPaisa - summary.cancelledPaisa;
  const byVariant: SalesProductBreakdown[] = [...variantMaps.values()]
    .map(({ seenOrders: _seen, ...data }) => data)
    .sort(
      (a, b) =>
        b.netSalesPaisa - a.netSalesPaisa ||
        a.productName.localeCompare(b.productName),
    );

  const byCategory: SalesCategoryBreakdown[] = [...categoryMaps.values()]
    .map(({ seenOrders: _seen, ...data }) => data)
    .sort(
      (a, b) =>
        b.netSalesPaisa - a.netSalesPaisa ||
        a.categoryName.localeCompare(b.categoryName),
    );

  return {
    generatedAt: new Date().toISOString(),
    timeZone: "Asia/Karachi",
    startDate: input.startDate,
    endDate: input.endDate,
    targets: input.targets,
    summary,
    byStatus: VALID_STATUSES.map((s) => statuses.get(s)!),
    byVariant,
    byCategory,
    lines,
  };
}
