import "server-only";

import {
  and,
  asc,
  count,
  eq,
  like,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "../../db/index";
import {
  attributes,
  variantAttributes,
} from "../../db/product-schema";
import { requireAdminServer } from "../auth/require-admin-server";
import {
  successResponse,
  errorResponse,
  serverError,
} from "./api-response";

type AttributeValueType = "text" | "number" | "boolean" | "color";
type AttributeDisplayType = "dropdown" | "button" | "color";

type AttributeRecord = {
  id: string;
  name: string;
  valueType: string;
  unit: string | null;
  displayType: string;
  createdAt: string;
  updatedAt: string;
};

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function readRequestBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();

    return isObject(body) ? body : null;
  } catch {
    return null;
  }
}

function validateName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim();

  if (!name || name.length > 120) return null;

  return name;
}

function validateValueType(
  value: unknown,
): AttributeValueType | null {
  if (
    value === "text" ||
    value === "number" ||
    value === "boolean" ||
    value === "color"
  ) {
    return value;
  }

  return null;
}

function validateDisplayType(
  value: unknown,
): AttributeDisplayType | null {
  if (
    value === "dropdown" ||
    value === "button" ||
    value === "color"
  ) {
    return value;
  }

  return null;
}

// undefined means the provided value is invalid.
// null means the optional unit should be cleared.
function validateUnit(value: unknown): string | null | undefined {
  if (value === null) return null;

  if (typeof value !== "string") return undefined;

  const unit = value.trim();

  return unit || null;
}

function isUniqueConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);

  return (
    /UNIQUE constraint failed/i.test(message) ||
    /attributes_name_unique/i.test(message)
  );
}

function isForeignKeyConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);

  return /FOREIGN KEY constraint failed/i.test(message);
}

function attributeInUseResponse(variantCount: number) {
  return errorResponse(
    `This attribute is assigned to ${variantCount} product variant${
      variantCount === 1 ? "" : "s"
    }. Remove this attribute from ${
      variantCount === 1 ? "that variant" : "those variants"
    } before deleting it.`,
  );
}

async function findAttribute(
  id: string,
): Promise<AttributeRecord | undefined> {
  const db = getDb();

  const rows = await db
    .select({
      id: attributes.id,
      name: attributes.name,
      valueType: attributes.valueType,
      unit: attributes.unit,
      displayType: attributes.displayType,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    })
    .from(attributes)
    .where(eq(attributes.id, id))
    .limit(1);

  return rows[0];
}

async function findDuplicateName(
  name: string,
  excludingId?: string,
): Promise<boolean> {
  const db = getDb();

  const normalizedName = name.toLowerCase();

  const condition = excludingId
    ? and(
        sql`lower(${attributes.name}) = ${normalizedName}`,
        ne(attributes.id, excludingId),
      )
    : sql`lower(${attributes.name}) = ${normalizedName}`;

  const rows = await db
    .select({
      id: attributes.id,
    })
    .from(attributes)
    .where(condition)
    .limit(1);

  return rows.length > 0;
}

async function countAttributeVariants(
  attributeId: string,
): Promise<number> {
  const db = getDb();

  const rows = await db
    .select({
      total: count(),
    })
    .from(variantAttributes)
    .where(eq(variantAttributes.attributeId, attributeId));

  return Number(rows[0]?.total ?? 0);
}

/* -------------------------------------------------------
   GET /api/attributes

   Public attribute listing with prefix search + pagination.
------------------------------------------------------- */

