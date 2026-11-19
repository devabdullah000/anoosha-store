"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DataTable from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import SearchInput from "@/components/search-input";
import type { PaginatedApiResponse } from "@/components/search-input";
import Pagination from "@/components/pagination";
import type { AdminPanelProps } from "../admin-panels";
import type { ProductListItem } from "./product-types";
import ProductForm from "./product-form";
import ProductImagePreview from "./product-image-preview";

const price = (paisa: number) =>
  `Rs. ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const columns: DataTableColumn<ProductListItem>[] = [
  {
    key: "product",
    header: "Product",
    width: "35%",
    render: (product) => (
      <div className="flex min-w-48 items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {product.primaryImageUrl ? (
            <ProductImagePreview
              src={product.primaryImageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-slate-400">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 font-bold text-slate-900">
            {product.name}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {product.categoryName}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "variants",
    header: "Variants",
    align: "center",
    width: "12%",
    render: (product) => (
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
        {product.variantCount} {product.hasVariants ? "variants" : "simple"}
      </span>
    ),
  },
  {
    key: "price",
    header: "From",
    width: "15%",
    render: (product) => (
      <span className="whitespace-nowrap text-sm font-bold text-slate-800">
        {price(product.startingPrice)}
      </span>
    ),
  },
  {
    key: "stock",
    header: "Stock",
    align: "center",
    width: "10%",
    render: (product) => (
      <span
        className={`font-bold tabular-nums ${product.totalStock > 0 ? "text-slate-700" : "text-rose-600"}`}
      >
        {product.totalStock}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "13%",
    render: (product) => (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${product.status ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
      >
        {product.status ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    width: "15%",
    render: (product) => (
      <span className="whitespace-nowrap text-xs text-slate-500">
        {new Date(product.updatedAt).toLocaleDateString()}
      </span>
    ),
  },
];

type FormMode = "create" | "update" | null;
export function ProductsInterface(_props: AdminPanelProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const apiUrl = useMemo(
    () =>
      statusFilter === "all"
        ? "/api/admin/products"
        : `/api/admin/products?status=${statusFilter}`,
    [statusFilter],
  );

  const handleResults = useCallback(
    (result: PaginatedApiResponse<ProductListItem>) => {
      setProducts(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setPage(result.pagination.page);
      setPageSize(result.pagination.limit);
    },
    [],
  );
  const handleError = useCallback(
    (message: string) => toast.error(message),
    [],
  );
  const handleLoading = useCallback((state: boolean) => setLoading(state), []);
  const resetPage = useCallback(() => setPage(1), []);
  const closeForm = () => {
    setFormMode(null);
    setSelectedProductId(null);
  };
  const onFormSuccess = () => {
    closeForm();
    setPage(1);
    setRefreshKey((key) => key + 1);
  };
  // const retryCleanup = async () => {
  //   try {
  //     const response = await fetch("/api/admin/products/image-cleanup", {
  //       method: "POST", credentials: "same-origin", cache: "no-store",
  //       headers: { Accept: "application/json" },
  //     });
  //     const result = await response.json().catch(() => null) as {
  //       success?: boolean; message?: string;
  //       data?: { completed: number; pending: number };
  //       warnings?: string[];
  //     } | null;
  //     if (!response.ok || result?.success !== true) {
  //       throw new Error(result?.message ?? "Image cleanup could not be retried.");
  //     }
  //     toast.success(`${result.data?.completed ?? 0} image cleanup task(s) completed.`);
  //     for (const warning of result.warnings ?? []) toast.warning(warning);
  //   } catch (cause) {
  //     toast.error(cause instanceof Error ? cause.message : "Unable to retry image cleanup.");
  //   }
  // };
  const handleDelete = async (product: ProductListItem) => {
    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(product.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );
      const result = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        warnings?: string[];
      } | null;
      if (!response.ok || result?.success !== true)
        throw new Error(result?.message || "Unable to delete product.");
      toast.success(result.message ?? "Product deleted successfully.");
      for (const warning of result.warnings ?? []) toast.warning(warning);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete product.";
      toast.error(message);
      throw new Error(message); // The shared ConfirmationPopup remains open.
    }
  };
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Products
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage product details, pricing, images and attributes. Stock
            adjustments are handled through Inventory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* <button type="button" onClick={retryCleanup}
            title="Retry R2/CDN cleanup tasks from previous product changes"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            Retry image cleanup
          </button> */}
          <button
            type="button"
            onClick={() => {
              setSelectedProductId(null);
              setFormMode("create");
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"
          >
            <span className="text-lg leading-none">+</span> Add product
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput<ProductListItem>
          apiUrl={apiUrl}
          page={page}
          pageSize={pageSize}
          debounceMs={350}
          placeholder="Search products..."
          refreshKey={refreshKey}
          onResults={handleResults}
          onLoadingChange={handleLoading}
          onError={handleError}
          onQueryChange={resetPage}
        />
        <select
          aria-label="Filter product status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
        >
          <option value="all">All products</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="min-w-0">
        <DataTable<ProductListItem>
          columns={columns}
          data={products}
          getRowId={(product) => product.id}
          actionButton
          onUpdateCallFunction={(product) => {
            setSelectedProductId(product.id);
            setFormMode("update");
          }}
          onDeleteCallFunction={handleDelete}
          deleteConfirmationTitle="Permanently remove from catalog?"
          deleteConfirmationMessage={(product) =>
            `Delete “${product.name}”? The product will be soft-deleted and hidden permanently. Its images will be removed from R2/CDN. This action cannot be undone.`
          }
          deleteConfirmText="Delete product"
          emptyMessage="No products found. Add your first product to populate your catalog."
          loadingMessage="Loading products..."
          isLoading={loading}
          ariaLabel="Products"
        />
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      {formMode && (
        <ProductForm
          mode={formMode}
          productId={selectedProductId}
          onClose={closeForm}
          onSuccess={onFormSuccess}
        />
      )}
    </div>
  );
}
