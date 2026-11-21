import {
  actor,
  bodyJson,
  orderErrorResponse,
  orderList,
  parsePlaceOrder,
  placeOrder,
  privateHeaders,
  sameOrigin,
} from "@/lib/orders/server";

export const dynamic = "force-dynamic";

// Customer order history
export async function GET(request: Request) {
  try {
    const user = await actor("user");

    const page = Number(new URL(request.url).searchParams.get("page") || "1");

    return Response.json(
      {
        success: true,
        data: await orderList(user, page),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return orderErrorResponse(error);
  }
}

// Customer order placement
export async function POST(request: Request) {
  try {
    sameOrigin(request);

    const user = await actor("user");

    const input = parsePlaceOrder(await bodyJson(request));

    const result = await placeOrder(user, input);

    return Response.json(
      {
        success: true,
        data: result,
      },
      {
        status: 201,
        headers: privateHeaders,
      },
    );
  } catch (error) {
    return orderErrorResponse(error);
  }
}
