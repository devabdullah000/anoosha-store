import { requireAdminServer } from "@/lib/auth/require-admin-server";
import { getProducts, createProduct } from "../../../../lib/server/products";
import { serverError, errorResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    return getProducts(new URL(request.url).searchParams, true);
  } catch (error) {
    return serverError("products admin list", error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    return createProduct(request);
  } catch (error) {
    return serverError("products admin create authorization", error);
  }
}

// Preserve the project convention: unsupported HTTP methods are HTTP 400.
export function PATCH() {
  return errorResponse("Unsupported operation for this endpoint.");
}
export function DELETE() {
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
