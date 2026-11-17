import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { errorResponse, serverError, successResponse } from "@/lib/server/api-response";

export type InventoryOperationType = "purchase" | "increase" | "decrease";

type Database = D1Database;
type CatalogProductRow = { id: string; name: string; hasVariants: number; deletedAt: string | null };
type CatalogVariantRow = { id: string; productId: string; name: string; sku: string; stock: number; isDefault: number };
type StockRow = { id: string; stock: number; productName: string; variantName: string; sku: string };

type InventoryLineInput = { variantId: string; quantity: number };
export type InventoryDocumentInput = {
  documentId: string;
  operationType: InventoryOperationType;
  reference: string | null;
  note: string | null;
  lines: InventoryLineInput[];
};

const MAX_LINES = 25;
const MAX_QUANTITY = 1_000_000;
const ID_PATTERN = /^[\w:-]{1,120}$/;
const DOCUMENT_ID_PATTERN = /^inv_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = new Set(["purchase", "increase", "decrease"]);

async function database(): Promise<Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function parseInput(payload: unknown): InventoryDocumentInput {
  if (!isRecord(payload)) throw new Error("Provide the inventory document details.");
  if (typeof payload.operationType !== "string" || !TYPES.has(payload.operationType)) {
    throw new Error("Choose Purchase, Increase stock, or Decrease stock.");
  }
  const operationType = payload.operationType as InventoryOperationType;
  // Reusing the client-generated document ID makes retries safe when an HTTP
  // response is lost after the D1 transaction has already committed.
  const documentId = payload.documentId === undefined
    ? `inv_${crypto.randomUUID()}`
    : payload.documentId;
  if (typeof documentId !== "string" || !DOCUMENT_ID_PATTERN.test(documentId)) {
    throw new Error("Invalid inventory document identifier. Reopen the form and try again.");
  }
  const reference = typeof payload.reference === "string" ? payload.reference.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (reference.length > 120) throw new Error("Invoice/reference must be at most 120 characters.");
  if (note.length > 500) throw new Error("Notes must be at most 500 characters.");
  if (operationType === "purchase" && !reference) throw new Error("Enter an invoice/reference number for this purchase.");
  if (!Array.isArray(payload.lines) || payload.lines.length < 1 || payload.lines.length > MAX_LINES) {
    throw new Error(`Select between 1 and ${MAX_LINES} products/variants for one document.`);
  }
  const seen = new Set<string>();
  const lines = payload.lines.map((line: unknown, index: number): InventoryLineInput => {
    if (!isRecord(line) || typeof line.variantId !== "string" || !ID_PATTERN.test(line.variantId)) {
      throw new Error(`Select a valid product/variant in row ${index + 1}.`);
    }
    if (!Number.isSafeInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > MAX_QUANTITY) {
      throw new Error(`Row ${index + 1}: enter a whole-number quantity from 1 to ${MAX_QUANTITY.toLocaleString()}.`);
    }
    if (seen.has(line.variantId)) throw new Error(`Row ${index + 1}: this variant is already selected. Combine the quantities into one row.`);
    seen.add(line.variantId);
    return { variantId: line.variantId, quantity: Number(line.quantity) };
  });
  return { documentId, operationType, reference: reference || null, note: note || null, lines };
}

