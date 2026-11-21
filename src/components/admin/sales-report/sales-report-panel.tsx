"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuCalendarDays,
  LuDownload,
  LuFileText,
  LuLoaderCircle,
  LuRefreshCw,
  LuSearch,
  LuX,
} from "react-icons/lu";
import DataTable from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import Pagination from "@/components/pagination";
import NotificationPopup, {
  type NotificationVariant,
} from "@/components/storefront/notification-popup";
import type {
  CatalogPage,
  CatalogProduct,
  CategoryTarget,
  ProductTarget,
  PromotionScope,
  PromotionTargets,
} from "@/lib/promotions/types";
import type {
  SalesReport,
  SalesReportLine,
  SalesProductBreakdown,
  SalesCategoryBreakdown,
} from "@/lib/sales-report/types";
import { downloadSalesReportPdf } from "@/lib/sales-report/pdf";

const inputStyle =
  "mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const fieldStyle = "text-xs font-bold text-slate-600";
const gradient =
  "rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]";
const scopes: Array<{ id: PromotionScope; label: string; caption: string }> = [
  { id: "store", label: "Entire store", caption: "All historical sales" },
  { id: "categories", label: "Categories", caption: "One or more categories" },
  {
    id: "products",
    label: "Selected products",
    caption: "Individual product variants",
  },
];
const money = (paisa: number) =>
  `Rs. ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (value: string) => {
  const utc = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
  );
  return Number.isNaN(utc.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(utc);
};
const statusLabel: Record<SalesReportLine["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  delivered: "Delivered / received",
  cancelled: "Cancelled",
};
const statusStyles: Record<SalesReportLine["status"], string> = {
  pending: "bg-amber-50 text-amber-800",
  processing: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};
const emptyTargets = (): PromotionTargets => ({
  scope: "store",
  categories: [],
  products: [],
  excludedVariantIds: [],
});

function pakistanDate(daysFromNow = 0) {
  const date = new Date(Date.now() + daysFromNow * 86400000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: "day" | "month" | "year") =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Selection is immutable, allowing choices to persist across catalog pagination/search. */
function updatedProductSelections(
  items: ProductTarget[],
  product: CatalogProduct,
  onlyVariantId?: string,
): ProductTarget[] {
  const current = items.find((p) => p.productId === product.id);
  const ids = product.variants.map((v) => v.id);
  if (!onlyVariantId) {
    return current
      ? items.filter((p) => p.productId !== product.id)
      : [...items, { productId: product.id, variantIds: null }];
  }
  const previous = current
    ? current.variantIds === null
      ? ids
      : current.variantIds
    : [];
  const next = previous.includes(onlyVariantId)
    ? previous.filter((id) => id !== onlyVariantId)
    : [...previous, onlyVariantId];
  return [
    ...items.filter((p) => p.productId !== product.id),
    ...(next.length
      ? [
          {
            productId: product.id,
            variantIds: next.length === ids.length ? null : next,
          },
        ]
      : []),
  ];
}

function changeExcluded(all: string[], ids: string[], shouldExclude: boolean) {
  const result = new Set(all);
  for (const id of ids) shouldExclude ? result.add(id) : result.delete(id);
  return [...result];
}

function selectedVariant(
  targets: PromotionTargets,
  product: CatalogProduct,
  variantId: string,
): boolean {
  if (targets.scope === "store")
    return !targets.excludedVariantIds.includes(variantId);
  if (targets.scope === "products") {
    const row = targets.products.find((p) => p.productId === product.id);
    return (
      !!row && (row.variantIds === null || row.variantIds.includes(variantId))
    );
  }
  const category = targets.categories.find(
    (c) => c.categoryId === product.categoryId,
  );
  if (!category) return false;
  if (category.excludedVariantIds.includes(variantId)) return false;
  if (category.allProducts) return true;
  const row = category.products.find((p) => p.productId === product.id);
  return (
    !!row && (row.variantIds === null || row.variantIds.includes(variantId))
  );
}

const orderColumns: DataTableColumn<SalesReportLine>[] = [
  {
    key: "order",
    header: "Order / date",
    width: "20%",
    render: (row) => (
      <div className="min-w-36">
        <p className="font-extrabold text-slate-900">{row.orderNumber}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {shortDate(row.orderedAt)} PKT
        </p>
      </div>
    ),
  },
  {
    key: "product",
    header: "Product / variant",
    width: "27%",
    render: (row) => (
      <div className="min-w-40">
        <p className="font-bold text-slate-900">{row.productName}</p>
        {row.hasVariants && (
          <p className="mt-0.5 text-xs text-slate-500">{row.variantName}</p>
        )}
        <p className="mt-0.5 text-[11px] text-slate-400">
          {row.categoryName} · {row.sku}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "14%",
    render: (row) => (
      <div>
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[row.status]}`}
        >
          {statusLabel[row.status]}
        </span>
        {row.status === "cancelled" && row.cancellationReason && (
          <p
            title={row.cancellationReason}
            className="mt-1 max-w-36 truncate text-[10px] text-slate-500"
          >
            {row.cancellationReason}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "qty",
    header: "Qty",
    align: "center",
    render: (row) => (
      <span className="tabular-nums font-bold text-slate-800">
        {row.quantity}
      </span>
    ),
  },
  {
    key: "discount",
    header: "Discount",
    align: "right",
    render: (row) => (
      <div className="whitespace-nowrap text-right">
        <p className="font-bold text-indigo-700">{row.discountPercentage}%</p>
        <p className="text-[11px] text-slate-400">
          -{money(row.discountPaisa)}
        </p>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    render: (row) => (
      <div className="whitespace-nowrap text-right">
        <p className="font-extrabold text-slate-900">{money(row.netPaisa)}</p>
        {row.status === "cancelled" && (
          <p className="text-[11px] font-semibold text-rose-600">
            Excluded from net
          </p>
        )}
      </div>
    ),
  },
];
const categoryColumns: DataTableColumn<SalesCategoryBreakdown>[] = [
  {
    key: "category",
    header: "Category",
    render: (row) => (
      <span className="font-extrabold text-slate-900">{row.categoryName}</span>
    ),
  },
  {
    key: "orders",
    header: "Orders",
    align: "center",
    render: (row) => (
      <span className="font-bold tabular-nums">{row.orders}</span>
    ),
  },
  {
    key: "units",
    header: "Units (net)",
    align: "center",
    render: (row) => (
      <span className="font-bold tabular-nums">{row.units}</span>
    ),
  },
  {
    key: "cancelled",
    header: "Cancelled",
    align: "right",
    render: (row) => (
      <span className="font-semibold text-rose-600">
        {money(row.cancelledPaisa)}
      </span>
    ),
  },
  {
    key: "net",
    header: "Net sales",
    align: "right",
    render: (row) => (
      <span className="font-extrabold text-slate-900">
        {money(row.netSalesPaisa)}
      </span>
    ),
  },
];
const variantColumns: DataTableColumn<SalesProductBreakdown>[] = [
  {
    key: "product",
    header: "Product / variant",
    width: "40%",
    render: (row) => (
      <div className="min-w-44">
        <p className="font-extrabold text-slate-900">{row.productName}</p>
        {row.hasVariants && (
          <p className="mt-1 text-xs text-slate-500">{row.variantName}</p>
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          {row.categoryName} · {row.sku}
        </p>
      </div>
    ),
  },
  {
    key: "orders",
    header: "Orders",
    align: "center",
    render: (row) => (
      <span className="font-bold tabular-nums text-slate-700">
        {row.orderCount}
      </span>
    ),
  },
  {
    key: "units",
    header: "Units (net)",
    align: "center",
    render: (row) => (
      <span className="font-bold tabular-nums text-slate-700">{row.units}</span>
    ),
  },
  {
    key: "cancelled",
    header: "Cancelled",
    align: "right",
    render: (row) => (
      <span className="whitespace-nowrap font-semibold text-rose-600">
        {money(row.cancelledPaisa)}
      </span>
    ),
  },
  {
    key: "net",
    header: "Net sales",
    align: "right",
    render: (row) => (
      <span className="whitespace-nowrap font-extrabold text-slate-950">
        {money(row.netSalesPaisa)}
      </span>
    ),
  },
];

type Alert = {
  title: string;
  description: string;
  variant: NotificationVariant;
};
type ApiResult<T> = { success: boolean; message?: string; data?: T };

export default function SalesReportInterface() {
  const [startDate, setStartDate] = useState(() => pakistanDate(-29));
  const [endDate, setEndDate] = useState(() => pakistanDate());
  const [targets, setTargets] = useState<PromotionTargets>(emptyTargets);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [table, setTable] = useState<"orders" | "variants" | "categories">(
    "orders",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogPage | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [search, setSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const hasCategories = useRef(false);
  const notify = (
    title: string,
    description: string,
    variant: NotificationVariant = "error",
  ) => setAlert({ title, description, variant });

  const showCatalog = targets.scope !== "store" || catalogOpen;
  useEffect(() => {
    if (!showCatalog) return;
    const controller = new AbortController();
    let live = true;
    const timer = setTimeout(
      async () => {
        setCatalogLoading(true);
        const params = new URLSearchParams({
          page: String(catalogPage),
          q: search,
          categoryId: catalogCategory,
          includeCategories: hasCategories.current ? "0" : "1",
        });
        try {
          const response = await fetch(
            `/api/admin/promotions/catalog?${params}`,
            {
              credentials: "same-origin",
              cache: "no-store",
              signal: controller.signal,
            },
          );
          const payload = (await response.json()) as ApiResult<CatalogPage>;
          if (!response.ok || !payload.success || !payload.data) {
            throw new Error(
              payload.message ?? "Unable to load product catalog.",
            );
          }
          if (live) {
            setCatalog(payload.data);
            if (!hasCategories.current) {
              setCategories(payload.data.categories);
              hasCategories.current = true;
            }
          }
        } catch (error) {
          if (
            live &&
            !(error instanceof Error && error.name === "AbortError")
          ) {
            notify(
              "Catalog unavailable",
              error instanceof Error ? error.message : "Please retry.",
            );
          }
        } finally {
          if (live) setCatalogLoading(false);
        }
      },
      search ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [showCatalog, catalogPage, search, catalogCategory]);

  const chooseScope = (scope: PromotionScope) => {
    setTargets((old) => ({ ...old, scope }));
    setCatalogPage(1);
    setCatalogCategory("");
  };
  const toggleCategory = (categoryId: string) =>
    setTargets((old) => ({
      ...old,
      categories: old.categories.some((c) => c.categoryId === categoryId)
        ? old.categories.filter((c) => c.categoryId !== categoryId)
        : [
            ...old.categories,
            {
              categoryId,
              allProducts: true,
              products: [],
              excludedVariantIds: [],
            },
          ],
    }));
  const updateCategory = (
    categoryId: string,
    fn: (c: CategoryTarget) => CategoryTarget,
  ) =>
    setTargets((old) => ({
      ...old,
      categories: old.categories.map((c) =>
        c.categoryId === categoryId ? fn(c) : c,
      ),
    }));
  const updateProduct = (product: CatalogProduct, onlyVariantId?: string) => {
    const ids = product.variants.map((v) => v.id);
    if (targets.scope === "store") {
      setTargets((old) => {
        const included = onlyVariantId
          ? !old.excludedVariantIds.includes(onlyVariantId)
          : ids.every((id) => !old.excludedVariantIds.includes(id));
        return {
          ...old,
          excludedVariantIds: changeExcluded(
            old.excludedVariantIds,
            onlyVariantId ? [onlyVariantId] : ids,
            included,
          ),
        };
      });
      return;
    }
    if (targets.scope === "products") {
      setTargets((old) => ({
        ...old,
        products: updatedProductSelections(
          old.products,
          product,
          onlyVariantId,
        ),
      }));
      return;
    }
    updateCategory(product.categoryId, (c) => {
      if (!c.allProducts)
        return {
          ...c,
          products: updatedProductSelections(
            c.products,
            product,
            onlyVariantId,
          ),
        };
      const included = onlyVariantId
        ? !c.excludedVariantIds.includes(onlyVariantId)
        : ids.every((id) => !c.excludedVariantIds.includes(id));
      return {
        ...c,
        excludedVariantIds: changeExcluded(
          c.excludedVariantIds,
          onlyVariantId ? [onlyVariantId] : ids,
          included,
        ),
      };
    });
  };
  const generate = useCallback(async () => {
    if (generating) return;
    if (!startDate || !endDate || startDate > endDate) {
      notify("Check dates", "Choose a valid start date and end date.");
      return;
    }
    if (
      targets.scope === "categories" &&
      (!targets.categories.length ||
        targets.categories.some((c) => !c.allProducts && !c.products.length))
    ) {
      notify(
        "Choose categories",
        "Select categories and at least one product within every selective category.",
      );
      return;
    }
    if (targets.scope === "products" && !targets.products.length) {
      notify("Choose products", "Select at least one product or variant.");
      return;
    }
    setGenerating(true);
    setReport(null);
    try {
      const response = await fetch("/api/admin/sales-report", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, targets }),
      });
      if (response.status === 401)
        throw new Error("Session expired. Sign in again as an administrator.");
      if (response.status === 403)
        throw new Error("Administrator access is required.");
      const payload = (await response.json()) as ApiResult<SalesReport>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(
          payload.message ?? "Sales report could not be generated.",
        );
      }
      setReport(payload.data);
      setPage(1);
      setTable("orders");
    } catch (error) {
      notify(
        "Report generation failed",
        error instanceof Error ? error.message : "Please retry.",
      );
    } finally {
      setGenerating(false);
    }
  }, [generating, startDate, endDate, targets]);

  const downloadPdf = async () => {
    if (!report || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadSalesReportPdf(report);
    } catch (error) {
      notify(
        "PDF export failed",
        error instanceof Error ? error.message : "Please retry.",
      );
    } finally {
      setPdfBusy(false);
    }
  };
  const rows = useMemo(
    () =>
      report
        ? table === "orders"
          ? report.lines
          : table === "variants"
            ? report.byVariant
            : report.byCategory
        : [],
    [report, table],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const setView = (view: "orders" | "variants" | "categories") => {
    setTable(view);
    setPage(1);
  };
  const reportInputsChanged =
    report !== null &&
    (report.startDate !== startDate ||
      report.endDate !== endDate ||
      JSON.stringify(report.targets) !== JSON.stringify(targets));
  const categorySelected = (product: CatalogProduct) =>
    targets.scope !== "categories" ||
    targets.categories.some((c) => c.categoryId === product.categoryId);

  return (
    <section className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Sales report
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Filter historical orders by date, category, product or variant.
            Review every order status and subtract cancelled sales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {report && (
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={generating || pdfBusy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              {pdfBusy ? (
                <LuLoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LuDownload className="h-4 w-4" />
              )}
              {pdfBusy ? "Exporting..." : "Download PDF"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-5 text-xs font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {generating ? (
              <LuLoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LuFileText className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate report"}
          </button>
        </div>
      </header>

      <div className={gradient}>
        <div className="rounded-[15px] bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <LuCalendarDays className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">Date range</h3>
            <span className="ml-auto text-[11px] font-semibold text-slate-400">
              Pakistan time (PKT)
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={fieldStyle}>
              Start date
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputStyle}
              />
            </label>
            <label className={fieldStyle}>
              End date
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputStyle}
              />
            </label>
          </div>
          <div className="my-5 border-t border-slate-100" />
          <h3 className="text-sm font-black text-slate-900">Report coverage</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {scopes.map((scope) => (
              <button
                key={scope.id}
                type="button"
                aria-pressed={targets.scope === scope.id}
                onClick={() => chooseScope(scope.id)}
                className={`min-h-[70px] rounded-xl border px-3 py-3 text-left transition ${targets.scope === scope.id ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}
              >
                <span
                  className={`block text-sm font-extrabold ${targets.scope === scope.id ? "text-indigo-800" : "text-slate-800"}`}
                >
                  {scope.label}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500">
                  {scope.caption}
                </span>
              </button>
            ))}
          </div>

          {targets.scope === "store" && (
            <button
              type="button"
              onClick={() => setCatalogOpen((v) => !v)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              {catalogOpen ? (
                <LuX className="h-4 w-4" />
              ) : (
                <LuSearch className="h-4 w-4" />
              )}
              {catalogOpen
                ? "Hide product exclusions"
                : "Optionally exclude products or variants"}
            </button>
          )}

          {showCatalog && (
            <div className="mt-5 space-y-4">
              {targets.scope === "categories" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-wide text-slate-600">
                      Choose one or more categories
                    </h4>
                    <span className="text-xs font-semibold text-indigo-700">
                      {targets.categories.length} selected
                    </span>
                  </div>
                  {categories.length === 0 && catalogLoading && (
                    <p className="mt-3 text-xs text-slate-500">
                      Loading categories...
                    </p>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {categories.map((category) => {
                      const item = targets.categories.find(
                        (c) => c.categoryId === category.id,
                      );
                      return (
                        <div
                          key={category.id}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <input
                              type="checkbox"
                              checked={!!item}
                              onChange={() => toggleCategory(category.id)}
                              className="accent-indigo-600"
                            />
                            {category.name}
                          </label>
                          {item && (
                            <label className="mt-3 flex items-center gap-2 pl-5 text-xs font-semibold text-indigo-700">
                              <input
                                type="checkbox"
                                checked={item.allProducts}
                                className="accent-indigo-600"
                                onChange={(e) =>
                                  updateCategory(category.id, (c) => ({
                                    ...c,
                                    allProducts: e.target.checked,
                                    products: [],
                                    excludedVariantIds: [],
                                  }))
                                }
                              />
                              All products in this category (uncheck to select
                              products below)
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Product and variant selector
                    </h4>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                      Selections persist across search pages. Check variants to
                      include them, or uncheck to exclude them from a
                      whole-store/category report.
                    </p>
                  </div>
                  {catalogLoading && (
                    <LuRefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                  )}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="relative">
                    <LuSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCatalogPage(1);
                      }}
                      placeholder="Search products..."
                      aria-label="Search report products"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <select
                    value={catalogCategory}
                    onChange={(e) => {
                      setCatalogCategory(e.target.value);
                      setCatalogPage(1);
                    }}
                    aria-label="Filter catalog category"
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 space-y-2" aria-busy={catalogLoading}>
                  {catalog?.data.map((product) => {
                    const allowed = categorySelected(product);
                    const count = product.variants.filter((v) =>
                      selectedVariant(targets, product, v.id),
                    ).length;
                    return (
                      <div
                        key={product.id}
                        className={`rounded-xl border p-3 ${allowed ? "border-slate-200 bg-slate-50/60" : "border-slate-100 bg-slate-50/30 opacity-55"}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {product.categoryName} · {count}/
                              {product.variants.length} variants included
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!allowed}
                            onClick={() => updateProduct(product)}
                            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {count === product.variants.length
                              ? "Exclude product"
                              : "Include all variants"}
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {product.variants.map((variant) => {
                            const selected = selectedVariant(
                              targets,
                              product,
                              variant.id,
                            );
                            return (
                              <label
                                key={variant.id}
                                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold ${selected ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={!allowed}
                                  onChange={() =>
                                    updateProduct(product, variant.id)
                                  }
                                  className="accent-indigo-600"
                                />
                                {product.hasVariants
                                  ? variant.name
                                  : product.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {!catalogLoading && catalog?.data.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No products match your search.
                    </p>
                  )}
                </div>
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
          )}
        </div>
      </div>

      {report && (
        <>
          {reportInputsChanged && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
              Filters have changed since this report was generated. Select
              Generate report to refresh the numbers and PDF.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Generated sales report
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {report.startDate} to {report.endDate} · Pakistan local dates ·{" "}
                {report.summary.orders} matching orders
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              {report.targets.scope === "store"
                ? "Entire store"
                : report.targets.scope === "categories"
                  ? "Selected categories"
                  : "Selected products"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "After-discount total",
                value: money(report.summary.totalAfterDiscountPaisa),
                style: "text-slate-900",
              },
              {
                label: "Cancelled orders amount",
                value: `− ${money(report.summary.cancelledPaisa)}`,
                style: "text-rose-700",
              },
              {
                label: "Net sales (non-cancelled)",
                value: money(report.summary.netSalesPaisa),
                style: "text-emerald-700",
              },
              {
                label: "Delivered sales",
                value: money(report.summary.deliveredPaisa),
                style: "text-indigo-700",
              },
            ].map((card) => (
              <div className={gradient} key={card.label}>
                <div className="h-full rounded-[15px] bg-white px-4 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p
                    className={`mt-3 text-xl font-black tabular-nums ${card.style}`}
                  >
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {report.byStatus.map((item) => (
              <div
                key={item.status}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02]"
              >
                <p className="text-xs font-bold text-slate-500">
                  {statusLabel[item.status]}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-xl font-black text-slate-900">
                    {item.orders}{" "}
                    <span className="text-xs font-medium text-slate-400">
                      orders
                    </span>
                  </span>
                  <span className="text-xs font-extrabold text-indigo-700">
                    {money(item.netPaisa)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-700">
                Gross: {money(report.summary.grossPaisa)} · Discounts:{" "}
                {money(report.summary.discountPaisa)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Net is discounted merchandise sales excluding cancelled orders.
                Pending and processing are included; this is not a
                collected-payment report.
              </p>
            </div>
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
              {(["orders", "variants", "categories"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setView(view)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${table === view ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {view === "orders"
                    ? "Order activities"
                    : view === "variants"
                      ? "Variant totals"
                      : "Category totals"}
                </button>
              ))}
            </div>
          </div>
          {table === "orders" ? (
            <DataTable<SalesReportLine>
              columns={orderColumns}
              data={visible as SalesReportLine[]}
              getRowId={(row) => `${row.orderId}:${row.variantId}`}
              emptyMessage="No orders match the selected report criteria."
              ariaLabel="Sales order activity"
            />
          ) : table === "variants" ? (
            <DataTable<SalesProductBreakdown>
              columns={variantColumns}
              data={visible as SalesProductBreakdown[]}
              getRowId={(row) => row.variantId}
              emptyMessage="No variants match these dates."
              ariaLabel="Variant sales totals"
            />
          ) : (
            <DataTable<SalesCategoryBreakdown>
              columns={categoryColumns}
              data={visible as SalesCategoryBreakdown[]}
              getRowId={(row) => row.categoryId}
              emptyMessage="No categories match the selected report."
              ariaLabel="Category sales totals"
            />
          )}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={rows.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
      {!report && !generating && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
          <LuFileText className="mx-auto h-8 w-8 text-indigo-300" />
          <p className="mt-3 text-sm font-bold text-slate-600">
            Select the date range and report scope, then generate a report.
          </p>
        </div>
      )}
      <NotificationPopup
        open={alert !== null}
        title={alert?.title ?? ""}
        description={alert?.description ?? ""}
        variant={alert?.variant ?? "error"}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
