import { getProducts } from "../../../lib/server/products";
import { serverError, errorResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return getProducts(new URL(request.url).searchParams, false);
  } catch (error) {
    return serverError("products public list", error);
  }
}

// Preserve the project convention: unsupported HTTP methods are HTTP 400.
export function POST() {
  return errorResponse("Unsupported operation for this endpoint.");
}
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
