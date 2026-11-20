"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  addToCart,
  announceCartChanged,
  CartApiError,
} from "@/lib/cart/client";
import Link from "next/link";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuMinus,
  LuPlus,
  LuShoppingBag,
  LuShoppingCart,
  LuShieldCheck,
  LuX,
} from "react-icons/lu";

import type {
  AttributeSelection,
  PurchaseIntent,
  StoreProduct,
  VariantAttribute,
} from "@/lib/storefront/types";
import {
  HEADING_FOR_PRODUCT_DETAILS,
  ORDER_NOW_EVENT,
  PRODUCT_ADD_TO_CART_BUTTON_TEXT,
  PRODUCT_ATTRIBUTE_SELECT_DROPDOWN_TEXT,
  PRODUCT_DETAILS_DISCLAIMER,
  PRODUCT_ORDER_BUTTON_TEXT,
} from "@/lib/constants";
import {
  attributeChoices,
  categoryHref,
  pricePaisa,
} from "@/lib/storefront/utils";
import type { AttributeChoice } from "@/lib/storefront/types";
import Price from "./price";
import ResilientImage from "./resilient-image";
import NotificationPopup, {
  type NotificationVariant,
} from "./notification-popup";

export type ProductDetailClientProps = {
  product: StoreProduct;
  onAddToCart?: (intent: PurchaseIntent) => Promise<void> | void;
  onOrderNow?: (intent: PurchaseIntent) => Promise<void> | void;
};

type Notice = {
  title: string;
  description: string;
  variant: NotificationVariant;
};

/** Safe CSS swatches for color definitions supplied by the administrator. */
function colorStyle(
  value: string | null | undefined,
): CSSProperties | undefined {
  if (!value) return undefined;
  const color = value.trim();
  const hex = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const namedColors = new Set([
    "black",
    "white",
    "red",
    "blue",
    "green",
    "yellow",
    "pink",
    "purple",
    "orange",
    "gray",
    "grey",
    "silver",
    "gold",
    "brown",
    "navy",
    "teal",
    "aqua",
    "cyan",
    "magenta",
    "lime",
    "maroon",
    "olive",
    "coral",
    "indigo",
    "violet",
    "beige",
    "ivory",
    "tan",
    "salmon",
    "turquoise",
    "transparent",
  ]);
  const functional = /^(?:rgb|rgba|hsl|hsla)\([\d.,%\s/]+\)$/i;

  if (
    hex.test(color) ||
    namedColors.has(color.toLowerCase()) ||
    functional.test(color)
  ) {
    return { backgroundColor: color };
  }
  return undefined;
}

function informationalOptions(attribute: VariantAttribute): AttributeChoice[] {
  return attributeChoices(attribute);
}

