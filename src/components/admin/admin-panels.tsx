"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { AdminSectionId } from "./admin-navigation";
import { CategoriesInterface } from "./categories/category-panel";
import { AttributesInterface } from "./attributes/attribute-panel";

export type AdminPanelProps = {
  adminEmail: string;
  onNavigate: (section: AdminSectionId) => void;
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
};

type ApiList<T> = {
  items?: T[];
  pagination?: Pagination;
  message?: string;
  error?: { message?: string };
};

type Column<T> = {
  key: string;
  heading: string;
  render: (item: T) => ReactNode;
  className?: string;
};

type ResourcePanelProps<T> = {
  title: string;
  description: string;
  endpoint: string;
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  columns: Column<T>[];
  emptyTitle: string;
  emptyDescription: string;
  rowKey: (item: T) => string;
};

function valueText(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function ResourcePanel<T extends Record<string, unknown>>({
  title,
  description,
  endpoint,
  searchEnabled = false,
  searchPlaceholder = "Search…",
  columns,
  emptyTitle,
  emptyDescription,
  rowKey,
}: ResourcePanelProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");

      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");
      if (search) url.searchParams.set("search", search);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal,
        });
        const payload = (await response.json()) as ApiList<T>;

        if (!response.ok) {
          throw new Error(
            payload.message ??
              payload.error?.message ??
              `Request failed (${response.status})`,
          );
        }

        setItems(Array.isArray(payload.items) ? payload.items : []);
        setPagination(payload.pagination ?? null);
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load this section.",
        );
        setItems([]);
        setPagination(null);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [endpoint, page, refreshKey, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setRefreshKey((current) => current + 1);
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Workspace
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
        {searchEnabled && (
          <form
            onSubmit={submitSearch}
            className="flex w-full gap-2 sm:max-w-sm"
          >
            <label
              className="sr-only"
              htmlFor={`search-${endpoint.replaceAll("/", "-")}`}
            >
              Search {title.toLowerCase()}
            </label>
            <input
              id={`search-${endpoint.replaceAll("/", "-")}`}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              All {title.toLowerCase()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {pagination
                ? `${pagination.totalCount.toLocaleString()} record${pagination.totalCount === 1 ? "" : "s"}`
                : "Latest records"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left">
            <thead className="bg-slate-50/80">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${column.className ?? ""}`}
                  >
                    {column.heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-14 text-center text-sm text-slate-500"
                  >
                    Loading {title.toLowerCase()}…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                        <span className="text-lg">⌕</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {emptyTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {error
                          ? "Check the API response and try again."
                          : emptyDescription}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={rowKey(item)}
                    className="transition hover:bg-slate-50/70"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-5 py-4 text-sm text-slate-700 ${column.className ?? ""}`}
                      >
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">
            {pagination
              ? `Page ${pagination.page} of ${Math.max(pagination.totalPages, 1)}`
              : "Page-based listing"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={
                loading ||
                (pagination ? !pagination.hasNextPage : items.length < 20)
              }
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusPill({
  active,
  yes = "Active",
  no = "Inactive",
}: {
  active: boolean;
  yes?: string;
  no?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
    >
      {active ? yes : no}
    </span>
  );
}

export function OverviewPanel({ adminEmail, onNavigate }: AdminPanelProps) {
  const cards: {
    id: AdminSectionId;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      id: "products",
      label: "Products",
      description:
        "Review the catalog, product variants, images and availability.",
      icon: "▦",
    },
    {
      id: "categories",
      label: "Categories",
      description: "Organize products into searchable storefront categories.",
      icon: "▤",
    },
    {
      id: "attributes",
      label: "Attributes",
      description: "Manage reusable variant attributes and their values.",
      icon: "⌘",
    },
    {
      id: "inventory",
      label: "Inventory",
      description: "Review live variant stock and stock movement status.",
      icon: "▥",
    },
  ];

  return (
    <section className="space-y-7">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">
            Anoosha Store · Administration
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Good to see you.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your store operations, catalog and inventory are together in one
            workspace.
          </p>
          <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="truncate">Signed in as {adminEmail}</span>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none -mt-8 ml-auto hidden h-32 w-32 rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_0_24px_rgba(255,255,255,0.025)] sm:block"
        />
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            Quick access
          </p>
        </div>
        <span className="hidden text-xs text-slate-400 sm:block">
          Choose a workspace to get started
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5"
          >
            <button
              type="button"
              onClick={() => onNavigate(card.id)}
              className="group h-full w-full rounded-[15px] bg-white p-5 text-left transition duration-200 hover:bg-white/95"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                {card.icon}
              </span>

              <span className="mt-5 block text-base font-bold text-slate-900">
                {card.label}
              </span>

              <span className="mt-2 block text-sm leading-6 text-slate-500">
                {card.description}
              </span>

              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-indigo-700">
                Open section <span aria-hidden="true">→</span>
              </span>
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace notes
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            A single place to manage your store
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Use the navigation to switch between catalog and operations
            sections. Section changes stay inside this dashboard and do not
            create additional browser routes.
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            Security
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            Admin session protected
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The dashboard page is protected by your server-side admin guard. API
            mutations must continue to validate authorization independently.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ProductsPanel(_props: AdminPanelProps) {
  type Product = Record<string, unknown> & {
    category?: { name?: string };
    variants?: unknown[];
    stock?: number;
    isAvailable?: boolean;
    status?: boolean;
  };

  return (
    <ResourcePanel<Product>
      title="Products"
      description="Browse products with their category, variants and current availability. Product images are served from your CloudFront domain."
      endpoint="/api/products"
      searchEnabled
      searchPlaceholder="Search products by name…"
      rowKey={(item) => String(item.id)}
      emptyTitle="No products found"
      emptyDescription="Products will appear here after they are created in your catalog."
      columns={[
        {
          key: "product",
          heading: "Product",
          render: (item) => (
            <div>
              <p className="font-semibold text-slate-900">
                {valueText(item.name)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {valueText(item.id as string)}
              </p>
            </div>
          ),
        },
        {
          key: "category",
          heading: "Category",
          render: (item) => valueText(item.category?.name),
        },
        {
          key: "variants",
          heading: "Variants",
          render: (item) => (
            <span className="font-medium text-slate-700">
              {item.variants?.length ?? 0}
            </span>
          ),
        },
        {
          key: "stock",
          heading: "Total stock",
          render: (item) => (
            <span className="font-semibold tabular-nums text-slate-900">
              {Number(item.stock ?? 0).toLocaleString()}
            </span>
          ),
        },
        {
          key: "status",
          heading: "Availability",
          render: (item) => (
            <StatusPill
              active={Boolean(item.isAvailable)}
              yes="In stock"
              no="Out of stock"
            />
          ),
        },
      ]}
    />
  );
}

export function CategoriesPanel(_props: AdminPanelProps) {
  return <CategoriesInterface {..._props} />; 
}

export function AttributesPanel(_props: AdminPanelProps) {
  return <AttributesInterface {..._props} />;
}

export function InventoryPanel(_props: AdminPanelProps) {
  type Inventory = Record<string, unknown> & {
    category?: { name?: string };
    stock?: number;
    isAvailable?: boolean;
  };
  return (
    <ResourcePanel<Inventory>
      title="Inventory"
      description="Review live stock at the variant level. Stock changes are recorded through the inventory movement API and reflected in this view."
      endpoint="/api/inventory"
      rowKey={(item) => String(item.variantId)}
      emptyTitle="No inventory records found"
      emptyDescription="Variant stock records will appear here once products are created."
      columns={[
        {
          key: "product",
          heading: "Product",
          render: (item) => (
            <div>
              <p className="font-semibold text-slate-900">
                {valueText(item.productName)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {valueText(item.productId as string)}
              </p>
            </div>
          ),
        },
        {
          key: "variant",
          heading: "Variant",
          render: (item) => valueText(item.variantName),
        },
        {
          key: "sku",
          heading: "SKU",
          render: (item) => (
            <span className="font-mono text-xs">{valueText(item.sku)}</span>
          ),
        },
        {
          key: "category",
          heading: "Category",
          render: (item) => valueText(item.category?.name),
        },
        {
          key: "stock",
          heading: "Stock",
          render: (item) => (
            <span className="font-bold tabular-nums text-slate-900">
              {Number(item.stock ?? 0).toLocaleString()}
            </span>
          ),
        },
        {
          key: "availability",
          heading: "Status",
          render: (item) => (
            <StatusPill
              active={Boolean(item.isAvailable)}
              yes="Available"
              no="Out of stock"
            />
          ),
        },
      ]}
    />
  );
}

export function OrdersPanel(_props: AdminPanelProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          Workspace
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Orders
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Order management workspace.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-700">
          ▣
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">
          Order management is not connected yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          The current catalog API package does not include order endpoints. This
          section is ready for your order list, order details, COD status and
          fulfillment workflows.
        </p>
      </div>
    </section>
  );
}

export function SettingsPanel({ adminEmail }: AdminPanelProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          Workspace
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Settings
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Administrative account and workspace information.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Current administrator
        </p>
        <p className="mt-2 break-all text-base font-semibold text-slate-900">
          {adminEmail}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Your access is validated by the server-side admin guard.
        </p>
      </div>
    </section>
  );
}
