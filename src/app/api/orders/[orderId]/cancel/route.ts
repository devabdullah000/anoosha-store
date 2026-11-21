import {
  actor,
  bodyJson,
  changeStatus,
  orderErrorResponse,
  parseCancellation,
  privateHeaders,
  sameOrigin,
} from "@/lib/orders/server";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderId: string }> };
export async function POST(request: Request, { params }: Ctx) {
  try {
    sameOrigin(request);
    const user = await actor("user");
    const reason = parseCancellation(await bodyJson(request));
    return Response.json(
      {
        success: true,
        data: await changeStatus(
          user,
          (await params).orderId,
          "cancelled",
          reason,
        ),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return orderErrorResponse(e);
  }
}