// Search returns product groups, including ALL their variants. For a simple
// product the UI selects the only/default variant when the product is clicked.
export async function getInventoryCatalog(params: URLSearchParams) {
  const query = (params.get("search") ?? "").trim().slice(0, 100);
  const mode = params.get("mode");
  if (mode && mode !== "history") return errorResponse("Invalid inventory catalog mode.", 400);
  const includeArchived = mode === "history";
  const db = await database();
  const condition = includeArchived ? "1=1" : "p.deleted_at IS NULL";
  const matches = query
    ? `AND (lower(p.name) LIKE ? OR EXISTS (
        SELECT 1 FROM product_variants xv
        WHERE xv.product_id = p.id
          ${includeArchived ? "" : "AND xv.deleted_at IS NULL"}
          AND (lower(xv.name) LIKE ? OR lower(xv.sku) LIKE ?)
      ))`
    : "";
  const like = `%${query.toLowerCase()}%`;
  const searchArgs = query ? [like, like, like] : [];
  const catalogStatement = db.prepare(`
    SELECT p.id, p.name, p.has_variants AS hasVariants, p.deleted_at AS deletedAt
    FROM products p WHERE ${condition} ${matches}
    ORDER BY p.name COLLATE NOCASE ASC LIMIT 50
  `);
  const found = searchArgs.length
    ? await catalogStatement.bind(...searchArgs).all<CatalogProductRow>()
    : await catalogStatement.all<CatalogProductRow>();
  const parents = found.results ?? [];
  if (!parents.length) return successResponse("Catalog loaded.", []);
  const placeholders = parents.map(() => "?").join(",");
  const variants = await db.prepare(`
    SELECT v.id, v.product_id AS productId, v.name, v.sku, v.stock,
           v.is_default AS isDefault
    FROM product_variants v
    WHERE v.product_id IN (${placeholders}) ${includeArchived ? "" : "AND v.deleted_at IS NULL"}
    ORDER BY v.is_default DESC, v.name COLLATE NOCASE ASC
  `).bind(...parents.map((p) => p.id)).all<CatalogVariantRow>();
  const groups = new Map<string, CatalogVariantRow[]>();
  for (const variant of variants.results ?? []) {
    const group = groups.get(variant.productId) ?? [];
    group.push(variant);
    groups.set(variant.productId, group);
  }
  return successResponse("Catalog loaded.", parents.map((product) => ({
    id: product.id,
    name: product.name,
    archived: Boolean(product.deletedAt),
    // Count live variants, not merely the stored has_variants flag.
    hasVariants: (groups.get(product.id)?.length ?? 0) > 1,
    variants: groups.get(product.id) ?? [],
  })).filter((product) => product.variants.length > 0));
}

// Filter all history without mutating any stock; includes archived products
// and old initial-stock records with NULL document_id.
export async function getInventoryHistory(params: URLSearchParams) {
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "10");
  if (!Number.isSafeInteger(page) || page < 1 || ![10, 20, 50, 100].includes(limit)) {
    return errorResponse("Choose a valid report page and page size (10, 20, 50 or 100).", 400);
  }
  const search = (params.get("search") ?? "").trim().slice(0, 100);
  const from = (params.get("from") ?? "").trim();
  const to = (params.get("to") ?? "").trim();
  const type = (params.get("type") ?? "all").trim();
  const tzOffsetMinutes = Number(params.get("tzOffsetMinutes") ?? "0");
  if (!Number.isSafeInteger(tzOffsetMinutes) || tzOffsetMinutes < -840 || tzOffsetMinutes > 840) {
    return errorResponse("Invalid report time zone offset.");
  }
  if ((from && !validDate(from)) || (to && !validDate(to))) return errorResponse("Select valid report dates.");
  if (from && to && from > to) return errorResponse("From date must be on or before To date.");
  if (!new Set(["all", "purchase", "increase", "decrease"]).has(type)) return errorResponse("Invalid inventory movement type.");
  const ids = (params.get("productIds") ?? "").split(",").filter(Boolean);
  if (ids.length > 50 || ids.some((id) => !ID_PATTERN.test(id))) return errorResponse("Select up to 50 valid products.");

  const clauses: string[] = [];
  const bindings: (string | number)[] = [];
  // Store SQLite current_timestamp in UTC; interpret date inputs in the
  // browser's local timezone (e.g. Pakistan UTC+05:00), not UTC midnight.
  const utcBoundary = (day: string, nextDay = false) => {
    const utcMillis = Date.parse(`${day}T00:00:00.000Z`)
      + (nextDay ? 86_400_000 : 0) - tzOffsetMinutes * 60_000;
    return new Date(utcMillis).toISOString().replace("T", " ").slice(0, 19);
  };
  if (from) { clauses.push("m.created_at >= ?"); bindings.push(utcBoundary(from)); }
  if (to) { clauses.push("m.created_at < ?"); bindings.push(utcBoundary(to, true)); }
  if (type === "purchase") clauses.push("(d.operation_type = 'purchase' OR (d.id IS NULL AND m.movement_type = 'purchase'))");
  if (type === "increase") clauses.push("(d.operation_type = 'increase' OR (d.id IS NULL AND m.movement_type != 'purchase' AND m.qty_diff > 0))");
  if (type === "decrease") clauses.push("(d.operation_type = 'decrease' OR (d.id IS NULL AND m.movement_type != 'purchase' AND m.qty_diff < 0))");
  if (ids.length) { clauses.push(`p.id IN (${ids.map(() => "?").join(",")})`); bindings.push(...ids); }
  if (search) {
    clauses.push("(lower(p.name) LIKE ? OR lower(v.name) LIKE ? OR lower(v.sku) LIKE ? OR lower(coalesce(d.reference, '')) LIKE ?)");
    bindings.push(...Array(4).fill(`%${search.toLowerCase()}%`));
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const fromTables = `FROM inventory_movements m
    JOIN product_variants v ON v.id = m.variant_id
    JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory_documents d ON d.id = m.document_id`;
  const db = await database();
  const countStatement = db.prepare(`SELECT COUNT(*) AS total ${fromTables} ${where}`);
  const countResult = bindings.length
    ? await countStatement.bind(...bindings).first<{ total: number }>()
    : await countStatement.first<{ total: number }>();
  const total = Number(countResult?.total ?? 0);
  const rows = await db.prepare(`
    SELECT m.id, m.variant_id AS variantId, m.movement_type AS movementType,
           m.previous_qty AS previousQty, m.new_qty AS newQty, m.qty_diff AS qtyDiff,
           m.note, m.created_at AS createdAt,
           p.id AS productId, p.name AS productName, p.has_variants AS hasVariants,
           v.name AS variantName, v.sku,
           d.id AS documentId, d.operation_type AS documentType,
           d.reference, d.note AS documentNote, d.created_by AS createdBy
    ${fromTables} ${where}
    ORDER BY m.created_at DESC, m.rowid DESC
    LIMIT ? OFFSET ?
  `).bind(...bindings, limit, (page - 1) * limit).all();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return successResponse("Inventory history loaded.", (rows.results ?? []).map((row) => ({
    ...row,
    hasVariants: Boolean(row.hasVariants),
    type: row.documentType === "purchase" || row.movementType === "purchase"
      ? "purchase"
      : !row.documentId && typeof row.note === "string" && /^initial stock/i.test(row.note)
        ? "initial"
        : row.documentType === "increase" || Number(row.qtyDiff) > 0
          ? "increase" : row.documentType === "decrease" || Number(row.qtyDiff) < 0
            ? "decrease" : "initial",
  })), { pagination: {
    page, limit, total, totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  } });
}