export async function getAttributes(searchParams: URLSearchParams) {
  try {
    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");

    const page =
      rawPage === null
        ? 1
        : /^[1-9]\d*$/.test(rawPage)
          ? Number(rawPage)
          : NaN;

    const limit =
      rawLimit === null
        ? 10
        : /^[1-9]\d*$/.test(rawLimit)
          ? Number(rawLimit)
          : NaN;

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return errorResponse(
        "Invalid pagination parameters. Page must be positive and limit must be between 1 and 100.",
      );
    }

    const rawSearch = searchParams.get("search") ?? "";

    if (rawSearch.length > 80) {
      return errorResponse("Search text cannot exceed 80 characters.");
    }

    // Prefix search across the attribute's text fields.
    // Remove LIKE wildcards so user input cannot change the pattern.
    const search = rawSearch
      .trim()
      .toLowerCase()
      .replace(/[%_]/g, "");

    const condition = search
      ? or(
          like(sql`lower(${attributes.name})`, `${search}%`),
          like(sql`lower(${attributes.valueType})`, `${search}%`),
          like(
            sql`lower(coalesce(${attributes.unit}, ''))`,
            `${search}%`,
          ),
          like(sql`lower(${attributes.displayType})`, `${search}%`),
        )
      : undefined;

    const db = getDb();

    const countRows = await db
      .select({
        total: count(),
      })
      .from(attributes)
      .where(condition);

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    // Resolve a stale page if records have been deleted.
    const resolvedPage =
      totalPages === 0 ? 1 : Math.min(page, totalPages);

    const offset = (resolvedPage - 1) * limit;

    const rows = await db
      .select({
        id: attributes.id,
        name: attributes.name,
        valueType: attributes.valueType,
        unit: attributes.unit,
        displayType: attributes.displayType,
        createdAt: attributes.createdAt,
        updatedAt: attributes.updatedAt,
      })
      .from(attributes)
      .where(condition)
      .orderBy(asc(attributes.name))
      .limit(limit)
      .offset(offset);

    const data: AttributeRecord[] = rows;

    return successResponse(
      "Attributes retrieved successfully.",
      data,
      {
        pagination: {
          page: resolvedPage,
          limit,
          total,
          totalPages,
          hasNextPage: resolvedPage < totalPages,
          hasPreviousPage: resolvedPage > 1,
        },
      },
    );
  } catch (error) {
    return serverError("attributes list", error);
  }
}

/* -------------------------------------------------------
   POST /api/attributes

   Admin-only attribute creation.
------------------------------------------------------- */

export async function createAttribute(request: Request) {
  try {
    const authorization = await requireAdminServer();

    if (!authorization.authorized) {
      return authorization.response;
    }

    const body = await readRequestBody(request);

    if (!body) {
      return errorResponse("Invalid request body.");
    }

    const name = validateName(body.name);
    const valueType = validateValueType(body.valueType);
    const displayType = validateDisplayType(body.displayType);

    const unit =
      body.unit === undefined ? null : validateUnit(body.unit);

    if (!name) {
      return errorResponse(
        "Attribute name is required and must not exceed 120 characters.",
      );
    }

    if (!valueType) {
      return errorResponse(
        "Value type must be text, number, boolean, or color.",
      );
    }

    if (!displayType) {
      return errorResponse(
        "Display type must be dropdown, button, or color.",
      );
    }

    if (unit === undefined) {
      return errorResponse("Unit must be text or null.");
    }

    if (await findDuplicateName(name)) {
      return errorResponse(
        "An attribute with this name already exists.",
      );
    }

    const db = getDb();

    const id = `attr_${crypto.randomUUID()}`;

    await db.insert(attributes).values({
      id,
      name,
      valueType,
      unit,
      displayType,
    });

    const createdAttribute = await findAttribute(id);

    if (!createdAttribute) {
      return serverError(
        "attribute create retrieval",
        new Error("Created attribute could not be retrieved."),
      );
    }

    return successResponse(
      "Attribute created successfully.",
      createdAttribute,
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(
        "An attribute with this name already exists.",
      );
    }

    return serverError("attribute create", error);
  }
}

/* -------------------------------------------------------
   PATCH /api/attributes

   Admin-only attribute update.
------------------------------------------------------- */

