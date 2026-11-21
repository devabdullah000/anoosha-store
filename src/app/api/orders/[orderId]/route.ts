import {
  actor,
  orderDetails,
  orderErrorResponse,
  privateHeaders,
} from "@/lib/orders/server";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderId: string }> };
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const user = await actor("user");
    return Response.json(
      { success: true, data: await orderDetails(user, (await params).orderId) },
      { headers: privateHeaders },
    );
  } catch (e) {
    return orderErrorResponse(e);
  }
}
