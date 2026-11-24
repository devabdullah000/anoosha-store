"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuCheck,
  LuLoaderCircle,
  LuShoppingCart,
  LuX,
} from "react-icons/lu";

import type {
  ProductCardModel,
  StoreProduct,
  StoreVariant,
  VariantAttribute,
} from "@/lib/storefront/types";
import {
  attributeChoices,
  categoryHref,
  descriptionPreview,
  productHref,
} from "@/lib/storefront/utils";
import {
  addToCart,
  announceCartChanged,
  CartApiError,
} from "@/lib/cart/client";
import type { CartMutation } from "@/lib/cart/types";

import Price from "./price";
import css from "./storefront.module.css";
import ResilientImage from "./resilient-image";
import NotificationPopup, {
  type NotificationVariant,
} from "./notification-popup";

type Notice = {
  title: string;
  description: string;
  variant: NotificationVariant;
};

type ProductApiResponse = {
  success: boolean;
  message?: string;
  data?: StoreProduct;
};

/**
 * The public listing deliberately contains only one representative variant.
 * Retrieve the rest on demand, using the existing public product-details API.
 */
export default function ProductCard({
  product,
}: {
  product: ProductCardModel;
}) {
  const router = useRouter();
  // Metadata comes from the same storefront query as the effective price.
  const promotionName = product.appliedPromotionName;
  const [busy, setBusy] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullProduct, setFullProduct] = useState<StoreProduct | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  // Card purchases are exactly one unit. Therefore each required dropdown has
  // exactly one selection; multi-option orders can be configured on details.
  const [choices, setChoices] = useState<Record<string, string>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const requestInFlight = useRef(false);

  const href = productHref(product.productId);
  const preview = descriptionPreview(
    product.shortDescription,
    product.description,
  );
  const hasMultipleVariants = product.hasVariants && product.variantCount > 1;
  const selectedVariant = fullProduct?.variants.find(
    (variant) => variant.id === activeVariantId,
  );
  const selectedPromotionName = selectedVariant?.appliedPromotionName;
  const requiredDropdowns =
    selectedVariant?.attributes.filter(
      (attribute) => attribute.displayType === "dropdown",
    ) ?? [];

  const closeNotice = useCallback(() => setNotice(null), []);
  const closePicker = useCallback(() => {
    if (busy) return;
    setPickerOpen(false);
    setActiveVariantId(null);
    setChoices({});
  }, [busy]);

  useEffect(() => {
    if (!pickerOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) closePicker();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [pickerOpen, busy, closePicker]);

  const notify = (
    title: string,
    description: string,
    variant: NotificationVariant = "error",
  ) => setNotice({ title, description, variant });

  async function openPicker(preferVariantId?: string) {
    if (busy || loadingVariants) return;
    setPickerOpen(true);
    setLoadingVariants(true);
    setFullProduct(null);
    setChoices({});
    setActiveVariantId(null);

    try {
      const response = await fetch(
        `/api/storefront/products/${encodeURIComponent(product.productId)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const result = (await response.json()) as ProductApiResponse;
      if (!response.ok || !result.success || !result.data?.variants?.length) {
        throw new Error(
          result.message ?? "Available variants could not be loaded.",
        );
      }
      setFullProduct(result.data);
      if (preferVariantId) {
        const preferred = result.data.variants.find(
          (v) => v.id === preferVariantId,
        );
        if (preferred) setActiveVariantId(preferred.id);
      }
    } catch (error) {
      setPickerOpen(false);
      notify(
        "Unable to load variants",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoadingVariants(false);
    }
  }

  const selectionError = (error: CartApiError) =>
    error.status === 409 &&
    /provide selections|choose at least|dropdown attributes?/i.test(
      error.message,
    );

  async function addVariant(
    variantId: string,
    attributes: CartMutation["attributes"],
    variantName?: string,
  ) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      // This is the actual authenticated POST /api/cart/items call.
      // The API verifies user role, stock, ownership and dropdown selections.
      await addToCart({ variantId, quantity: 1, attributes });
      announceCartChanged();
      setPickerOpen(false);
      setActiveVariantId(null);
      setChoices({});
      notify(
        "Added to cart",
        `${product.name}${hasMultipleVariants && variantName ? ` — ${variantName}` : ""} was added to your cart.`,
        "success",
      );
    } catch (error) {
      if (error instanceof CartApiError && error.status === 401) {
        setPickerOpen(false);
        router.push("/login");
        return;
      }
      if (error instanceof CartApiError && error.status === 403) {
        setPickerOpen(false);
        notify(
          "Customer accounts only",
          "Administrator accounts cannot use the shopping cart.",
          "info",
        );
        return;
      }
      // An unconfigured single-variant card first attempts the fast POST.
      // Open the chooser only if the API reports required dropdown fields.
      if (error instanceof CartApiError && selectionError(error)) {
        requestInFlight.current = false;
        setBusy(false);
        await openPicker(variantId);
        return;
      }
      notify(
        "Unable to add item",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  function chooseVariant(variant: StoreVariant) {
    if (busy || variant.stock < 1) return;
    const dropdowns = variant.attributes.filter(
      (attribute) => attribute.displayType === "dropdown",
    );
    if (dropdowns.length === 0) {
      void addVariant(variant.id, [], variant.name);
      return;
    }
    setActiveVariantId(variant.id);
    setChoices({});
  }

  function addWithChoices() {
    if (!selectedVariant || busy) return;
    const attributes: CartMutation["attributes"] = [];

    for (const attribute of requiredDropdowns) {
      const value = choices[attribute.id];
      const choice = attributeChoices(attribute).find(
        (item) => item.label === value,
      );
      if (!value || !choice) {
        notify(
          "Choose your options",
          `Please select one ${attribute.name.toLowerCase()} option.`,
          "info",
        );
        return;
      }
      if (choice.quantity === 0) {
        notify("Option unavailable", `${value} is currently unavailable.`);
        return;
      }
      attributes.push({ attributeId: attribute.id, values: [value] });
    }
    void addVariant(selectedVariant.id, attributes, selectedVariant.name);
  }

  const handleAddClick = () => {
    if (busy || loadingVariants) return;
    if (hasMultipleVariants) {
      void openPicker();
      return;
    }
    if (product.stock < 1) {
      notify("Out of stock", "This product is currently unavailable.", "info");
      return;
    }
    void addVariant(product.representativeVariantId, []);
  };

  const picker =
    pickerOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closePicker();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`cart-variant-title-${product.productId}`}
              className="max-h-[min(90vh,780px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl"
            >
              <div className="rounded-[15px] bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-indigo-600">
                      Add to cart
                    </p>
                    <h2
                      id={`cart-variant-title-${product.productId}`}
                      className="mt-1 text-xl font-black tracking-tight text-slate-950"
                    >
                      {product.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeVariantId
                        ? "Choose the required options"
                        : "Choose a product variant"}
                    </p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label="Close variant chooser"
                    disabled={busy}
                    onClick={closePicker}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                  >
                    <LuX className="h-5 w-5" />
                  </button>
                </div>

                {loadingVariants ? (
                  <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-600">
                    <LuLoaderCircle className="h-5 w-5 animate-spin" />
                    Loading current variants...
                  </div>
                ) : selectedVariant ? (
                  <div className="mt-6 space-y-4">
                    {hasMultipleVariants && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveVariantId(null);
                          setChoices({});
                        }}
                        disabled={busy}
                        className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 hover:underline disabled:opacity-50"
                      >
                        <LuArrowLeft className="h-4 w-4" /> All variants
                      </button>
                    )}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-extrabold text-slate-900">
                          {selectedVariant.name}
                        </span>
                        <Price
                          salePrice={selectedVariant.salePrice}
                          hasDiscount={selectedVariant.hasDiscount}
                          discountPercentage={
                            selectedVariant.discountPercentage
                          }
                          compact
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedVariant.stock} unit
                        {selectedVariant.stock === 1 ? "" : "s"} available
                      </p>
                    </div>

                    {selectedPromotionName && (
                      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                        {selectedPromotionName} ·{" "}
                        {selectedVariant.discountPercentage}% promotional
                        discount
                      </p>
                    )}
                    {requiredDropdowns.map((attribute: VariantAttribute) => (
                      <div key={attribute.id}>
                        <label
                          htmlFor={`card-${product.productId}-${attribute.id}`}
                          className="mb-2 block text-xs font-bold text-slate-700"
                        >
                          {attribute.name}{" "}
                          <span className="text-rose-600">*</span>
                        </label>
                        <select
                          id={`card-${product.productId}-${attribute.id}`}
                          value={choices[attribute.id] ?? ""}
                          disabled={busy}
                          onChange={(event) =>
                            setChoices((previous) => ({
                              ...previous,
                              [attribute.id]: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">
                            Select {attribute.name.toLowerCase()}
                          </option>
                          {attributeChoices(attribute).map((choice) => (
                            <option
                              key={choice.label}
                              value={choice.label}
                              disabled={choice.quantity === 0}
                            >
                              {choice.label}
                              {attribute.unit ? ` ${attribute.unit}` : ""}
                              {choice.quantity === 0 ? " — unavailable" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={busy || selectedVariant.stock < 1}
                      onClick={addWithChoices}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-4 text-sm font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LuShoppingCart className="h-4 w-4" />
                      {busy ? "Adding..." : "Add selected variant"}
                    </button>
                    <Link
                      href={`${href}?variant=${encodeURIComponent(selectedVariant.id)}`}
                      className="block text-center text-xs font-semibold text-indigo-700 hover:underline"
                      prefetch={false}
                    >
                      Configure more options on product details
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2.5">
                    {fullProduct?.variants.map((variant) => (
                      <button
                        type="button"
                        key={variant.id}
                        disabled={busy || variant.stock < 1}
                        onClick={() => chooseVariant(variant)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold text-slate-900">
                            {variant.name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {variant.stock > 0
                              ? `${variant.stock} available`
                              : "Out of stock"}
                            {variant.attributes.some(
                              (a) => a.displayType === "dropdown",
                            )
                              ? " · Options required"
                              : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          {variant.appliedPromotionName && (
                            <span className="mb-1 block text-[10px] font-bold text-emerald-700">
                              Promotion applied
                            </span>
                          )}
                          <Price
                            salePrice={variant.salePrice}
                            hasDiscount={variant.hasDiscount}
                            discountPercentage={variant.discountPercentage}
                            compact
                          />
                          {busy ? (
                            <LuLoaderCircle className="ml-auto mt-1 h-4 w-4 animate-spin text-indigo-600" />
                          ) : (
                            <LuCheck className="ml-auto mt-1 h-4 w-4 text-indigo-500" />
                          )}
                        </span>
                      </button>
                    ))}
                    {fullProduct?.variants.length === 0 && (
                      <p className="py-8 text-center text-sm text-slate-500">
                        No available variants found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="group h-full rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(15,23,42,0.10)]">
        <article
          className={`${css.card} flex h-full flex-col overflow-hidden rounded-[15px] bg-white`}
        >
          <Link
            href={href}
            prefetch={false}
            className="relative block aspect-[1.12/1] overflow-hidden bg-gradient-to-br from-[#f3f5fc] via-[#fbfaff] to-[#eaf7ff]"
            aria-label={`View ${product.name}`}
          >
            <ResilientImage
              src={product.imageUrl}
              fallbackSrc={product.fallbackImageUrl ?? undefined}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain p-5 transition-transform duration-700 group-hover:scale-[1.075]"
            />
            {promotionName && (
              <span
                className="absolute left-3 top-3 max-w-[70%] truncate rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm"
                title={promotionName}
              >
                {promotionName} · {product.discountPercentage}% off
              </span>
            )}
            <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition duration-300 group-hover:rotate-45 group-hover:text-indigo-700">
              <LuArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
          <div className="flex flex-1 flex-col p-4 sm:p-5">
            <Link
              href={href}
              prefetch={false}
              className="text-[15px] font-extrabold leading-snug tracking-tight text-slate-950 transition hover:text-indigo-600 sm:text-base"
            >
              {product.name}
            </Link>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link
                href={categoryHref(product.categoryId)}
                prefetch={false}
                className="rounded-md border border-indigo-100 bg-indigo-50/70 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                {product.categoryName}
              </Link>
              {product.hasVariants && (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
                  {product.variantCount}{" "}
                  {product.variantCount === 1 ? "variant" : "variants"}
                </span>
              )}
            </div>
            <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500 sm:text-[13px]">
              {preview.text}
              {preview.truncated && (
                <Link
                  href={href}
                  className="ml-1 font-bold text-indigo-600 hover:underline"
                  prefetch={false}
                >
                  See more
                </Link>
              )}
            </p>
            <div className="mt-auto border-t border-slate-100 pt-4">
              <Price
                salePrice={product.salePrice}
                hasDiscount={product.hasDiscount}
                discountPercentage={product.discountPercentage}
                compact
              />
            </div>
            <button
              type="button"
              onClick={handleAddClick}
              disabled={
                busy ||
                loadingVariants ||
                (!hasMultipleVariants && product.stock < 1)
              }
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy || loadingVariants ? (
                <LuLoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LuShoppingCart className="h-4 w-4" />
              )}
              {busy
                ? "Adding..."
                : loadingVariants
                  ? "Loading variants..."
                  : !hasMultipleVariants && product.stock < 1
                    ? "Out of stock"
                    : hasMultipleVariants
                      ? "Choose variant"
                      : "Add to cart"}
            </button>
          </div>
        </article>
      </div>
      {picker}
      <NotificationPopup
        open={!!notice}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        variant={notice?.variant ?? "info"}
        onClose={closeNotice}
      />
    </>
  );
}
