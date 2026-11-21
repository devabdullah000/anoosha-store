"use client";
import type {
  OrderInfo,
  OrderSource,
  OrderQuote,
  OrderStatus,
  PlaceOrderBody,
} from "./types";
export class OrderApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OrderApiError";
  }
}
async function json<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let result: { success?: boolean; message?: string; data?: T };
  try {
    result = (await res.json()) as typeof result;
  } catch {
    throw new OrderApiError(res.status, "Unable to read the server response.");
  }
  if (!res.ok || !result.success || result.data === undefined)
    throw new OrderApiError(
      res.status,
      result.message || "Unable to process the request.",
    );
  return result.data;
}
export const placeOrder = (request: PlaceOrderBody) =>
  json<{ id: string; orderNumber: string }>("/api/orders", "POST", request);
export const quoteDirect = (source: OrderSource) =>
  json<OrderQuote>("/api/orders/quote", "POST", source);
export const cancelOrder = (id: string, reason: string) =>
  json<{ id: string; status: OrderStatus }>(
    `/api/orders/${encodeURIComponent(id)}/cancel`,
    "POST",
    { reason },
  );
export const updateOrderStatus = (
  id: string,
  status: OrderStatus,
  reason?: string,
) =>
  json<{ id: string; status: OrderStatus }>(
    `/api/admin/orders/${encodeURIComponent(id)}/status`,
    "PATCH",
    { status, reason },
  );
export const getOrder = (id: string) =>
  json<OrderInfo>(`/api/orders/${encodeURIComponent(id)}`, "GET");