export default function ProductDetailClient({
  product,
  onAddToCart,
  onOrderNow,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(
    product.variants.find((candidate) => candidate.isDefault)?.id ??
      product.variants[0]?.id ??
      "",
  );
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const requestInFlight = useRef(false);

  const closeNotice = useCallback(() => setNotice(null), []);

  // When the card links to ?variant=..., preselect that exact variant.
  // This runs after hydration, preserving the existing server-rendered page.
  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get(
      "variant",
    );
    if (!requestedId || !product.variants.some((v) => v.id === requestedId))
      return;
    setVariantId(requestedId);
    setSelected({});
    setQuantity(1);
    setImageIndex(0);
  }, [product.id, product.variants]);

  const variant =
    product.variants.find((candidate) => candidate.id === variantId) ??
    product.variants[0];
  const dropdowns =
    variant?.attributes.filter(
      (attribute) => attribute.displayType === "dropdown",
    ) ?? [];

  const notify = (
    description: string,
    variantType: NotificationVariant = "error",
    title = "Please check your selection",
  ) => setNotice({ title, description, variant: variantType });

  const pickVariant = (id: string) => {
    setVariantId(id);
    setSelected({});
    setQuantity(1);
    setImageIndex(0);
    setNotice(null);
  };

  const selectValue = (attribute: VariantAttribute, value: string) => {
    if (!value) return;

    const choice = attributeChoices(attribute).find(
      (candidate) => candidate.label === value,
    );
    if (!choice) {
      notify("This option is no longer available. Please select again.");
      return;
    }
    if (choice.quantity === 0) {
      notify(
        `${choice.label} is currently unavailable. Please choose another option.`,
      );
      return;
    }
    setSelected((previous) => {
      if ((previous[attribute.id] ?? []).includes(value)) return previous;
      return {
        ...previous,
        [attribute.id]: [...(previous[attribute.id] ?? []), value],
      };
    });
  };

  const removeValue = (attributeId: string, value: string) => {
    setSelected((previous) => ({
      ...previous,
      [attributeId]: (previous[attributeId] ?? []).filter(
        (candidate) => candidate !== value,
      ),
    }));
  };

  /**
   * Client-only checks. Cart and order handlers never run when invalid.
   * The final checkout API must independently revalidate price and inventory.
   */
  const validate = (): PurchaseIntent | null => {
    if (!variant) {
      notify("This product is currently unavailable.");
      return null;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      notify("Enter a valid quantity of at least one.");
      return null;
    }
    if (quantity > variant.stock) {
      notify(
        `Only ${variant.stock} unit${variant.stock === 1 ? "" : "s"} of this variant can be selected.`,
      );
      return null;
    }

    for (const attribute of dropdowns) {
      const values = selected[attribute.id] ?? [];
      const choices = attributeChoices(attribute);

      if (values.length === 0) {
        notify(
          `Please select at least one ${attribute.name.toLowerCase()} option.`,
        );
        return null;
      }
      if (values.length > quantity) {
        notify(
          `You selected ${values.length} ${attribute.name.toLowerCase()} options for quantity ${quantity}. Remove extra selections or increase the quantity.`,
        );
        return null;
      }
      if (new Set(values).size !== values.length) {
        notify(
          `Duplicate ${attribute.name.toLowerCase()} options are not allowed.`,
        );
        return null;
      }

      const selectedChoices = values.map((value) =>
        choices.find((choice) => choice.label === value),
      );
      if (selectedChoices.some((choice) => !choice || choice.quantity === 0)) {
        notify(
          `One of the selected ${attribute.name.toLowerCase()} options is unavailable.`,
        );
        return null;
      }

      // If every selected option has a quantity, ensure the selected choices
      // collectively have enough units for the requested variant quantity.
      // This is a feasibility check, not a per-option allocation.
      if (selectedChoices.every((choice) => choice?.quantity !== null)) {
        const available = selectedChoices.reduce(
          (sum, choice) => sum + (choice?.quantity ?? 0),
          0,
        );
        if (available < quantity) {
          notify(
            `Your selected ${attribute.name.toLowerCase()} options have ${available} unit${available === 1 ? "" : "s"} available in total. Reduce the quantity or choose more options.`,
          );
          return null;
        }
      }
    }

    const attributes: AttributeSelection[] = dropdowns.map((attribute) => ({
      attributeId: attribute.id,
      values: [...(selected[attribute.id] ?? [])],
    }));

    return {
      productId: product.id,
      variantId: variant.id,
      quantity,
      attributes,
    };
  };

  const submit = async (kind: "cart" | "order") => {
    if (requestInFlight.current || !variant) return;

    const intent = validate();
    if (!intent) return;

    if (kind === "order") {
      // Debugging/integration payload; no personally identifying information.
      console.log("[Anoosha Store] Order Now selection:", {
        ...intent,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        unitPricePaisa: pricePaisa(variant),
        selectedDropdowns: dropdowns.map((attribute) => ({
          attributeId: attribute.id,
          name: attribute.name,
          values: [...(selected[attribute.id] ?? [])],
          selectedOptions: (selected[attribute.id] ?? []).map((label) => ({
            label,
            availableQuantity:
              attributeChoices(attribute).find(
                (option) => option.label === label,
              )?.quantity ?? null,
          })),
        })),
      });
    }

    // A successful Add to Cart must actually persist via /api/cart/items.
    // Keep the optional external handler for callers that supply one.
    const handler =
      kind === "cart"
        ? (onAddToCart ??
          (async (selection: PurchaseIntent) => {
            await addToCart({
              variantId: selection.variantId,
              quantity: selection.quantity,
              attributes: selection.attributes,
            });
            announceCartChanged();
          }))
        : onOrderNow;

    if (!handler) {
      // Orders have not been integrated yet: emit an event, not a fake order.
      window.dispatchEvent(
        new CustomEvent(ORDER_NOW_EVENT, { detail: intent }),
      );
      notify(
        "Your selection is valid, but checkout has not been connected yet. No order was created.",
        "info",
        "Ready for integration",
      );
      return;
    }

    try {
      requestInFlight.current = true;
      setBusy(true);
      await handler(intent);
      notify(
        kind === "cart"
          ? "Your selection was added to the cart."
          : "Your order flow has been opened.",
        "success",
        kind === "cart" ? "Added to cart" : "Order started",
      );
    } catch (error) {
      if (error instanceof CartApiError && error.status === 401) {
        router.push("/login");
        return;
      }
      if (error instanceof CartApiError && error.status === 403) {
        notify(
          "Administrator accounts cannot use the shopping cart.",
          "info",
          "Customer accounts only",
        );
        return;
      }
      notify(
        error instanceof Error
          ? error.message
          : "The action could not be completed. Please retry.",
      );
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  if (!variant) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Product unavailable
        </h1>
        <Link
          href="/shop"
          className="mt-5 inline-block text-indigo-700 hover:underline"
        >
          Visit our shop
        </Link>
      </main>
    );
  }

  const currentImage = variant.images[imageIndex] ?? variant.images[0];

  return (
    <>
      <main className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#fff2fb_0%,#fff_36%,#f1f9ff_110%)] pb-24 pt-7 sm:pt-11">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:mb-9"
          >
            <Link href="/" className="hover:text-indigo-700">
              Home
            </Link>
            <LuChevronRight aria-hidden="true" />
            <Link href="/shop" className="hover:text-indigo-700">
              Shop
            </Link>
            <LuChevronRight aria-hidden="true" />
            <Link
              href={categoryHref(product.categoryId)}
              className="hover:text-indigo-700"
            >
              {product.categoryName}
            </Link>
            <LuChevronRight aria-hidden="true" />
            <span className="font-bold text-slate-800">{product.name}</span>
          </nav>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,.97fr)] lg:gap-14">
            <div className="min-w-0 lg:sticky lg:top-28">
              <div className="aspect-square overflow-hidden rounded-[1.6rem] border border-slate-200 bg-gradient-to-br from-[#f2f4fb] via-white to-[#ebf8ff] p-5 shadow-[0_25px_80px_-55px_rgba(25,40,103,.5)] sm:rounded-[2rem] sm:p-8">
                <ResilientImage
                  key={currentImage?.id ?? variant.id}
                  src={currentImage?.url}
                  fallbackSrc={currentImage?.fallbackImageUrl ?? null}
                  alt={`${product.name} — ${variant.name}`}
                  fetchPriority="high"
                  className="h-full w-full object-contain"
                />
              </div>

              {variant.images.length > 1 && (
                <div
                  className="mt-4 flex gap-3 overflow-x-auto pb-3"
                  aria-label="Product image gallery"
                >
                  {variant.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setImageIndex(index)}
                      aria-label={`Show image ${index + 1}`}
                      aria-pressed={index === imageIndex}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 p-2 transition ${index === imageIndex ? "border-indigo-500 shadow-md" : "border-slate-100 hover:border-indigo-200"}`}
                    >
                      <ResilientImage
                        src={image.url}
                        fallbackSrc={image.fallbackImageUrl ?? null}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 pt-1">
              <Link
                href={categoryHref(product.categoryId)}
                className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-indigo-700"
              >
                {product.categoryName}
              </Link>

              <h1 className="mt-4 text-3xl font-black leading-[1.13] tracking-[-.045em] text-slate-950 sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>

              {product.hasVariants && (
                <div className="mt-8">
                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-500">
                    Choose a variant
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => pickVariant(item.id)}
                        aria-pressed={item.id === variant.id}
                        className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${item.id === variant.id ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/15" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"}`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.hasVariants && (
                <h2 className="mt-7 text-lg font-extrabold text-slate-900 sm:text-xl">
                  {variant.name}
                </h2>
              )}

              <div className="mt-5 rounded-[1.45rem] border border-slate-100 bg-white/90 p-5 shadow-[0_16px_60px_-45px_rgba(15,23,42,.4)] sm:p-6">
                <Price
                  salePrice={variant.salePrice}
                  hasDiscount={variant.hasDiscount}
                  discountPercentage={variant.discountPercentage}
                />
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {PRODUCT_DETAILS_DISCLAIMER}
                </p>
              </div>

              <div className="mt-7 text-sm leading-7 text-slate-600">
                {variant.shortDescription?.trim() || variant.description}
              </div>

              {/* Color and button attributes: information only, never selectable. */}
              {variant.attributes.some(
                (attribute) => attribute.displayType !== "dropdown",
              ) && (
                <section className="mt-8" aria-label="Product specifications">
                  <h2 className="mb-3 text-base font-extrabold tracking-tight text-slate-900">
                    {HEADING_FOR_PRODUCT_DETAILS}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {variant.attributes
                      .filter(
                        (attribute) => attribute.displayType !== "dropdown",
                      )
                      .map((attribute) => (
                        <div
                          key={attribute.id}
                          className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <p className="text-xs font-semibold text-slate-400">
                            {attribute.name}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {informationalOptions(attribute).map((choice) =>
                              attribute.displayType === "color" ? (
                                <span
                                  key={choice.label}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="h-5 w-5 shrink-0 rounded-full border border-slate-300 shadow-sm"
                                    style={
                                      colorStyle(
                                        choice.color ?? choice.label,
                                      ) ?? { backgroundColor: "#e2e8f0" }
                                    }
                                  />
                                  {choice.label}
                                </span>
                              ) : (
                                <span
                                  key={choice.label}
                                  className="inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                                >
                                  {choice.label}
                                  {attribute.unit ? ` ${attribute.unit}` : ""}
                                </span>
                              ),
                            )}
                            {informationalOptions(attribute).length === 0 && (
                              <span className="text-xs text-slate-400">
                                Not specified
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Only dropdown attributes are customer-selectable. */}
              {dropdowns.length > 0 && (
                <section
                  className="mt-8 space-y-5"
                  aria-label="Required options"
                >
                  <h2 className="text-base font-extrabold text-slate-900">
                    {PRODUCT_ATTRIBUTE_SELECT_DROPDOWN_TEXT}
                  </h2>
                  {dropdowns.map((attribute) => {
                    const choices = attributeChoices(attribute);
                    const chosen = selected[attribute.id] ?? [];
                    return (
                      <div key={attribute.id}>
                        <label
                          htmlFor={`attribute-${attribute.id}`}
                          className="mb-2 block text-xs font-bold text-slate-700"
                        >
                          {attribute.name}{" "}
                          <span className="text-rose-600">*</span>
                        </label>
                        <select
                          id={`attribute-${attribute.id}`}
                          value=""
                          onChange={(event) =>
                            selectValue(attribute, event.target.value)
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">
                            Add {attribute.name.toLowerCase()} option
                          </option>
                          {choices.map((choice) => (
                            <option
                              key={choice.label}
                              value={choice.label}
                              disabled={
                                chosen.includes(choice.label) ||
                                choice.quantity === 0
                              }
                            >
                              {choice.label}
                              {attribute.unit ? ` ${attribute.unit}` : ""}
                              {choice.quantity === 0 ? " — unavailable" : ""}
                            </option>
                          ))}
                        </select>
                        {chosen.length > 0 && (
                          <div
                            className="mt-2 flex flex-wrap gap-2"
                            aria-label={`Selected ${attribute.name}`}
                          >
                            {chosen.map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => removeValue(attribute.id, value)}
                                aria-label={`Remove ${value} from ${attribute.name}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                              >
                                {value}
                                <LuX className="h-3.5 w-3.5" />
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                          Select at least one. The number of different options
                          cannot exceed the ordered quantity.
                        </p>
                      </div>
                    );
                  })}
                </section>
              )}

              <div className="mt-8 border-t border-slate-200 pt-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <label
                      htmlFor="purchase-quantity"
                      className="mb-2 block text-xs font-extrabold uppercase tracking-[.13em] text-slate-600"
                    >
                      Quantity
                    </label>
                    <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="grid h-full w-11 place-items-center text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
                      >
                        <LuMinus />
                      </button>
                      <input
                        id="purchase-quantity"
                        type="number"
                        min="1"
                        max={variant.stock}
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(Number(event.target.value))
                        }
                        className="h-full w-14 border-x border-slate-100 bg-transparent text-center text-sm font-bold text-slate-950 outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={quantity >= variant.stock}
                        onClick={() =>
                          setQuantity(Math.min(variant.stock, quantity + 1))
                        }
                        className="grid h-full w-11 place-items-center text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
                      >
                        <LuPlus />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                    <LuShieldCheck />
                    {variant.stock > 0
                      ? `${variant.stock} available`
                      : "Currently unavailable"}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={busy || variant.stock < 1}
                    onClick={() => void submit("cart")}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-white px-4 text-sm font-extrabold text-indigo-700 transition hover:bg-indigo-50 focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LuShoppingCart className="h-4 w-4" />{" "}
                    {PRODUCT_ADD_TO_CART_BUTTON_TEXT}
                  </button>
                  <button
                    type="button"
                    disabled={busy || variant.stock < 1}
                    onClick={() => void submit("order")}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-500/15 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LuShoppingBag className="h-4 w-4" />{" "}
                    {PRODUCT_ORDER_BUTTON_TEXT}{" "}
                    <LuArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-slate-500">
                  <LuCheck className="shrink-0 text-emerald-600" />
                  Order details and stock are rechecked during checkout.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-7">
            <Link
              href={categoryHref(product.categoryId)}
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline"
            >
              <LuArrowLeft /> More in {product.categoryName}
            </Link>
            {/* <Link href="/shipping-policy" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700">
              Shipping information <LuChevronRight />
            </Link> */}
          </div>
        </div>
      </main>

      <NotificationPopup
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        variant={notice?.variant ?? "info"}
        onClose={closeNotice}
      />
    </>
  );
}
