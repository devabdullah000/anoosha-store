import { requireAdminServer } from "@/lib/auth/require-admin-server";
import { errorResponse, serverError } from "@/lib/server/api-response";
import { getInventoryCatalog } from "../../../../../lib/server/inventory";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    return await getInventoryCatalog(new URL(request.url).searchParams);
  } catch (error) {
    return serverError("inventory catalog", error);
  }
}
export function POST() { return errorResponse("Unsupported inventory catalog operation."); }
export function PATCH() { return errorResponse("Unsupported inventory catalog operation."); }
export function DELETE() { return errorResponse("Unsupported inventory catalog operation."); }

export function PUT() { return errorResponse("Unsupported inventory catalog operation.", 400); }
export function OPTIONS() { return errorResponse("Unsupported inventory catalog operation.", 400); }
export function HEAD() { return errorResponse("Unsupported inventory catalog operation.", 400); }
