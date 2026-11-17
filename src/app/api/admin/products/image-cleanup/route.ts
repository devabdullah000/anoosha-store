import { requireAdminServer } from "@/lib/auth/require-admin-server";
import { errorResponse, serverError, successResponse } from "@/lib/server/api-response";
import {
  imageEnvironment,
  requireImagePurgeConfig,
  retryPendingImageCleanup,
  ImageConfigurationError,
} from "@/lib/server/product-images";

export const dynamic = "force-dynamic";

/** On-demand, idempotent retry of durable post-commit R2/CDN cleanup jobs. */
export async function POST() {
  try {
    const admin = await requireAdminServer();
    if (!admin.authorized) return admin.response;
    requireImagePurgeConfig(await imageEnvironment());
    const result = await retryPendingImageCleanup(100);
    return successResponse(
      result.pending
        ? "Image cleanup ran; some tasks remain pending."
        : "Pending image cleanup processed successfully.",
      { completed: result.completed, pending: result.pending },
      result.warnings.length ? { warnings: result.warnings } : undefined,
    );
  } catch (error) {
    if (error instanceof ImageConfigurationError) return errorResponse(error.message, 500);
    return serverError("products image cleanup retry", error);
  }
}

export function GET() {
  return errorResponse("Unsupported operation for this endpoint.");
}
