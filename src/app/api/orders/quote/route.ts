import {
  actor,
  bodyJson,
  orderErrorResponse,
  privateHeaders,
  quote,
  sameOrigin,
} from "@/lib/orders/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await actor("user");
    const input = await bodyJson(request);
    if (
      !input ||
      typeof input !== "object" ||
      (input as { mode?: string }).mode !== "direct"
    )
      return Response.json(
        { success: false, message: "Direct item required." },
        { status: 400, headers: privateHeaders },
      );
    const src = input as {
      mode: "direct";
      item: {
        variantId: string;
        quantity: number;
        attributes: { attributeId: string; values: string[] }[];
      };
    };
    // No client-supplied price is ever trusted; the DB-backed validator checks quantity and options.
    if (
      !src.item ||
      typeof src.item.variantId !== "string" ||
      !Number.isSafeInteger(src.item.quantity) ||
      src.item.quantity < 1 ||
      src.item.quantity > 99 ||
      !Array.isArray(src.item.attributes)
    )
      return Response.json(
        { success: false, message: "Invalid item." },
        { status: 400, headers: privateHeaders },
      );
    return Response.json(
      { success: true, data: await quote(user, src) },
      { headers: privateHeaders },
    );
  } catch (e) {
    return orderErrorResponse(e);
  }
}
