import { requireAdminServer } from "@/lib/auth/require-admin-server";
import { getProduct, updateProduct, deleteProduct } from "../../../../../lib/server/products";
import { serverError, errorResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    const { id } = await context.params;
    return getProduct(id, true);
  } catch (error) {
    return serverError("products admin detail", error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    const { id } = await context.params;
    return updateProduct(id, request);
  } catch (error) {
    return serverError("products admin update authorization", error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    const { id } = await context.params;
    return deleteProduct(id);
  } catch (error) {
    return serverError("products admin delete authorization", error);
  }
}

// Preserve the project convention: unsupported HTTP methods are HTTP 400.
export function POST() {
  return errorResponse("Unsupported operation for this endpoint.");
}
export function PUT() {
  return errorResponse("Unsupported operation for this endpoint.");
}
export function OPTIONS() {
  return errorResponse("Unsupported operation for this endpoint.");
}
export function HEAD() {
  return errorResponse("Unsupported operation for this endpoint.");
}