export async function updateAttribute(request: Request) {
  try {
    const authorization = await requireAdminServer();

    if (!authorization.authorized) {
      return authorization.response;
    }

    const body = await readRequestBody(request);

    if (!body) {
      return errorResponse("Invalid request body.");
    }

    const id =
      typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return errorResponse("A valid attribute ID is required.");
    }

    const name = validateName(body.name);
    const valueType = validateValueType(body.valueType);
    const displayType = validateDisplayType(body.displayType);

    if (!name) {
      return errorResponse(
        "Attribute name is required and must not exceed 120 characters.",
      );
    }

    if (!valueType) {
      return errorResponse(
        "Value type must be text, number, boolean, or color.",
      );
    }

    if (!displayType) {
      return errorResponse(
        "Display type must be dropdown, button, or color.",
      );
    }

    const existingAttribute = await findAttribute(id);

    if (!existingAttribute) {
      return errorResponse("Attribute not found.");
    }

    // If unit is omitted, preserve its existing value.
    // An empty string or null explicitly clears it.
    const unit =
      body.unit === undefined
        ? existingAttribute.unit
        : validateUnit(body.unit);

    if (unit === undefined) {
      return errorResponse("Unit must be text or null.");
    }

    if (await findDuplicateName(name, id)) {
      return errorResponse(
        "Another attribute already uses this name.",
      );
    }

    const db = getDb();

    const updatedRows = await db
      .update(attributes)
      .set({
        name,
        valueType,
        unit,
        displayType,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(attributes.id, id))
      .returning({
        id: attributes.id,
      });

    if (updatedRows.length === 0) {
      return errorResponse("Attribute not found.");
    }

    const updatedAttribute = await findAttribute(id);

    if (!updatedAttribute) {
      return serverError(
        "attribute update retrieval",
        new Error("Updated attribute could not be retrieved."),
      );
    }

    return successResponse(
      "Attribute updated successfully.",
      updatedAttribute,
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(
        "Another attribute already uses this name.",
      );
    }

    return serverError("attribute update", error);
  }
}

/* -------------------------------------------------------
   DELETE /api/attributes?id=...

   Admin-only deletion. An attribute cannot be deleted
   while it is assigned to one or more product variants.
------------------------------------------------------- */

export async function deleteAttribute(searchParams: URLSearchParams) {
  try {
    const authorization = await requireAdminServer();

    if (!authorization.authorized) {
      return authorization.response;
    }

    const id = searchParams.get("id")?.trim();

    if (!id) {
      return errorResponse("A valid attribute ID is required.");
    }

    const existingAttribute = await findAttribute(id);

    if (!existingAttribute) {
      return errorResponse("Attribute not found.");
    }

    const variantCount = await countAttributeVariants(id);

    if (variantCount > 0) {
      return attributeInUseResponse(variantCount);
    }

    const db = getDb();

    // The NOT EXISTS condition makes the relationship check and
    // deletion part of one SQL statement. It also protects against
    // an assignment being added after the initial count check.
    const deletedRows = await db
      .delete(attributes)
      .where(
        and(
          eq(attributes.id, id),
          sql`NOT EXISTS (
            SELECT 1
            FROM ${variantAttributes}
            WHERE ${variantAttributes.attributeId} = ${attributes.id}
          )`,
        ),
      )
      .returning({
        id: attributes.id,
      });

    if (deletedRows.length === 0) {
      const currentAttribute = await findAttribute(id);

      if (!currentAttribute) {
        return errorResponse("Attribute not found.");
      }

      const currentVariantCount = await countAttributeVariants(id);

      if (currentVariantCount > 0) {
        return attributeInUseResponse(currentVariantCount);
      }

      return errorResponse(
        "The attribute could not be deleted. Please try again.",
      );
    }

    return successResponse(
      "Attribute deleted successfully.",
      {
        id,
      },
    );
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return errorResponse(
        "This attribute is assigned to product variants. Remove those assignments before deleting it.",
      );
    }

    return serverError("attribute delete", error);
  }
}