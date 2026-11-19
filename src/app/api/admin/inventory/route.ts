import { requireAdminServer } from "@/lib/auth/require-admin-server";
import { errorResponse, serverError } from "@/lib/server/api-response";
import {
  getInventoryHistory,
  postInventoryDocument,
} from "../../../../lib/server/inventory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    return await getInventoryHistory(new URL(request.url).searchParams);
  } catch (error) {
    return serverError("inventory report", error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    return await postInventoryDocument(request, admin.user.email);
  } catch (error) {
    return serverError("inventory post", error);
  }
}

export function PATCH() {
  return errorResponse("Inventory history cannot be updated.");
}
export function PUT() {
  return errorResponse("Inventory history cannot be updated.");
}
export function DELETE() {
  return errorResponse("Inventory history cannot be deleted.");
}

export function OPTIONS() {
  return errorResponse("Unsupported inventory operation.", 400);
}
export function HEAD() {
  return errorResponse("Unsupported inventory operation.", 400);
}
