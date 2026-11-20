import type { CartMutation, CartPayload } from "./types";

type ApiResult<T> = { success: boolean; message?: string; data?: T };
async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let data: ApiResult<T>;
  try {
    data = (await response.json()) as ApiResult<T>;
  } catch {
    throw new Error("The cart service returned an unexpected response.");
  }
  if (!response.ok || !data.success) {
    if (response.status === 401)
      throw new CartApiError(401, "Please sign in to use your cart.");
    throw new CartApiError(
      response.status,
      data.message ?? "Cart request failed.",
    );
  }
  return data.data as T;
}
export class CartApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const getCart = () => send<CartPayload>("/api/cart");
export const addToCart = (selection: CartMutation) =>
  send<void>("/api/cart/items", {
    method: "POST",
    body: JSON.stringify(selection),
  });
export const editCartItem = (
  itemId: string,
  quantity: number,
  attributes: CartMutation["attributes"],
) =>
  send<void>(`/api/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity, attributes }),
  });
export const removeCartItem = (itemId: string) =>
  send<void>(`/api/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
export const CART_UPDATED_EVENT = "anoosha:cart:updated";
export function announceCartChanged() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
