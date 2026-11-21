import {
  actor,
  bodyJson,
  changeStatus,
  orderErrorResponse,
  parseStatus,
  privateHeaders,
  sameOrigin,
} from "@/lib/orders/server";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderId: string }> };
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    sameOrigin(request);
    const admin = await actor("admin");
    const input = parseStatus(await bodyJson(request));
    return Response.json(
      {
        success: true,
        data: await changeStatus(
          admin,
          (await params).orderId,
          input.status,
          input.reason,
        ),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return orderErrorResponse(e);
  }
}
