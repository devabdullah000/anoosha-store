"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuMinus,
  LuPackage,
  LuPlus,
  LuRefreshCw,
  LuShoppingBag,
  LuTrash2,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import {
  announceCartChanged,
  CartApiError,
  editCartItem,
  getCart,
  removeCartItem,
} from "@/lib/cart/client";
import type { CartItem, CartPayload, CartSelection } from "@/lib/cart/types";
import { validateCartSelection } from "@/lib/cart/validation";
import { attributeChoices, money, productHref } from "@/lib/storefront/utils";
import NotificationPopup, {
  type NotificationVariant,
} from "@/components/storefront/notification-popup";
import ResilientImage from "@/components/storefront/resilient-image";

type Notice = {
  title: string;
  description: string;
  variant: NotificationVariant;
};
const gradientBorder =
  "rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]";

export default function CartClient({
  initialCart,
}: {
  initialCart: CartPayload;
}) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<CartItem | null>(null);
  const [deleting, setDeleting] = useState<CartItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const lastRead = useRef(Date.now());
  const requestRunning = useRef(false);

  const closeNotice = useCallback(() => setNotice(null), []);
  const notify = useCallback(
    (
      description: string,
      variant: NotificationVariant = "error",
      title = "Cart update",
    ) => {
      setNotice({ description, variant, title });
    },
    [],
  );

  const handleAccessError = useCallback(
    (failure: unknown): boolean => {
      if (!(failure instanceof CartApiError)) return false;
      if (failure.status === 401) {
        setCart({
          items: [],
          totalQuantity: 0,
          subtotalPaisa: 0,
          checkoutReady: false,
        });
        router.replace("/login");
        return true;
      }
      if (failure.status === 403) {
        setCart({
          items: [],
          totalQuantity: 0,
          subtotalPaisa: 0,
          checkoutReady: false,
        });
        router.replace("/admin/dashboard");
        return true;
      }
      return false;
    },
    [router],
  );

  const refresh = useCallback(async () => {
    if (requestRunning.current) return;
    requestRunning.current = true;
    setRefreshing(true);
    try {
      const response = await getCart();
      setCart(response);
      setError(null);
      lastRead.current = Date.now();
    } catch (failure) {
      if (!handleAccessError(failure)) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to retrieve current cart availability.",
        );
      }
    } finally {
      requestRunning.current = false;
      setRefreshing(false);
    }
  }, [handleAccessError]);

  // SSR supplied initialCart: DO NOT issue another GET on hydration.
  // Refresh only after returning to an older tab; successful local mutations
  // explicitly refresh once and notify the navbar through CART_UPDATED_EVENT.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRead.current > 60_000
      ) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  const openEditor = (item: CartItem) => {
    setEditing(item);
    setDeleting(null);
    setQuantity(item.quantity);
    setChosen(
      Object.fromEntries(
        item.selections.map((selection) => [
          selection.attributeId,
          [...selection.values],
        ]),
      ),
    );
  };

  const selections: CartSelection[] = useMemo(
    () =>
      editing?.attributes
        .filter((attribute) => attribute.displayType === "dropdown")
        .map((attribute) => ({
          attributeId: attribute.id,
          values: chosen[attribute.id] ?? [],
        })) ?? [],
    [editing, chosen],
  );

  const validation = editing
    ? validateCartSelection(
        quantity,
        selections,
        editing.attributes,
        editing.stock,
      )
    : null;

  const addOption = (attributeId: string, label: string) => {
    if (!label) return;
    setChosen((previous) => {
      const existing = previous[attributeId] ?? [];
      return existing.includes(label)
        ? previous
        : { ...previous, [attributeId]: [...existing, label] };
    });
  };

  const removeOption = (attributeId: string, label: string) => {
    setChosen((previous) => ({
      ...previous,
      [attributeId]: (previous[attributeId] ?? []).filter(
        (value) => value !== label,
      ),
    }));
  };

  const save = async () => {
    if (!editing || busyId) return;
    // Strict frontend validation before ANY mutation request.
    const checked = validateCartSelection(
      quantity,
      selections,
      editing.attributes,
      editing.stock,
    );
    if (!checked.ok) {
      notify(checked.message, "error", "Check selected options");
      return;
    }
    setBusyId(editing.id);
    try {
      await editCartItem(editing.id, quantity, checked.normalized);
      setEditing(null);
      notify(
        "Quantity and selected options were updated.",
        "success",
        "Cart updated",
      );
      await refresh();
      announceCartChanged();
    } catch (failure) {
      if (!handleAccessError(failure)) {
        notify(
          failure instanceof Error
            ? failure.message
            : "Unable to update the item.",
        );
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    if (!deleting || busyId) return;
    setBusyId(deleting.id);
    try {
      await removeCartItem(deleting.id);
      setDeleting(null);
      setEditing(null);
      notify(
        "The selected variant was removed from your cart.",
        "success",
        "Item removed",
      );
      await refresh();
      announceCartChanged();
    } catch (failure) {
      if (!handleAccessError(failure)) {
        notify(
          failure instanceof Error
            ? failure.message
            : "Unable to remove the item.",
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const modalVisible = editing !== null || deleting !== null;
  useEffect(() => {
    if (!modalVisible) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyId) {
        setEditing(null);
        setDeleting(null);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [modalVisible, busyId]);

  return (
    <>
      <main className="min-h-[68vh] bg-[radial-gradient(ellipse_at_top_left,#fff2fb_0%,#fff_36%,#f1f9ff_110%)] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <div className="mx-auto max-w-[1300px]">
          <nav
            aria-label="Breadcrumb"
            className="mb-7 flex items-center gap-2 text-xs font-semibold text-slate-500"
          >
            <Link href="/" className="hover:text-indigo-600" prefetch={false}>
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900">Cart</span>
          </nav>

          <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]">
                Your shopping cart
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Review your selections and live availability. Adding to cart
                does not reserve stock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing || busyId !== null}
              className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <LuRefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh stock & price"}
            </button>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <LuTriangleAlert className="mt-0.5 shrink-0" />
              <p>
                {error} Displayed availability may be outdated; refresh before
                making changes.
              </p>
            </div>
          )}

          {cart.items.length === 0 ? (
            <div className={`${gradientBorder} mx-auto max-w-xl`}>
              <div className="rounded-[15px] bg-white px-6 py-14 text-center sm:px-10">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-indigo-50 text-indigo-600">
                  <LuShoppingBag className="h-10 w-10" />
                </div>
                <h2 className="mt-6 text-2xl font-black text-slate-950">
                  Your cart is empty
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Explore accessories and add the products you love.
                </p>
                <Link
                  href="/shop"
                  className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-6 text-sm font-extrabold text-white shadow-md"
                  prefetch={false}
                >
                  Continue shopping <LuArrowRight />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-9">
              <section aria-label="Cart items" className="min-w-0 space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className={gradientBorder}>
                    <article className="flex min-w-0 flex-col gap-5 rounded-[15px] bg-white p-4 sm:flex-row sm:p-5">
                      <div className="h-48 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#f3f5fc] via-[#fbfaff] to-[#eaf7ff] sm:h-40 sm:w-40">
                        <ResilientImage
                          src={item.imageUrl}
                          fallbackSrc={item.fallbackImageUrl}
                          alt={item.productName}
                          loading="lazy"
                          className="h-full w-full object-contain p-4"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            {item.productId ? (
                              <Link
                                href={productHref(item.productId)}
                                className="break-words text-base font-black leading-snug text-slate-950 hover:text-indigo-600 sm:text-lg"
                                prefetch={false}
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              <h3 className="text-base font-black text-slate-950">
                                {item.productName}
                              </h3>
                            )}
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Variant: {item.variantName}
                            </p>
                            {item.sku && (
                              <p className="mt-1 break-all text-[11px] text-slate-400">
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-base font-black text-indigo-700">
                            {money(item.unitPricePaisa * item.quantity)}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">
                            {money(item.unitPricePaisa)} / unit
                          </span>
                          {item.discountPercentage > 0 && (
                            <span
                              className={`rounded-lg px-2.5 py-1.5 ${item.appliedPromotionName ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                            >
                              {item.appliedPromotionName
                                ? `${item.appliedPromotionName} · ${item.discountPercentage}% promotion`
                                : `${item.discountPercentage}% individual discount`}
                            </span>
                          )}
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-indigo-700">
                            Quantity: {item.quantity}
                          </span>
                          <span
                            className={`rounded-lg px-2.5 py-1.5 ${item.stock > 0 && item.available ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                          >
                            {item.available
                              ? `${item.stock} currently in stock`
                              : "Unavailable"}
                          </span>
                        </div>

                        {item.discountPercentage > 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            Original unit price:{" "}
                            <span className="line-through">
                              {money(item.originalUnitPricePaisa)}
                            </span>
                            {item.appliedPromotionName
                              ? " · Individual discount is not combined with the promotion."
                              : ""}
                          </p>
                        )}
                        {item.priceChanged && (
                          <p className="mt-3 text-xs font-semibold text-amber-700">
                            Price changed since addition: previous unit price{" "}
                            {money(item.previousUnitPricePaisa)}.
                          </p>
                        )}

                        {item.attributes.filter(
                          (attribute) => attribute.displayType === "dropdown",
                        ).length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                            {item.attributes
                              .filter(
                                (attribute) =>
                                  attribute.displayType === "dropdown",
                              )
                              .map((attribute) => (
                                <p
                                  key={attribute.id}
                                  className="text-xs text-slate-600"
                                >
                                  <span className="font-extrabold text-slate-700">
                                    {attribute.name}:
                                  </span>{" "}
                                  {item.selections
                                    .find(
                                      (selection) =>
                                        selection.attributeId === attribute.id,
                                    )
                                    ?.values.join(", ") || "Not selected"}
                                </p>
                              ))}
                          </div>
                        )}

                        {item.issues.map((issue) => (
                          <p
                            role="alert"
                            key={issue}
                            className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"
                          >
                            <LuTriangleAlert className="mr-1 inline h-4 w-4" />
                            {issue}
                          </p>
                        ))}

                        <div className="mt-auto flex flex-wrap gap-2 pt-5">
                          <button
                            type="button"
                            onClick={() => openEditor(item)}
                            disabled={
                              busyId !== null || !item.available || !!error
                            }
                            className="min-h-10 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Modify quantity & options
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(null);
                              setDeleting(item);
                            }}
                            disabled={busyId !== null}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <LuTrash2 /> Remove
                          </button>
                          {item.productId && item.canAddAnotherVariant && (
                            <Link
                              href={productHref(item.productId)}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-indigo-700 hover:bg-indigo-50"
                              prefetch={false}
                            >
                              Add another variant <LuArrowRight />
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 py-3 text-sm font-bold text-indigo-700 hover:underline"
                  prefetch={false}
                >
                  <LuArrowLeft /> Continue shopping
                </Link>
              </section>

              <aside
                className={`${gradientBorder} lg:sticky lg:top-28`}
                aria-label="Cart summary"
              >
                <div className="rounded-[15px] bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                      <LuPackage className="h-5 w-5" />
                    </span>
                    <h2 className="text-lg font-black text-slate-950">
                      Order summary
                    </h2>
                  </div>
                  <div className="mt-6 flex justify-between gap-4 text-sm text-slate-600">
                    <span>Total pieces</span>
                    <strong className="text-slate-900">
                      {cart.totalQuantity}
                    </strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-4 text-sm text-slate-600">
                    <span>Variants in cart</span>
                    <strong className="text-slate-900">
                      {cart.items.length}
                    </strong>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5 text-base font-black text-slate-950">
                    <span>Current subtotal</span>
                    <span>{money(cart.subtotalPaisa)}</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Excludes shipping fees. Prices and stock may change before
                    order confirmation.
                  </p>
                  <div
                    className={`mt-5 flex items-start gap-2 rounded-xl p-3 text-xs font-semibold leading-5 ${cart.checkoutReady ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  >
                    {cart.checkoutReady ? (
                      <LuCheck className="mt-0.5 shrink-0" />
                    ) : (
                      <LuTriangleAlert className="mt-0.5 shrink-0" />
                    )}
                    <p>
                      {cart.checkoutReady
                        ? "All selections satisfy current availability."
                        : "Some items need attention before checkout."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      !cart.items.length ||
                      !cart.checkoutReady ||
                      busyId !== null ||
                      refreshing ||
                      !!error
                    }
                    onClick={() => router.push("/checkout")}
                    className="mt-5 min-h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-4 text-sm font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Checkout · Cash on delivery
                  </button>
                  <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                    Prices and stock are revalidated atomically when you place
                    the order.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyId)
              setEditing(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-editor-title"
            className={`${gradientBorder} max-h-[92vh] w-full max-w-xl`}
          >
            <div className="max-h-[calc(92vh-2px)] overflow-y-auto rounded-[15px] bg-white p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="cart-editor-title"
                    className="text-xl font-black text-slate-950"
                  >
                    Modify cart item
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {editing.productName} · {editing.variantName}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close editor"
                  disabled={!!busyId}
                  onClick={() => setEditing(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <LuX />
                </button>
              </div>

              <label
                htmlFor="cart-edit-quantity"
                className="mt-6 block text-xs font-black uppercase tracking-[.13em] text-slate-600"
              >
                Quantity
              </label>
              <div className="mt-2 inline-flex h-12 max-w-full items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1 || !!busyId}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="grid h-12 w-12 place-items-center hover:bg-slate-50 disabled:opacity-30"
                >
                  <LuMinus />
                </button>
                <input
                  id="cart-edit-quantity"
                  type="number"
                  min={1}
                  max={Math.min(99, editing.stock)}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="h-12 w-16 border-x border-slate-100 text-center text-sm font-extrabold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= Math.min(99, editing.stock) || !!busyId}
                  onClick={() =>
                    setQuantity((value) =>
                      Math.min(Math.min(99, editing.stock), value + 1),
                    )
                  }
                  className="grid h-12 w-12 place-items-center hover:bg-slate-50 disabled:opacity-30"
                >
                  <LuPlus />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {editing.stock} currently available. Max cart quantity: 99.
              </p>

              {editing.attributes
                .filter((attribute) => attribute.displayType === "dropdown")
                .map((attribute) => {
                  const values = chosen[attribute.id] ?? [];
                  const options = attributeChoices(attribute);
                  return (
                    <div key={attribute.id} className="mt-6">
                      <label
                        htmlFor={`cart-choice-${attribute.id}`}
                        className="mb-2 block text-sm font-extrabold text-slate-800"
                      >
                        {attribute.name}{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id={`cart-choice-${attribute.id}`}
                        value=""
                        disabled={!!busyId}
                        onChange={(event) =>
                          addOption(attribute.id, event.target.value)
                        }
                        className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">
                          Add {attribute.name.toLowerCase()} option
                        </option>
                        {options.map((option) => (
                          <option
                            key={option.label}
                            value={option.label}
                            disabled={
                              option.quantity === 0 ||
                              values.includes(option.label)
                            }
                          >
                            {option.label}
                            {attribute.unit ? ` ${attribute.unit}` : ""}
                            {option.quantity === 0 ? " — unavailable" : ""}
                          </option>
                        ))}
                      </select>
                      {values.length > 0 && (
                        <div
                          className="mt-2 flex flex-wrap gap-2"
                          aria-label={`Selected ${attribute.name}`}
                        >
                          {values.map((label) => (
                            <button
                              type="button"
                              key={label}
                              disabled={!!busyId}
                              aria-label={`Remove ${label}`}
                              onClick={() => removeOption(attribute.id, label)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              {label} <LuX className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-[11px] leading-5 text-slate-500">
                        Select at least one option. Different options selected
                        for this attribute cannot exceed quantity.
                      </p>
                    </div>
                  );
                })}

              {validation && !validation.ok && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"
                >
                  {validation.message}
                </p>
              )}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={!!busyId}
                  onClick={() => setEditing(null)}
                  className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busyId || !!error}
                  onClick={() => void save()}
                  className="min-h-12 flex-1 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-4 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  {busyId ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyId)
              setDeleting(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cart-delete-title"
            className={`${gradientBorder} w-full max-w-md`}
          >
            <div className="rounded-[15px] bg-white p-6 sm:p-8">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600">
                <LuTrash2 className="h-6 w-6" />
              </div>
              <h2
                id="cart-delete-title"
                className="mt-4 text-xl font-black text-slate-950"
              >
                Remove this variant?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {deleting.productName} — {deleting.variantName} will be removed
                from your cart. Product inventory will not change.
              </p>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={!!busyId}
                  onClick={() => setDeleting(null)}
                  className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold"
                >
                  Keep item
                </button>
                <button
                  type="button"
                  disabled={!!busyId}
                  onClick={() => void confirmRemove()}
                  className="min-h-12 flex-1 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busyId ? "Removing..." : "Remove variant"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <NotificationPopup
        open={notice !== null}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        variant={notice?.variant ?? "info"}
        onClose={closeNotice}
      />
    </>
  );
}
