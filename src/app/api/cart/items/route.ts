import {
  addCartItem,
  cartIdentity,
  cartNoStore,
  cartResponse,
  parseCartJson,
  requireSameOrigin,
} from "@/lib/cart/server";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await cartIdentity();
    await addCartItem(user, await parseCartJson(request));
    return Response.json(
      { success: true, message: "Added to cart." },
      { status: 201, headers: cartNoStore },
    );
  } catch (error) {
    return cartResponse(error);
  }
}
