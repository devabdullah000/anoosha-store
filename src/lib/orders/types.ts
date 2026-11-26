import type { CartSelection } from "@/lib/cart/types";
import type { PaymentMethod } from "./payment";
export const DIRECT_CHECKOUT_KEY = "anoosha:direct-checkout";
export type OrderStatus = "pending" | "processing" | "delivered" | "cancelled";
export type ShippingDetails = {
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
};
export type OrderSource =
  | { mode: "cart" }
  | {
      mode: "direct";
      item: {
        variantId: string;
        quantity: number;
        attributes: CartSelection[];
      };
    };
export type ExpectedOrderPrice = {
  variantId: string;
  quantity: number;
  unitPaisa: number;
  discountPercentage: number;
  appliedPromotionId: string | null;
};
export type PlaceOrderBody = OrderSource & {
  shipping: ShippingDetails;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  /** Client-visible price expectation; the server must independently validate it. */
  expectedPrices?: ExpectedOrderPrice[];
};
export type OrderLine = {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  hasVariants: boolean;
  sku: string;
  quantity: number;
  imageKey: string | null;
  originalUnitPaisa: number;
  discountPercentage: number;
  appliedPromotionName?: string | null;
  finalUnitPaisa: number;
  grossPaisa: number;
  discountPaisa: number;
  netPaisa: number;
  selections: { attributeId: string; name: string; values: string[] }[];
};
export type OrderInfo = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  userEmail: string;
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  country: string;
  storeName: string;
  storeAddress: string;
  paymentMethod: PaymentMethod;
  grossPaisa: number;
  discountPaisa: number;
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  createdAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelDeadline: string;
  canCustomerCancel: boolean;
  items: OrderLine[];
  events?: Array<{
    id: string;
    previousStatus: string | null;
    nextStatus: OrderStatus;
    actorRole: string;
    note: string | null;
    createdAt: string;
  }>;
};
export type OrderListItem = Pick<
  OrderInfo,
  | "id"
  | "orderNumber"
  | "status"
  | "paymentMethod"
  | "totalPaisa"
  | "createdAt"
  | "customerName"
  | "userEmail"
  | "phone"
> & { canCustomerCancel: boolean };
export type QuoteLine = {
  variantId: string;
  originalUnitPaisa: number;
  discountPercentage: number;
  appliedPromotionName: string | null;
  appliedPromotionId: string | null;
  name: string;
  variantName: string;
  quantity: number;
  unitPaisa: number;
  linePaisa: number;
};
export type OrderQuote = {
  lines: QuoteLine[];
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
};
