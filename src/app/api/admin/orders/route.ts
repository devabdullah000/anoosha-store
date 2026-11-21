import {
  actor,
  orderErrorResponse,
  orderList,
  privateHeaders,
} from "@/lib/orders/server";
import type { OrderStatus } from "@/lib/orders/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = await actor("admin");
    const q = new URL(request.url).searchParams;
    const raw = q.get("status");
    const allowed = ["pending", "processing", "delivered", "cancelled"];
    const status =
      raw && allowed.includes(raw) ? (raw as OrderStatus) : undefined;
    return Response.json(
      {
        success: true,
        data: await orderList(admin, Number(q.get("page") || 1), status),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return orderErrorResponse(e);
  }
}
