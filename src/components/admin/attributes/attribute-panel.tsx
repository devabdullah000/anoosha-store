"use client";

import { useCallback, useState } from "react";
import { toast } from "react-toastify";

import DataTable from "../../../components/data-table";
import type { DataTableColumn } from "../../../components/data-table";

import SearchInput from "../../../components/search-input";
import type { PaginatedApiResponse } from "../../../components/search-input";

import Pagination from "../../../components/pagination";

import AttributeForm from "./attribute-form";
import type { Attribute } from "./attributes-types";

import type { AdminPanelProps } from "../admin-panels";

const attributeColumns: DataTableColumn<Attribute>[] = [
  {
    key: "name",
    header: "Attribute",
    width: "25%",
    render: (attribute) => (
      <p className="font-semibold text-slate-900">
        {attribute.name}
      </p>
    ),
  },
  {
    key: "valueType",
    header: "Value type",
    width: "15%",
    render: (attribute) => (
      <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
        {attribute.valueType}
      </span>
    ),
  },
  {
    key: "unit",
    header: "Unit",
    width: "15%",
    render: (attribute) => (
      <span className="text-slate-600">
        {attribute.unit || "—"}
      </span>
    ),
  },
  {
    key: "displayType",
    header: "Display type",
    width: "20%",
    render: (attribute) => (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
        {attribute.displayType}
      </span>
    ),
  },
  {
    key: "updatedAt",
    header: "Last updated",
    width: "25%",
    render: (attribute) => (
      <span className="whitespace-nowrap text-xs text-slate-500">
        {attribute.updatedAt
          ? new Date(attribute.updatedAt).toLocaleDateString()
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

export function AttributesInterface(_props: AdminPanelProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedAttribute, setSelectedAttribute] =
    useState<Attribute | null>(null);

  // SearchInput sends the GET request and returns its result here.
  const handleSearchResults = useCallback(
    (result: PaginatedApiResponse<Attribute>) => {
      setAttributes(result.data);
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
    setSelectedAttribute(null);
    setFormMode("create");
  };

  const handleUpdateAttribute = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setFormMode("update");
  };

  const closeAttributeForm = () => {
    setFormMode(null);
    setSelectedAttribute(null);
  };

  const handleAttributeFormSuccess = (_attribute: Attribute) => {
    closeAttributeForm();

    // Refresh the shared search component after create/update.
    setPage(1);
    setRefreshKey((current) => current + 1);
  };

  const handleDeleteAttribute = async (attribute: Attribute) => {
    try {
      const url = new URL("/api/attributes", window.location.origin);

      url.searchParams.set("id", attribute.id);

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
        throw new Error(
          result?.message ?? "Unable to delete attribute.",
        );
      }

      toast.success(
        result.message ?? "Attribute deleted successfully.",
      );

      // Refresh the current search and page.
      setRefreshKey((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete attribute.";

      toast.error(message);

      // Re-throw so ConfirmationPopup displays the error
      // and remains open when deletion fails.
      throw new Error(message);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Attributes
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Create and manage reusable attributes assigned to your
            product variants.
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
            <path
              d="M12 5v14M5 12h14"
              strokeLinecap="round"
            />
          </svg>

          Add attribute
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <SearchInput<Attribute>
          apiUrl="/api/attributes"
          page={page}
          pageSize={pageSize}
          debounceMs={350}
          placeholder="Search attributes..."
          refreshKey={refreshKey}
          onResults={handleSearchResults}
          onLoadingChange={handleLoadingChange}
          onError={handleSearchError}
          onQueryChange={handleSearchQueryChange}
        />
      </div>

      {/* Shared table */}
      <div className="min-w-0">
        <DataTable<Attribute>
          columns={attributeColumns}
          data={attributes}
          getRowId={(attribute) => attribute.id}
          actionButton={true}
          onUpdateCallFunction={handleUpdateAttribute}
          onDeleteCallFunction={handleDeleteAttribute}
          deleteConfirmationTitle="Delete attribute?"
          deleteConfirmationMessage={(attribute) =>
            `Are you sure you want to delete "${attribute.name}"? An attribute assigned to a product variant cannot be deleted.`
          }
          deleteConfirmText="Delete attribute"
          emptyMessage="No attributes found. Create your first attribute to use it with product variants."
          loadingMessage="Loading attributes..."
          isLoading={isLoading}
          ariaLabel="Attributes"
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
        <AttributeForm
          mode={formMode}
          attribute={selectedAttribute}
          onClose={closeAttributeForm}
          onSuccess={handleAttributeFormSuccess}
        />
      )}
    </div>
  );
}

export function AttributesPanel(_props: AdminPanelProps) {
  return <AttributesInterface {..._props} />;
}