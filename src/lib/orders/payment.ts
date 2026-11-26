
import {
  EASYPAISA_NUMBER,
  JAZZCASH_NUMBER,
} from "@/lib/constants";

export const PAYMENT_METHODS = [
  "cod",
  "easypaisa",
  "jazzcash",
] as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  string
> = {
  cod: "Cash on delivery",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
};

export function isPaymentMethod(
  value: unknown,
): value is PaymentMethod {
  return (
    value === "cod" ||
    value === "easypaisa" ||
    value === "jazzcash"
  );
}

/**
 * Returns the receiving number corresponding to
 * the selected payment method.
 *
 * Duplicate numbers are allowed because the
 * same phone number may be registered with
 * both wallet services.
 */
export function paymentAccountNumber(
  method: PaymentMethod,
): string | null {
  switch (method) {
    case "easypaisa":
      return EASYPAISA_NUMBER.trim() || null;

    case "jazzcash":
      return JAZZCASH_NUMBER.trim() || null;

    case "cod":
      return null;
  }
}

/**
 * Payment methods are available without
 * payment-gateway integration.
 */
export function paymentMethodAvailable(
  method: PaymentMethod,
): boolean {
  return isPaymentMethod(method);
}
