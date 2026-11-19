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
import { categories } from "../../db/product-schema";
import { requireAdminServer } from "../auth/require-admin-server";
import { successResponse,errorResponse,serverError} from "./api-response";
import type { CategoryRecord } from "./server-types";

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

function validateDescription(
  value: unknown,
): string | null | undefined {
  // undefined means invalid; null means an optional empty description.
  if (value === undefined || value === null) return null;

  if (typeof value !== "string") return undefined;

  const description = value.trim();

  if (description.length > 1000) return undefined;

  return description || null;
}

function isUniqueConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);

  return (
    /UNIQUE constraint failed/i.test(message) ||
    /categories_name_unique/i.test(message)
  );
}

function isForeignKeyConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);

  return /FOREIGN KEY constraint failed/i.test(message);
}

function categoryInUseResponse(productCount: number) {
  return errorResponse(
    `This category contains ${productCount} product${
      productCount === 1 ? "" : "s"
    }. Remove or reassign ${
      productCount === 1 ? "this product" : "these products"
    } before deleting the category.`,
  );
}

async function findCategory(
  id: string,
): Promise<CategoryRecord | undefined> {
  const db = getDb();

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      productCount: categories.productCount,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  const category = rows[0];

  if (!category) return undefined;

  return {
    ...category,
    productCount: Number(category.productCount ?? 0),
  };
}

async function findDuplicateName(
  name: string,
  excludingId?: string,
): Promise<boolean> {
  const db = getDb();

  const normalizedName = name.toLowerCase();

  const condition = excludingId
    ? and(
        sql`lower(${categories.name}) = ${normalizedName}`,
        ne(categories.id, excludingId),
      )
    : sql`lower(${categories.name}) = ${normalizedName}`;

  const rows = await db
    .select({
      id: categories.id,
    })
    .from(categories)
    .where(condition)
    .limit(1);

  return rows.length > 0;
}

/* -------------------------------------------------------
   GET /api/categories

   Public category listing with prefix search + pagination.
------------------------------------------------------- */

export async function getCategories(searchParams: URLSearchParams) {
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

    // Prefix search. Removing SQL LIKE wildcards prevents user input
    // from changing the intended search pattern.
    const search = rawSearch
      .trim()
      .toLowerCase()
      .replace(/[%_]/g, "");

    const condition = search
      ? or(
          like(sql`lower(${categories.name})`, `${search}%`),
          like(
            sql`lower(coalesce(${categories.description}, ''))`,
            `${search}%`,
          ),
        )
      : undefined;

    const db = getDb();

    const countRows = await db
      .select({
        total: count(),
      })
      .from(categories)
      .where(condition);

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    // If a deletion makes the requested page invalid, move to
    // the last available page rather than returning a blank page.
    const resolvedPage =
      totalPages === 0 ? 1 : Math.min(page, totalPages);

    const offset = (resolvedPage - 1) * limit;

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        productCount: categories.productCount,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .where(condition)
      .orderBy(asc(categories.name))
      .limit(limit)
      .offset(offset);

    const data: CategoryRecord[] = rows.map((row) => ({
      ...row,
      productCount: Number(row.productCount ?? 0),
    }));

    return successResponse(
      "Categories retrieved successfully.",
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
    return serverError("list", error);
  }
}

/* -------------------------------------------------------
   POST /api/categories

   Admin-only category creation.
------------------------------------------------------- */

export async function createCategory(request: Request) {
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
    const description = validateDescription(body.description);

    if (!name) {
      return errorResponse(
        "Category name is required and must not exceed 120 characters.",
      );
    }

    if (description === undefined) {
      return errorResponse(
        "Description must be text and cannot exceed 1000 characters.",
      );
    }

    if (await findDuplicateName(name)) {
      return errorResponse(
        "A category with this name already exists.",
      );
    }

    const db = getDb();

    const id = `cat_${crypto.randomUUID()}`;

    await db.insert(categories).values({
      id,
      name,
      description,
      productCount: 0,
    });

    const createdCategory = await findCategory(id);

    if (!createdCategory) {
      return errorResponse(
        "Category was created but could not be retrieved.",
        500,
      );
    }

    return successResponse(
      "Category created successfully.",
      createdCategory,
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(
        "A category with this name already exists.",
      );
    }

    return serverError("create", error);
  }
}

/* -------------------------------------------------------
   PATCH /api/categories

   Admin-only category update.
------------------------------------------------------- */

export async function updateCategory(request: Request) {
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
      return errorResponse("A valid category ID is required.");
    }

    const name = validateName(body.name);

    if (!name) {
      return errorResponse(
        "Category name is required and must not exceed 120 characters.",
      );
    }

    const db = getDb();
    const existingCategory = await findCategory(id);

    if (!existingCategory) {
      return errorResponse("Category not found.");
    }

    // If description is omitted, preserve the existing value.
    const description =
      body.description === undefined
        ? existingCategory.description
        : validateDescription(body.description);

    if (description === undefined) {
      return errorResponse(
        "Description must be text and cannot exceed 1000 characters.",
      );
    }

    if (await findDuplicateName(name, id)) {
      return errorResponse(
        "Another category already uses this name.",
      );
    }

    await db
      .update(categories)
      .set({
        name,
        description,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(categories.id, id));

    const updatedCategory = await findCategory(id);

    if (!updatedCategory) {
      return errorResponse("Category not found after update.");
    }

    return successResponse(
      "Category updated successfully.",
      updatedCategory,
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(
        "Another category already uses this name.",
      );
    }

    return serverError("update", error);
  }
}

/* -------------------------------------------------------
   DELETE /api/categories?id=...

   Admin-only deletion. A category can only be deleted
   when product_count is exactly zero.
------------------------------------------------------- */

export async function deleteCategory(searchParams: URLSearchParams) {
  try {
    const authorization = await requireAdminServer();

    if (!authorization.authorized) {
      return authorization.response;
    }

    const id = searchParams.get("id")?.trim();

    if (!id) {
      return errorResponse("A valid category ID is required.");
    }

    const db = getDb();

    const existingCategory = await findCategory(id);

    if (!existingCategory) {
      return errorResponse("Category not found.");
    }

    if (existingCategory.productCount > 0) {
      return categoryInUseResponse(
        existingCategory.productCount,
      );
    }

    // The product_count = 0 condition makes the check and delete
    // part of one database statement. This protects against a
    // product being associated with the category between checks.
    const deletedRows = await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.productCount, 0),
        ),
      )
      .returning({
        id: categories.id,
      });

    if (deletedRows.length === 0) {
      // Re-read to determine whether the category became occupied
      // while the delete request was running.
      const currentCategory = await findCategory(id);

      if (!currentCategory) {
        return errorResponse("Category not found.");
      }

      if (currentCategory.productCount > 0) {
        return categoryInUseResponse(
          currentCategory.productCount,
        );
      }

      return errorResponse(
        "The category could not be deleted. Please try again.",
      );
    }

    return successResponse(
      "Category deleted successfully.",
      {
        id,
      },
    );
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return errorResponse(
        "This category is associated with products. Remove or reassign its products before deleting it.",
      );
    }

    return serverError("delete", error);
  }
}