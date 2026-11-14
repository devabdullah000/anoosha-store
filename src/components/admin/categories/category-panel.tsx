"use client";

import { useCallback, useState } from "react";
import { toast } from "react-toastify";

import DataTable from "../../../components/data-table";
import type { DataTableColumn } from "../../../components/data-table";

import SearchInput from "../../../components/search-input";
import type { PaginatedApiResponse } from "../../../components/search-input";

import Pagination from "../../../components/pagination";

import CategoryForm from "./cateogry-form";
import type { Category } from "./category-types";
import type { AdminPanelProps } from "../admin-panels";

const categoryColumns: DataTableColumn<Category>[] = [
  {
    key: "name",
    header: "Category",
    width: "25%",
    render: (category) => (
      <p className="font-semibold text-slate-900">{category.name}</p>
    ),
  },
  {
    key: "description",
    header: "Description",
    width: "35%",
    render: (category) => (
      <span className="block line-clamp-2 text-slate-500">
        {category.description || "—"}
      </span>
    ),
  },
  {
    key: "productCount",
    header: "Products",
    width: "15%",
    align: "center",
    render: (category) => (
      <span
        className={`inline-flex min-w-9 items-center justify-center rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
          category.productCount > 0
            ? "bg-indigo-50 text-indigo-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {category.productCount.toLocaleString()}
      </span>
    ),
  },
  {
    key: "updatedAt",
    header: "Last updated",
    width: "20%",
    render: (category) => (
      <span className="whitespace-nowrap text-xs text-slate-500">
        {category.updatedAt
          ? new Date(category.updatedAt).toLocaleDateString()
          : "—"}
      </span>
    ),
  },
];

type FormMode = "create" | "update" | null;

type ApiDeleteResponse = {
  success: boolean;
  message?: string;
};

export function CategoriesInterface(_props: AdminPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // SearchInput sends the GET request and returns its result here.
  const handleSearchResults = useCallback(
    (result: PaginatedApiResponse<Category>) => {
      setCategories(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);

      // Keep the UI synchronized with the server's resolved page.
      setPage(result.pagination.page);
      setPageSize(result.pagination.limit);
    },
    [],
  );

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleSearchError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  // A changed search always begins from page 1.
  const handleSearchQueryChange = useCallback(() => {
    setPage(1);
  }, []);

  const openCreateForm = () => {
    setSelectedCategory(null);
    setFormMode("create");
  };

  const handleUpdateCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormMode("update");
  };

  const closeCategoryForm = () => {
    setFormMode(null);
    setSelectedCategory(null);
  };

  const handleCategoryFormSuccess = (_category: Category) => {
    closeCategoryForm();

    // The shared search component will issue another request.
    setPage(1);
    setRefreshKey((current) => current + 1);
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      const url = new URL("/api/categories", window.location.origin);

      url.searchParams.set("id", category.id);

      const response = await fetch(url.toString(), {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const result = (await response
        .json()
        .catch(() => null)) as ApiDeleteResponse | null;

      if (!response.ok || !result || result.success !== true) {
        throw new Error(result?.message ?? "Unable to delete category.");
      }

      toast.success(result.message ?? "Category deleted successfully.");

      // Refresh the current search and page.
      setRefreshKey((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete category.";

      toast.error(message);

      // Re-throw so the shared ConfirmationPopup knows the
      // operation failed and does not close.
      throw new Error(message);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Categories
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Review and manage the categories used to organize your storefront
            and products.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add category
        </button>
      </div>

      {/* Search and results summary */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <SearchInput<Category>
          apiUrl="/api/categories"
          page={page}
          pageSize={pageSize}
          debounceMs={350}
          placeholder="Search categories..."
          refreshKey={refreshKey}
          onResults={handleSearchResults}
          onLoadingChange={handleLoadingChange}
          onError={handleSearchError}
          onQueryChange={handleSearchQueryChange}
        />
      </div>

      {/* Shared table */}
      <div className="min-w-0">
        <DataTable<Category>
          columns={categoryColumns}
          data={categories}
          getRowId={(category) => category.id}
          actionButton={true}
          onUpdateCallFunction={handleUpdateCategory}
          onDeleteCallFunction={handleDeleteCategory}
          deleteConfirmationTitle="Delete category?"
          deleteConfirmationMessage={(category) =>
            category.productCount > 0
              ? `This category currently contains ${category.productCount} product${
                  category.productCount === 1 ? "" : "s"
                }. Remove or reassign ${
                  category.productCount === 1
                    ? "this product"
                    : "these products"
                } before deleting the category.`
              : `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
          }
          deleteConfirmText="Delete category"
          emptyMessage="No categories found. Create your first category to organize your products."
          loadingMessage="Loading categories..."
          isLoading={isLoading}
          ariaLabel="Categories"
        />
      </div>

      {/* Shared pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
      />

      {/* Create/update form */}
      {formMode !== null && (
        <CategoryForm
          mode={formMode}
          category={selectedCategory}
          onClose={closeCategoryForm}
          onSuccess={handleCategoryFormSuccess}
        />
      )}
    </div>
  );
}
