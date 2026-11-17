"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogProduct, SelectedInventoryVariant } from "./inventory-types";

type Props = {
  value: SelectedInventoryVariant | null;
  excludedVariantIds: string[];
  disabled?: boolean;
  onSelect: (variant: SelectedInventoryVariant) => void;
};

type PopoverLayout = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export default function InventoryVariantPicker({
  value,
  excludedVariantIds,
  disabled = false,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<PopoverLayout | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Render the popover in a portal, so the scrollable modal cannot clip it.
  useEffect(() => {
    if (!open) return;

    const position = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const roomBelow = window.innerHeight - rect.bottom - 8;
      const roomAbove = rect.top - 8;
      const upward = roomBelow < 240 && roomAbove > roomBelow;
      const room = upward ? roomAbove : roomBelow;
      const maxHeight = Math.max(120, Math.min(340, room - 6));
      const width = Math.min(rect.width, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const top = upward
        ? Math.max(8, rect.top - maxHeight - 5)
        : Math.min(window.innerHeight - 8, rect.bottom + 5);
      setLayout({ left, top, width, maxHeight });
    };

    const onPointerDown = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (triggerRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    position();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ search: query });
        const response = await fetch(`/api/admin/inventory/catalog?${params}`, {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = await response.json() as {
          success?: boolean;
          message?: string;
          data?: CatalogProduct[];
        };
        if (!response.ok || payload.success !== true || !Array.isArray(payload.data)) {
          throw new Error(payload.message || "Unable to load products and variants.");
        }
        if (!controller.signal.aborted) setProducts(payload.data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to search products.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const select = (product: CatalogProduct, variant: CatalogProduct["variants"][number]) => {
    onSelect({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      stock: variant.stock,
      hasVariants: product.hasVariants,
    });
    setOpen(false);
    setExpanded(null);
    setQuery("");
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm text-slate-800 outline-none transition hover:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
      >
        <span className="min-w-0 truncate">
          {value
            ? `${value.productName}${value.hasVariants ? ` › ${value.variantName}` : ""} · ${value.sku}`
            : "Select product or variant"}
        </span>
        <span aria-hidden="true" className="shrink-0 text-slate-400">▾</span>
      </button>

      {open && layout && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Select product and variant"
          style={{
            position: "fixed",
            left: layout.left,
            top: layout.top,
            width: layout.width,
            maxHeight: layout.maxHeight,
          }}
          className="z-[200] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
        >
          <div className="shrink-0 border-b border-slate-100 p-2">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setExpanded(null); }}
              placeholder="Search product, variant or SKU"
              aria-label="Search product or variant"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-black outline-none focus:border-indigo-400"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {loading && <p className="p-3 text-xs text-slate-500">Searching...</p>}
            {error && <p className="p-3 text-xs text-rose-600">{error}</p>}
            {!loading && !error && products.length === 0 && (
              <p className="p-3 text-xs text-slate-500">No matching products.</p>
            )}
            {!loading && !error && products.map((product) => {
              const simple = product.variants.length === 1;
              const active = expanded === product.id;
              const onlyVariant = product.variants[0];
              return (
                <div key={product.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={simple && excludedVariantIds.includes(onlyVariant.id)}
                    onClick={() => simple
                      ? select(product, onlyVariant)
                      : setExpanded(active ? null : product.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="min-w-0 truncate">{product.name}</span>
                    {simple
                      ? <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">Stock {onlyVariant.stock}</span>
                      : <span aria-hidden="true" className="shrink-0 text-indigo-600">{active ? "⌄" : "›"}</span>}
                  </button>
                  {!simple && active && (
                    <div className="ml-3 border-l-2 border-indigo-100 pl-2">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          role="option"
                          aria-selected={false}
                          type="button"
                          disabled={excludedVariantIds.includes(variant.id)}
                          onClick={() => select(product, variant)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="min-w-0 truncate font-medium">{variant.name} · {variant.sku}</span>
                          <span className="shrink-0 tabular-nums text-slate-500">Stock {variant.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
