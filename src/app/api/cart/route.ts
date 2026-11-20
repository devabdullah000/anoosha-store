import { cartIdentity, cartNoStore, cartResponse, loadCart } from "@/lib/cart/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await cartIdentity();
    return Response.json({ success: true, data: await loadCart(user) }, { headers: cartNoStore });
  } catch (error) {
    return cartResponse(error);
  }
}
