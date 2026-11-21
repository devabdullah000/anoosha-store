"use client";

import { useCallback, useEffect, useState } from "react";
import { LuEye, LuPlus, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import DataTable, { type DataTableColumn } from "@/components/data-table";
import Pagination from "@/components/pagination";
import ConfirmationPopup from "@/components/confirmation-popup";
import NotificationPopup, {
  type NotificationVariant,
} from "@/components/storefront/notification-popup";
import PromotionForm from "./promotion-form";
import type {
  Page,
  PromotionDetail,
  PromotionListRow,
  PromotionTargets,
  PromotionEditor,
  PromotionAlert,
  PromotionApiResult,
} from "./promotion-types";

const sizes = [10, 20, 50, 100];

const blankRules = (): PromotionTargets => ({
  scope: "products",
  categories: [],
  products: [],
  excludedVariantIds: [],
});
const blank = (): PromotionEditor => ({
  name: "",
  description: "",
  discountPercentage: 10,
  isActive: false,
  targets: blankRules(),
});
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

export default function PromotionsPanel() {
  const [listing, setListing] = useState<Page<PromotionListRow> | null>(null);
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  const [listLoading, setListLoading] = useState(false);
  const [editor, setEditor] = useState<PromotionEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PromotionListRow | null>(null);
  const [alert, setAlert] = useState<PromotionAlert | null>(null);
  const notify = (
    title: string,
    description: string,
    variant: NotificationVariant = "error",
  ) => setAlert({ title, description, variant });
  const load = useCallback(async () => {
    setListLoading(true);
    try {
      setListing(
        await request<Page<PromotionListRow>>(
          `/api/admin/promotions?page=${page}&pageSize=${pageSize}`,
        ),
      );
    } catch (e) {
      notify(
        "Unable to load promotions",
        e instanceof Error ? e.message : "Please retry.",
      );
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize]);
  useEffect(() => {
    void load();
  }, [load]);
  const openCreate = () => {
    setEditor(blank());
  };
  const openEdit = async (row: PromotionListRow) => {
    try {
      const detail = await request<PromotionDetail>(
        `/api/admin/promotions/${encodeURIComponent(row.id)}`,
      );
      setEditor({
        id: detail.id,
        wasActive: detail.isActive,
        name: detail.name,
        description: detail.description || "",
        discountPercentage: detail.discountPercentage,
        isActive: detail.isActive,
        targets: detail.targets,
      });
    } catch (e) {
      notify(
        "Unable to edit promotion",
        e instanceof Error ? e.message : "Please retry.",
      );
    }
  };
  const save = async () => {
    if (!editor || saving) return;
    setSaving(true);
    try {
      const { id, wasActive: _wasActive, ...payload } = editor;
      await request<unknown>(
        id
          ? `/api/admin/promotions/${encodeURIComponent(id)}`
          : "/api/admin/promotions",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      setEditor(null);
      if (page === 1) await load();
      else setPage(1);
      notify(
        "Promotion saved",
        "Promotion and variant coverage saved successfully.",
        "success",
      );
    } catch (e) {
      notify(
        "Unable to save promotion",
        e instanceof Error ? e.message : "Please retry.",
      );
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (row: PromotionListRow) => {
    if (listLoading) return;
    setListLoading(true);
    try {
      await request<unknown>(
        `/api/admin/promotions/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !row.isActive }),
        },
      );
      await load();
      notify(
        "Promotion updated",
        `${row.name} ${row.isActive ? "deactivated" : "activated"}.`,
        "success",
      );
    } catch (e) {
      notify(
        "Activation failed",
        e instanceof Error ? e.message : "Please retry.",
      );
    } finally {
      setListLoading(false);
    }
  };
  const remove = async () => {
    if (!deleting || saving) return;
    setSaving(true);
    try {
      await request<unknown>(
        `/api/admin/promotions/${encodeURIComponent(deleting.id)}`,
        { method: "DELETE" },
      );
      setDeleting(null);
      await load();
      notify(
        "Promotion deleted",
        "The promotion was permanently removed.",
        "success",
      );
    } catch (e) {
      notify(
        "Deletion failed",
        e instanceof Error ? e.message : "Please retry.",
      );
    } finally {
      setSaving(false);
    }
  };
  const columns: DataTableColumn<PromotionListRow>[] = [
    {
      key: "name",
      header: "Promotion",
      render: (r) => (
        <div>
          <p className="font-extrabold text-slate-900">{r.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {r.description || "No description"}
          </p>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Coverage",
      render: (r) => (
        <div className="text-xs">
          <p className="font-semibold capitalize">{r.scope}</p>
          <p className="text-slate-500">
            {r.productsCount} products · {r.variantsCount} variants
          </p>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (r) => (
        <span className="font-black text-indigo-700">
          {r.discountPercentage}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => void openEdit(r)}
            className="min-h-10 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            <LuEye className="mr-1 inline" />
            Edit
          </button>
          <button
            disabled={listLoading}
            onClick={() => void toggle(r)}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {r.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => setDeleting(r)}
            className="min-h-10 rounded-xl border border-rose-100 bg-white px-3 text-rose-600 transition hover:bg-rose-50"
            aria-label={`Delete ${r.name}`}
          >
            <LuTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Promotions
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage promotional campaigns, product coverage and variant
            discounts. Each product may belong to only one active promotion.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={listLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
          >
            <LuRefreshCw
              className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-5 text-xs font-extrabold text-white shadow-sm transition hover:opacity-90"
          >
            <LuPlus className="h-4 w-4" />
            Add promotion
          </button>
        </div>
      </header>
      <DataTable
        columns={columns}
        data={listing?.data ?? []}
        getRowId={(r) => r.id}
        isLoading={listLoading}
        emptyMessage="No promotions yet."
        ariaLabel="Store promotions"
      />
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil((listing?.total ?? 0) / pageSize))}
        totalItems={listing?.total ?? 0}
        pageSize={pageSize}
        pageSizeOptions={sizes}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      {editor && (
        <PromotionForm
          editor={editor}
          saving={saving}
          onChange={(updater) =>
            setEditor((current) => (current ? updater(current) : current))
          }
          onClose={() => setEditor(null)}
          onSave={() => void save()}
          onNotify={notify}
        />
      )}
      <ConfirmationPopup
        open={deleting !== null}
        title="Delete promotion?"
        description={
          deleting
            ? `Permanently delete ${deleting.name} and release all its active product assignments?`
            : ""
        }
        confirmText="Delete promotion"
        cancelText="Keep promotion"
        variant="danger"
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
      <NotificationPopup
        open={!!alert}
        title={alert?.title || ""}
        description={alert?.description || ""}
        variant={alert?.variant || "error"}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
