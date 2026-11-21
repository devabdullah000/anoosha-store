"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuX } from "react-icons/lu";
import Pagination from "@/components/pagination";
import type {
  CatalogPage,
  CatalogProduct,
  CategoryTarget,
  ProductTarget,
  PromotionScope,
  PromotionTargets,
  PromotionApiResult,
  PromotionFormProps,
} from "./promotion-types";

// The form has its own paginated catalog; it is mounted only while editing.
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
  });
  const p = (await r.json()) as PromotionApiResult<T>;
  if (!r.ok || !p.success)
    throw new Error(p.message || `Request failed (${r.status}).`);
  return p.data as T;
}

const bg =
  "rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]";

export default function PromotionForm({
  editor,
  saving,
  onChange,
  onClose,
  onSave,
  onNotify,
}: PromotionFormProps) {
  const [catalog, setCatalog] = useState<CatalogPage | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [query, setQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const categoriesLoaded = useRef(false);
  const notify = onNotify;

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    const t = setTimeout(
      async () => {
        setCatalogLoading(true);
        try {
          const q = new URLSearchParams({
            page: String(catalogPage),
            q: query,
            categoryId: catalogCategory,
            includeCategories: !categoriesLoaded.current ? "1" : "0",
          });
          const result = await request<CatalogPage>(
            `/api/admin/promotions/catalog?${q}`,
            { signal: controller.signal },
          );
          if (alive) {
            setCatalog(result);
            if (!categoriesLoaded.current) {
              setCategories(result.categories);
              categoriesLoaded.current = true;
            }
          }
        } catch (e) {
          if (alive && !(e instanceof DOMException && e.name === "AbortError"))
            notify(
              "Unable to load catalog",
              e instanceof Error ? e.message : "Retry.",
            );
        } finally {
          if (alive) setCatalogLoading(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [catalogPage, query, catalogCategory]);
  const updateEditor = onChange;
  const mutateRules = (fn: (r: PromotionTargets) => PromotionTargets) =>
    updateEditor((e) => ({ ...e, targets: fn(e.targets) }));

  const setScope = (scope: PromotionScope) =>
    mutateRules((r) => ({ ...r, scope }));
  const toggleCategory = (categoryId: string) =>
    mutateRules((r) => {
      const categories = r.categories.some((x) => x.categoryId === categoryId)
        ? r.categories.filter((x) => x.categoryId !== categoryId)
        : [
            ...r.categories,
            {
              categoryId,
              allProducts: true,
              products: [],
              excludedVariantIds: [],
            },
          ];
      return { ...r, categories };
    });
  const modifyCategory = (
    categoryId: string,
    fn: (old: CategoryTarget) => CategoryTarget,
  ) =>
    mutateRules((r) => ({
      ...r,
      categories: r.categories.map((c) =>
        c.categoryId === categoryId ? fn(c) : c,
      ),
    }));
  const toggleExclude = (
    items: string[],
    ids: string[],
    includeAll: boolean,
  ) => {
    const set = new Set(items);
    for (const id of ids) includeAll ? set.delete(id) : set.add(id);
    return [...set];
  };
  function applyProduct(variants: CatalogProduct, onlyVariantId?: string) {
    if (!editor || (editor.wasActive && !!editor.id)) return;
    const r = editor.targets;
    const variantIds = variants.variants.map((v) => v.id);
    if (r.scope === "store") {
      mutateRules((old) => {
        const excluded = new Set(old.excludedVariantIds);
        const included = onlyVariantId
          ? !excluded.has(onlyVariantId)
          : variantIds.every((id) => !excluded.has(id));
        const targetIds = onlyVariantId ? [onlyVariantId] : variantIds;
        return {
          ...old,
          excludedVariantIds: toggleExclude(
            old.excludedVariantIds,
            targetIds,
            !included,
          ),
        };
      });
      return;
    }
    const updateProducts = (items: ProductTarget[]) => {
      const old = items.find((p) => p.productId === variants.id);
      if (!onlyVariantId)
        return old
          ? items.filter((p) => p.productId !== variants.id)
          : [...items, { productId: variants.id, variantIds: null }];
      const current = old
        ? old.variantIds === null
          ? variantIds
          : [...old.variantIds]
        : [];
      const updated = current.includes(onlyVariantId)
        ? current.filter((id) => id !== onlyVariantId)
        : [...current, onlyVariantId];
      return [
        ...items.filter((p) => p.productId !== variants.id),
        ...(updated.length
          ? [
              {
                productId: variants.id,
                variantIds:
                  updated.length === variantIds.length ? null : updated,
              },
            ]
          : []),
      ];
    };
    if (r.scope === "products")
      mutateRules((old) => ({
        ...old,
        products: updateProducts(old.products),
      }));
    if (r.scope === "categories")
      modifyCategory(variants.categoryId, (c) => {
        if (c.allProducts) {
          const excluded = new Set(c.excludedVariantIds);
          const included = onlyVariantId
            ? !excluded.has(onlyVariantId)
            : variantIds.every((id) => !excluded.has(id));
          return {
            ...c,
            excludedVariantIds: toggleExclude(
              c.excludedVariantIds,
              onlyVariantId ? [onlyVariantId] : variantIds,
              !included,
            ),
          };
        }
        return { ...c, products: updateProducts(c.products) };
      });
  }
  function isIncluded(product: CatalogProduct, variantId: string): boolean {
    if (!editor) return false;
    const targets = editor.targets;
    if (targets.scope === "store")
      return !targets.excludedVariantIds.includes(variantId);
    if (targets.scope === "products") {
      const chosen = targets.products.find((p) => p.productId === product.id);
      return (
        !!chosen &&
        (chosen.variantIds === null || chosen.variantIds.includes(variantId))
      );
    }
    const category = targets.categories.find(
      (c) => c.categoryId === product.categoryId,
    );
    if (!category) return false;
    if (category.allProducts)
      return !category.excludedVariantIds.includes(variantId);
    const chosen = category.products.find((p) => p.productId === product.id);
    return (
      !!chosen &&
      (chosen.variantIds === null || chosen.variantIds.includes(variantId))
    );
  }

  const locked = Boolean(editor.id && editor.wasActive);
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !saving) onClose();
      }}
    >
      <section
        className={`${bg} mx-auto w-full max-w-5xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-editor-title"
      >
        <div className="rounded-[15px] bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                id="promotion-editor-title"
                className="text-xl font-black text-slate-950"
              >
                {editor.id ? "Edit promotion" : "Create promotion"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                All prices and eligibility are verified by the server.
              </p>
            </div>
            <button
              disabled={saving}
              onClick={() => onClose()}
              aria-label="Close editor"
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <LuX />
            </button>
          </div>
          <div className="mt-5 grid gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Promotion name
              <input
                required
                maxLength={100}
                value={editor.name}
                onChange={(e) =>
                  updateEditor((x) => ({ ...x, name: e.target.value }))
                }
                className="mt-2 block h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Discount percentage (1–99)
              <input
                type="number"
                min={1}
                max={99}
                value={editor.discountPercentage}
                onChange={(e) =>
                  updateEditor((x) => ({
                    ...x,
                    discountPercentage: Number(e.target.value),
                  }))
                }
                className="mt-2 block h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>
            <label className="sm:col-span-2 text-xs font-bold text-slate-700">
              Description
              <textarea
                value={editor.description}
                maxLength={500}
                onChange={(e) =>
                  updateEditor((x) => ({
                    ...x,
                    description: e.target.value,
                  }))
                }
                className="mt-2 block min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </label>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={editor.isActive}
                onChange={(e) =>
                  updateEditor((x) => ({
                    ...x,
                    isActive: e.target.checked,
                  }))
                }
                className="accent-indigo-600"
              />{" "}
              Activate this promotion when saved
            </label>
          </div>
          {locked && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Deactivate the promotion first to change product and variant
              coverage. Name and discount can still be edited.
            </p>
          )}
          <fieldset
            disabled={locked || saving}
            className="mt-6 disabled:opacity-65"
          >
            <legend className="mb-3 text-sm font-black text-slate-900">
              Target selection
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["store", "categories", "products"] as PromotionScope[]).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    aria-pressed={editor.targets.scope === s}
                    className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition ${editor.targets.scope === s ? "border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"}`}
                  >
                    {s === "store"
                      ? "Entire store"
                      : s === "categories"
                        ? "Selected categories"
                        : "Selected products"}
                  </button>
                ),
              )}
            </div>
            {editor.targets.scope === "categories" && (
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-900">
                  Categories (choose multiple)
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {categories.map((cat) => {
                    const choice = editor.targets.categories.find(
                      (c) => c.categoryId === cat.id,
                    );
                    return (
                      <div
                        key={cat.id}
                        className="rounded-lg border border-slate-100 p-2"
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={!!choice}
                            onChange={() => toggleCategory(cat.id)}
                          />
                          {cat.name}
                        </label>
                        {choice && (
                          <label className="mt-2 ml-5 flex items-center gap-2 text-xs text-indigo-700">
                            <input
                              type="checkbox"
                              checked={choice.allProducts}
                              onChange={(e) =>
                                modifyCategory(cat.id, (c) => ({
                                  ...c,
                                  allProducts: e.target.checked,
                                  products: [],
                                  excludedVariantIds: [],
                                }))
                              }
                            />
                            All products in this category (otherwise select
                            below)
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-5 rounded-xl border border-slate-200 p-3 sm:p-4">
              <h4 className="text-sm font-black text-slate-900">
                Product and variant selector
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Store/category-wide: uncheck variants to exclude them.
                Selective: include only checked variants. Product selections are
                grouped by category automatically.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCatalogPage(1);
                  }}
                  placeholder="Search products..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
                <select
                  value={catalogCategory}
                  onChange={(e) => {
                    setCatalogCategory(e.target.value);
                    setCatalogPage(1);
                  }}
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 space-y-2" aria-busy={catalogLoading}>
                {catalogLoading && (
                  <p className="text-xs text-slate-500">Loading catalog...</p>
                )}
                {catalog?.data.map((p) => {
                  const catSelected =
                    editor.targets.scope !== "categories" ||
                    editor.targets.categories.some(
                      (c) => c.categoryId === p.categoryId,
                    );
                  const included = p.variants.filter((v) =>
                    isIncluded(p, v.id),
                  );
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {p.categoryName} · {included.length}/
                            {p.variants.length} variants selected
                          </p>
                        </div>
                        <button
                          disabled={!catSelected}
                          type="button"
                          onClick={() => applyProduct(p)}
                          className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 disabled:opacity-40"
                        >
                          {included.length === p.variants.length
                            ? "Exclude product"
                            : "Include all variants"}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.variants.map((v) => (
                          <label
                            key={v.id}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold ${isIncluded(p, v.id) ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}
                          >
                            <input
                              type="checkbox"
                              disabled={!catSelected}
                              checked={isIncluded(p, v.id)}
                              onChange={() => applyProduct(p, v.id)}
                            />
                            {p.hasVariants ? v.name : p.name}
                            <span className="text-slate-400">
                              ({v.stock} stock)
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {!catalogLoading && catalog?.data.length === 0 && (
                  <p className="py-5 text-center text-sm text-slate-500">
                    No products match this filter.
                  </p>
                )}
              </div>
              <div className="mt-2">
                <Pagination
                  currentPage={catalogPage}
                  totalPages={Math.max(
                    1,
                    Math.ceil((catalog?.total ?? 0) / 20),
                  )}
                  totalItems={catalog?.total ?? 0}
                  pageSize={20}
                  onPageChange={setCatalogPage}
                />
              </div>
            </div>
          </fieldset>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              disabled={saving}
              type="button"
              onClick={() => onClose()}
              className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              type="button"
              onClick={() => onSave()}
              className="min-h-11 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-6 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save promotion"}
              <LuCheck className="ml-2 inline" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
