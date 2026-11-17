import { getProduct } from "../../../../lib/server/products";
import { serverError, errorResponse } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return getProduct(id, false);
  } catch (error) {
    return serverError("products public detail", error);
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
