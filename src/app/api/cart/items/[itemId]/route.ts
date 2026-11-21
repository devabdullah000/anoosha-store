import {
  cartIdentity,
  cartNoStore,
  cartResponse,
  deleteCartItem,
  parseCartJson,
  requireSameOrigin,
  updateCartItem,
} from "@/lib/cart/server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await cartIdentity();
    await updateCartItem(
      user,
      (await context.params).itemId,
      await parseCartJson(request),
    );
    return Response.json(
      { success: true, message: "Cart updated." },
      { headers: cartNoStore },
    );
  } catch (error) {
    return cartResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await cartIdentity();
    await deleteCartItem(user, (await context.params).itemId);
    return Response.json(
      { success: true, message: "Item removed." },
      { headers: cartNoStore },
    );
  } catch (error) {
    return cartResponse(error);
  }
}
