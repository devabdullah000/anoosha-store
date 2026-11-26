"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuCheck,
  LuLoaderCircle,
  LuShoppingBag,
  LuShieldCheck,
  LuWallet,
} from "react-icons/lu";
import type { CartPayload } from "@/lib/cart/types";
import { money } from "@/lib/storefront/utils";
import { announceCartChanged, getCart } from "@/lib/cart/client";
import { placeOrder, quoteDirect, OrderApiError } from "@/lib/orders/client";
import { DIRECT_CHECKOUT_KEY } from "@/lib/orders/types";
import { normalizePakistanMobile } from "@/lib/orders/phone";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  paymentAccountNumber,
  paymentMethodAvailable,
} from "@/lib/orders/payment";
import type { PaymentMethod } from "@/lib/orders/payment";
import type {
  OrderQuote,
  OrderSource,
  ShippingDetails,
} from "@/lib/orders/types";
import NotificationPopup from "@/components/storefront/notification-popup";
const border =
  "rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]";
const input =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const initialShipping: ShippingDetails = {
  customerName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
};
export default function CheckoutClient({
  mode,
  initialCart,
  email,
}: {
  mode: "cart" | "direct";
  initialCart: CartPayload | null;
  email: string;
}) {
  const router = useRouter();
  const [shipping, setShipping] = useState(initialShipping);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [direct, setDirect] = useState<OrderSource | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  // The initial cart is rendered on the server; refresh it only on a 409 price change.
  const [currentCart, setCurrentCart] = useState<CartPayload | null>(
    initialCart,
  );
  const [loading, setLoading] = useState(mode === "direct");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const requestId = useRef<string>("");
  if (!requestId.current) requestId.current = crypto.randomUUID();
  useEffect(() => {
    if (mode !== "direct") return;
    let active = true;
    try {
      const raw = sessionStorage.getItem(DIRECT_CHECKOUT_KEY);
      if (!raw) {
        setNotice(
          "No product selection found. Return to a product and choose Order Now.",
        );
        setLoading(false);
        return;
      }
      const source = JSON.parse(raw) as OrderSource;
      if (source.mode !== "direct" || !source.item) {
        setNotice("Invalid direct-order selection.");
        setLoading(false);
        return;
      }
      setDirect(source);
      void quoteDirect(source)
        .then((q) => {
          if (active) setQuote(q);
        })
        .catch((e) => {
          if (active)
            setNotice(
              e instanceof Error
                ? e.message
                : "Unable to confirm availability.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch {
      setNotice("Unable to read your product selection.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [mode]);
  const cartReady =
    mode === "cart" && !!currentCart?.items.length && currentCart.checkoutReady;
  const lines =
    mode === "direct"
      ? (quote?.lines ?? [])
      : (currentCart?.items.map((i) => ({
          variantId: i.variantId,
          name: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          unitPaisa: i.unitPricePaisa,
          originalUnitPaisa: i.originalUnitPricePaisa,
          discountPercentage: i.discountPercentage,
          appliedPromotionName: i.appliedPromotionName,
          appliedPromotionId: i.appliedPromotionId,
          linePaisa: i.unitPricePaisa * i.quantity,
        })) ?? []);
  const subtotal =
    mode === "direct"
      ? (quote?.subtotalPaisa ?? 0)
      : (currentCart?.subtotalPaisa ?? 0);
  const ready = mode === "direct" ? !!direct && !!quote : cartReady;
  // Account numbers are display-only. They must not control whether the
  // customer can select a manual payment method.
  const receivingNumber =
    paymentMethod && paymentMethod !== "cod"
      ? paymentAccountNumber(paymentMethod)
      : null;
  function set(field: keyof ShippingDetails, value: string) {
    setShipping((s) => ({ ...s, [field]: value }));
  }
  async function confirm() {
    if (busy || !ready) return;
    if (!paymentMethod || !paymentMethodAvailable(paymentMethod)) {
      setNotice("Select an available payment method before placing your order.");
      return;
    }
    if (!normalizePakistanMobile(shipping.phone)) {
      setNotice(
        "Enter a Pakistani mobile number, e.g. 03001234567 or +923001234567.",
      );
      return;
    }
    if (
      !shipping.customerName.trim() ||
      shipping.addressLine1.trim().length < 8 ||
      !shipping.city.trim() ||
      !shipping.province.trim()
    ) {
      setNotice(
        "Enter your full name, complete house/street/area address, city and province before ordering.",
      );
      return;
    }
    if (!phoneConfirmed) {
      setNotice(
        "Please confirm that your mobile number is active and can receive delivery calls or SMS.",
      );
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const source: OrderSource =
        mode === "direct" ? direct! : { mode: "cart" };
      const receipt = await placeOrder({
        ...source,
        shipping,
        paymentMethod,
        idempotencyKey: requestId.current,
        expectedPrices: lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          unitPaisa: line.unitPaisa,
          discountPercentage: line.discountPercentage,
          appliedPromotionId: line.appliedPromotionId,
        })),
      });
      if (mode === "direct") sessionStorage.removeItem(DIRECT_CHECKOUT_KEY);
      else announceCartChanged();
      router.replace(`/orders/${encodeURIComponent(receipt.id)}`);
    } catch (e) {
      if (e instanceof OrderApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      if (e instanceof OrderApiError && e.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }
      if (e instanceof OrderApiError && e.status === 409) {
        try {
          // Only one extra Worker call on the failed/changed-price path.
          if (mode === "cart") {
            setCurrentCart(null);
            setCurrentCart(await getCart());
          } else if (direct) {
            setQuote(null);
            setQuote(await quoteDirect(direct));
          }
          requestId.current = crypto.randomUUID(); // New attempt after a confirmed conflict.
          setNotice(
            "A product, promotion, or price changed before order confirmation. Your displayed prices are refreshed. Review the totals and place the order again.",
          );
        } catch (refreshError) {
          setNotice(
            refreshError instanceof Error
              ? refreshError.message
              : "Prices changed. Please refresh checkout.",
          );
        }
        return;
      }
      setNotice(e instanceof Error ? e.message : "Unable to place order.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-[75vh] bg-[radial-gradient(ellipse_at_top_left,#fff2fb_0%,#fff_35%,#edf9ff_110%)] px-4 py-9 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1250px]">
        <Link
          href={mode === "cart" ? "/cart" : "/shop"}
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700"
        >
          <LuArrowLeft />
          Back to shopping
        </Link>
        <h1 className="mt-5 text-3xl font-black text-slate-950 sm:text-4xl">
          Secure checkout
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Select Cash on Delivery, Easypaisa, or JazzCash. Final stock and prices
          are verified when you place the order.
        </p>
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className={border}>
            <div className="rounded-[15px] bg-white p-5 sm:p-8">
              <h2 className="text-lg font-black text-slate-950">
                Delivery information
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Order confirmation will use {email}. Please provide accurate
                contact details.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Full name *
                  <input
                    className={input}
                    autoComplete="name"
                    maxLength={100}
                    value={shipping.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Active mobile number *
                  <input
                    className={input}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="03001234567"
                    maxLength={25}
                    value={shipping.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] font-normal text-slate-500">
                    Pakistan mobile: 03XXXXXXXXX or +923XXXXXXXXX
                  </span>
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  House / street / building, area and landmark *
                  <input
                    className={input}
                    autoComplete="street-address"
                    maxLength={200}
                    value={shipping.addressLine1}
                    onChange={(e) => set("addressLine1", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Apartment or additional instructions
                  <input
                    className={input}
                    maxLength={150}
                    value={shipping.addressLine2 ?? ""}
                    onChange={(e) => set("addressLine2", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  City *
                  <input
                    className={input}
                    autoComplete="address-level2"
                    maxLength={90}
                    value={shipping.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Province / Region *
                  <input
                    className={input}
                    autoComplete="address-level1"
                    maxLength={90}
                    value={shipping.province}
                    onChange={(e) => set("province", e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Postal code
                  <input
                    className={input}
                    autoComplete="postal-code"
                    maxLength={20}
                    value={shipping.postalCode ?? ""}
                    onChange={(e) => set("postalCode", e.target.value)}
                  />
                </label>
              </div>
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs font-medium leading-6 text-indigo-900">
                <input
                  type="checkbox"
                  checked={phoneConfirmed}
                  onChange={(e) => setPhoneConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                />
                I confirm that this mobile number is active and reachable for
                delivery calls or SMS. I understand that incorrect contact
                information can delay delivery.
              </label>
              <section aria-labelledby="checkout-payment-title" className="mt-6 border-t border-slate-100 pt-6">
                <h3 id="checkout-payment-title" className="flex items-center gap-2 text-base font-black text-slate-950">
                  <LuWallet aria-hidden="true" /> Payment method *
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select one method. Mobile wallet payments are not processed automatically on this website.
                </p>
                <div role="radiogroup" aria-label="Payment method" aria-required="true" className="mt-4 grid gap-3">
                  {PAYMENT_METHODS.map((method) => {
                    const available = paymentMethodAvailable(method);
                    return (
                      <label key={method} className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition ${paymentMethod === method ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700"} ${!available ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                        <input
                          type="radio"
                          name="checkout-payment-method"
                          value={method}
                          checked={paymentMethod === method}
                          disabled={!available || busy}
                          onChange={() => setPaymentMethod(method)}
                          className="h-4 w-4 shrink-0 accent-indigo-600"
                          required
                        />
                        <span>{PAYMENT_METHOD_LABELS[method]}</span>
                        {!available && <span className="ml-auto text-xs font-normal">Not configured</span>}
                      </label>
                    );
                  })}
                </div>
                {paymentMethod && paymentMethod !== "cod" && (
                  <div
                    className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
                    role="status"
                  >
                    <p className="font-extrabold">
                      {PAYMENT_METHOD_LABELS[paymentMethod]} receiving number
                    </p>
                    {receivingNumber ? (
                      <p className="mt-2 select-all break-all font-mono text-lg font-black tracking-wide">
                        {receivingNumber}
                      </p>
                    ) : (
                      <p className="mt-2 font-semibold text-amber-800">
                        Receiving number is not configured correctly yet.
                        Please contact support for verified transfer details
                        before making a payment.
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-5">
                      This is a manual transfer, not an online payment gateway.
                      Keep your transaction reference. Your order will remain
                      pending until our team independently confirms payment.
                      Contact support with your order number for verification.
                    </p>
                  </div>
                )}
                {!paymentMethod && (
                  <p className="mt-3 text-xs font-semibold text-amber-700">Please select a payment method to continue.</p>
                )}
                {paymentMethod === "cod" && (
                  <p className="mt-3 text-xs leading-5 text-slate-600">Pay the confirmed amount on delivery.</p>
                )}
              </section>
              <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                <LuShieldCheck className="mt-1 shrink-0" />
                Final stock, pricing and mobile number format are checked on the server.
                Phone ownership is not independently verified without SMS/voice OTP.
              </div>
            </div>
          </section>
          <aside className={`${border} lg:sticky lg:top-28`}>
            <div className="rounded-[15px] bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <LuShoppingBag /> Order summary
              </h2>
              {loading && (
                <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                  <LuLoaderCircle className="animate-spin" />
                  Checking prices and stock...
                </div>
              )}
              <div className="mt-5 divide-y divide-slate-100">
                {lines.map((line) => (
                  <div
                    key={line.variantId}
                    className="flex justify-between gap-4 py-3 text-xs"
                  >
                    <div>
                      <strong className="block text-slate-900">
                        {line.name}
                      </strong>
                      {line.appliedPromotionName && (
                        <span className="mt-1 block text-[11px] font-bold text-emerald-700">
                          {line.appliedPromotionName} ·{" "}
                          {line.discountPercentage}% promotion
                        </span>
                      )}
                      {!line.appliedPromotionName &&
                        line.discountPercentage > 0 && (
                          <span className="mt-1 block text-[11px] font-bold text-amber-700">
                            {line.discountPercentage}% individual discount
                          </span>
                        )}
                      {line.discountPercentage > 0 && (
                        <span className="block text-[11px] text-slate-400 line-through">
                          {money(line.originalUnitPaisa)} / unit
                        </span>
                      )}
                      <span className="text-slate-500">
                        {line.variantName} · {line.quantity} ×{" "}
                        {money(line.unitPaisa)}
                      </span>
                    </div>
                    <strong className="shrink-0 text-slate-900">
                      {money(line.linePaisa)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Shipping: {money(0)} (currently configured)
              </p>
              <div className="mt-4 flex justify-between gap-4 border-t pt-4 text-lg font-black">
                <span>Grand total</span>
                <span>{money(subtotal)}</span>
              </div>
              {!ready && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  {mode === "cart"
                    ? "Review your cart: one or more items are unavailable or need changes."
                    : "A valid direct-order quote is required."}
                </p>
              )}
              <button
                type="button"
                disabled={!ready || !paymentMethod || !paymentMethodAvailable(paymentMethod) || busy || loading}
                onClick={() => void confirm()}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <LuLoaderCircle className="animate-spin" />
                ) : (
                  <LuCheck />
                )}
                {busy ? "Placing order..." : "Place order"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
                By ordering, you agree to our{" "}
                <Link
                  href="/terms-and-conditions"
                  prefetch={false}
                  className="font-bold text-indigo-700"
                >
                  Terms & Conditions
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
      <NotificationPopup
        open={!!notice}
        title="Checkout"
        description={notice ?? ""}
        variant="error"
        onClose={() => setNotice(null)}
      />
    </main>
  );
}