// Identify a safely repeated POST without making another inventory adjustment.
// A client keeps documentId stable until it receives a successful response.
async function existingDocumentMatches(
  db: Database,
  input: InventoryDocumentInput,
  adminEmail: string,
): Promise<boolean | null> {
  const existing = await db.prepare(`
    SELECT operation_type AS operationType, reference, note, created_by AS createdBy
    FROM inventory_documents WHERE id = ?
  `).bind(input.documentId).first<{
    operationType: string; reference: string | null; note: string | null; createdBy: string;
  }>();
  if (!existing) return null;
  if (existing.operationType !== input.operationType ||
      existing.reference !== input.reference || existing.note !== input.note ||
      existing.createdBy !== adminEmail) return false;
  const posted = await db.prepare(`
    SELECT variant_id AS variantId, qty_diff AS qtyDiff
    FROM inventory_movements WHERE document_id = ?
  `).bind(input.documentId).all<{ variantId: string; qtyDiff: number }>();
  const expected = new Map(input.lines.map((line) => [line.variantId,
    input.operationType === "decrease" ? -line.quantity : line.quantity]));
  const rows = posted.results ?? [];
  return rows.length === expected.size && rows.every(
    (row) => expected.get(row.variantId) === row.qtyDiff,
  );
}

export async function postInventoryDocument(request: Request, adminEmail: string) {
  let input: InventoryDocumentInput;
  try {
    input = parseInput(await request.json());
  } catch (error) {
    return errorResponse(errorText(error), 400);
  }
  const db = await database();
  const previouslyPosted = await existingDocumentMatches(db, input, adminEmail);
  if (previouslyPosted === true) {
    return successResponse("Inventory document was already posted. No duplicate stock movement was made.", {
      id: input.documentId, operationType: input.operationType,
      reference: input.reference, lineCount: input.lines.length,
    });
  }
  if (previouslyPosted === false) {
    return errorResponse("This inventory document identifier is already in use. Start a new document.", 400);
  }
  const variantIds = input.lines.map((line) => line.variantId);
  const placeholders = variantIds.map(() => "?").join(",");
  const current = await db.prepare(`
    SELECT v.id, v.stock, p.name AS productName, v.name AS variantName, v.sku
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id IN (${placeholders}) AND v.deleted_at IS NULL AND p.deleted_at IS NULL
  `).bind(...variantIds).all<StockRow>();
  const stockById = new Map((current.results ?? []).map((item) => [item.id, item]));
  for (const line of input.lines) {
    const variant = stockById.get(line.variantId);
    if (!variant) return errorResponse("A selected product/variant is no longer available. Refresh the selection.", 400);
    if (input.operationType === "decrease" && line.quantity > variant.stock) {
      return errorResponse(`Cannot decrease ${variant.productName} / ${variant.variantName} by ${line.quantity}: only ${variant.stock} units are available.`, 400);
    }
    if (input.operationType !== "decrease" && variant.stock + line.quantity > 2_147_483_647) {
      return errorResponse(`The stock total for ${variant.productName} would be too large.`, 400);
    }
  }

  // D1.batch is an atomic SQLite transaction. Each UPDATE is immediately
  // followed by an INSERT guarded by changes() from that UPDATE. If another
  // request modified stock after our read, the update affects zero rows and
  // the NULL/NOT-NULL constraint aborts the entire batch, including invoice.
  const id = input.documentId;
  const statements: D1PreparedStatement[] = [
    db.prepare(`INSERT INTO inventory_documents
      (id, operation_type, reference, note, created_by) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, input.operationType, input.reference, input.note, adminEmail),
  ];
  for (const line of input.lines) {
    const snapshot = stockById.get(line.variantId)!;
    const diff = input.operationType === "decrease" ? -line.quantity : line.quantity;
    const next = snapshot.stock + diff;
    statements.push(db.prepare(`
      UPDATE product_variants SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND stock = ? AND deleted_at IS NULL AND stock + ? >= 0
        AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.deleted_at IS NULL)
    `).bind(diff, line.variantId, snapshot.stock, diff));
    statements.push(db.prepare(`
      INSERT INTO inventory_movements
        (id, variant_id, movement_type, previous_qty, new_qty, qty_diff, note, document_id)
      VALUES (?, ?, ?, ?, CASE WHEN changes() = 1 THEN ? ELSE NULL END, ?, ?, ?)
    `).bind(
      `mov_${crypto.randomUUID()}`, line.variantId,
      input.operationType === "purchase" ? "purchase" : "adjustment",
      snapshot.stock, next, diff, input.note, id,
    ));
  }
  try {
    await db.batch(statements);
    return successResponse(`Inventory ${input.operationType} posted successfully.`, {
      id, operationType: input.operationType,
      reference: input.reference, lineCount: input.lines.length,
    });
  } catch (error) {
    const message = errorText(error);
    if (/UNIQUE constraint failed.*inventory_documents\.id|UNIQUE constraint failed: inventory_documents\.id/i.test(message)) {
      // Another request with the same ID may have committed while this one
      // was reading stock. Verify contents after the rejected INSERT.
      const same = await existingDocumentMatches(db, input, adminEmail);
      if (same === true) {
        return successResponse("Inventory document was already posted. No duplicate stock movement was made.", {
          id, operationType: input.operationType,
          reference: input.reference, lineCount: input.lines.length,
        });
      }
      return errorResponse("This inventory document identifier is already in use. Start a new document.", 400);
    }
    if (/UNIQUE constraint failed.*inventory_documents|inventory_documents_purchase_reference_unique/i.test(message)) {
      return errorResponse("This purchase invoice/reference already exists. Enter a different reference.", 400);
    }
    if (/NOT NULL constraint failed: inventory_movements.new_qty|CHECK constraint failed: inventory_movements|FOREIGN KEY constraint failed/i.test(message)) {
      return errorResponse("Stock changed while you were preparing this document. No changes were saved. Refresh the selected products and review their quantities.", 400);
    }
    console.error("Inventory D1 batch failure:", error);
    return serverError("inventory posting", error);
  }
}
