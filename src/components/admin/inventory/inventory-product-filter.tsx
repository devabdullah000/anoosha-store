"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogProduct } from "./inventory-types";

type SelectedProduct = { id: string; name: string };
type Props = {
  selected: SelectedProduct[];
  onChange: (next: SelectedProduct[]) => void;
};

export default function InventoryProductFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    }
    function esc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ mode: "history", search });
        const response = await fetch(`/api/admin/inventory/catalog?${query}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          success?: boolean;
          message?: string;
          data?: CatalogProduct[];
        };
        if (!response.ok || !result.success || !Array.isArray(result.data))
          throw new Error(result.message ?? "Unable to load product filters.");
        if (!controller.signal.aborted) setOptions(result.data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to search products.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, search]);

  const selectedIds = new Set(selected.map((item) => item.id));
  const toggle = (product: CatalogProduct) => {
    if (selectedIds.has(product.id))
      onChange(selected.filter((item) => item.id !== product.id));
    else if (selected.length < 50)
      onChange([...selected, { id: product.id, name: product.name }]);
  };

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-800 outline-none focus:border-indigo-400"
      >
        <span className="truncate">
          {selected.length
            ? `${selected.length} product${selected.length === 1 ? "" : "s"} selected`
            : "All products"}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-black outline-none focus:border-indigo-400"
              placeholder="Search products"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {loading && (
              <p className="p-2 text-xs text-slate-500">Searching...</p>
            )}
            {error && <p className="p-2 text-xs text-rose-600">{error}</p>}
            {!loading && !error && options.length === 0 && (
              <p className="p-2 text-xs text-slate-500">No products found.</p>
            )}
            {!loading &&
              options.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggle(product)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span className="min-w-0 truncate">
                    {product.name}
                    {product.archived ? " (archived)" : ""}
                  </span>
                </label>
              ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-rose-600"
            >
              Clear products
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(selected.filter((v) => v.id !== item.id))}
              title={`Remove ${item.name} from report filter`}
              className="max-w-full truncate rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
            >
              {item.name} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
