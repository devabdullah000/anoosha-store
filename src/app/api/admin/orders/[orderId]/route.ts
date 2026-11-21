import {
  actor,
  orderDetails,
  orderErrorResponse,
  privateHeaders,
} from "@/lib/orders/server";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderId: string }> };
export async function GET(_r: Request, { params }: Ctx) {
  try {
    const admin = await actor("admin");
    return Response.json(
      {
        success: true,
        data: await orderDetails(admin, (await params).orderId),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return orderErrorResponse(e);
  }
}
