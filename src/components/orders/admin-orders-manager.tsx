"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LuCheck,
  LuClipboardList,
  LuEye,
  LuLoaderCircle,
  LuPhone,
  LuRefreshCw,
  LuShieldCheck,
  LuTruck,
  LuX,
  LuCircle,
} from "react-icons/lu";
import DataTable from "@/components/data-table";
import Pagination from "@/components/pagination";
import type { DataTableColumn } from "@/components/data-table";
import NotificationPopup from "@/components/storefront/notification-popup";
import type { OrderInfo, OrderListItem, OrderStatus } from "@/lib/orders/types";
import { OrderApiError, updateOrderStatus } from "@/lib/orders/client";
import { money } from "@/lib/storefront/utils";
import { formatOrderDate } from "@/lib/orders/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/orders/payment";
import OrderReceipt from "./order-receipt";
import InvoiceActions from "./invoice-actions";
import { createPortal } from "react-dom";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "processing",
  "delivered",
  "cancelled",
];
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  delivered: "Delivered / received",
  cancelled: "Cancelled",
};
const statusClass: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  processing: "bg-indigo-50 text-indigo-800",
  delivered: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-rose-50 text-rose-800",
};

type Page = {
  data: OrderListItem[];
  page: number;
  total: number;
  pageSize: number;
};

type Result<T> = { success: boolean; message?: string; data?: T };

export default function OrdersInterface() {
  const router = useRouter();
  const [list, setList] = useState<Page | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState<"" | OrderStatus>("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OrderInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // Cancel any obsolete list request when page, size, or status changes.
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filter) query.set("status", filter);
      const response = await fetch(`/api/admin/orders?${query}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      const payload = (await response.json()) as Result<Page>;
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/");
        return;
      }
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(
          payload.message ?? "Unable to retrieve the latest orders.",
        );
      }
      // COUNT(*) OVER() yields no count when an out-of-range page is empty.
      // Return to page 1 after a filter/status change removes the last record.
      if (page > 1 && payload.data.data.length === 0) {
        setPage(1);
        return;
      }
      setList(payload.data);
    } catch (error) {
      if (!controller.signal.aborted) {
        setNotice(
          error instanceof Error ? error.message : "Unable to retrieve orders.",
        );
      }
    } finally {
      if (listAbortRef.current === controller) {
        listAbortRef.current = null;
        setLoading(false);
      }
    }
  }, [page, pageSize, filter, router]);

  useEffect(() => {
    void load();
    return () => listAbortRef.current?.abort();
  }, [load]);

  const openOrder = async (id: string) => {
    if (detailLoading || busy) return;
    setDetailLoading(id);
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(id)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const payload = (await response.json()) as Result<OrderInfo>;
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/");
        return;
      }
      if (!response.ok || !payload.success || !payload.data)
        throw new Error(payload.message ?? "Unable to open order details.");
      setSelected(payload.data);
      setPendingStatus(null);
      setCancelReason("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to open order details.",
      );
    } finally {
      setDetailLoading(null);
    }
  };

  const columns: DataTableColumn<OrderListItem>[] = [
    {
      key: "order",
      header: "Order",
      width: "18%",
      render: (row) => (
        <div className="min-w-[145px]">
          <p className="break-all font-extrabold text-slate-900">
            {row.orderNumber}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatOrderDate(row.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      width: "19%",
      render: (row) => (
        <div className="min-w-[155px]">
          <p className="font-bold text-slate-900">{row.customerName}</p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {row.userEmail}
          </p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      width: "15%",
      render: (row) => (
        <a
          href={`tel:${row.phone}`}
          aria-label={`Call ${row.customerName} at ${row.phone}`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-indigo-700 hover:underline"
        >
          <LuPhone className="h-3.5 w-3.5" />
          {row.phone}
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "12%",
      render: (row) => (
        <span
          className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${statusClass[row.status]}`}
        >
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      width: "12%",
      render: (row) => (
        <span className="whitespace-nowrap text-xs font-bold text-slate-700">
          {PAYMENT_METHOD_LABELS[row.paymentMethod]}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Total (PKR)",
      align: "right",
      width: "12%",
      render: (row) => (
        <span className="whitespace-nowrap font-black text-slate-900">
          {money(row.totalPaisa)}
        </span>
      ),
    },
    {
      // This is the common DataTable's action column. Your shared table's
      // built-in three-dot menu hardcodes "Update"/"Delete"; a native View all
      // action avoids editing that shared component across other admin modules.
      key: "actions",
      header: "Actions",
      align: "right",
      width: "12%",
      render: (row) => (
        <button
          type="button"
          onClick={() => void openOrder(row.id)}
          disabled={detailLoading !== null || busy}
          aria-label={`View all details for ${row.orderNumber}`}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50"
        >
          {detailLoading === row.id ? (
            <LuLoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LuEye className="h-4 w-4" />
          )}
          View all
        </button>
      ),
    },
  ];

  const available: OrderStatus[] =
    selected?.status === "pending"
      ? ["processing", "delivered", "cancelled"]
      : selected?.status === "processing"
        ? ["delivered", "cancelled"]
        : selected?.status === "delivered"
          ? ["cancelled"]
          : [];

  async function commitStatus() {
    if (
      !selected ||
      !pendingStatus ||
      busy ||
      !available.includes(pendingStatus)
    )
      return;
    if (pendingStatus === "cancelled" && cancelReason.trim().length < 5) {
      setNotice(
        "A cancellation reason of at least five characters is required.",
      );
      return;
    }
    setBusy(true);
    try {
      await updateOrderStatus(
        selected.id,
        pendingStatus,
        pendingStatus === "cancelled" ? cancelReason.trim() : undefined,
      );
      setPendingStatus(null);
      setCancelReason("");
      setSelected(null);
      // One refresh shows authoritative status from D1 without a duplicate detail GET.
      await load();
    } catch (error) {
      if (error instanceof OrderApiError && error.status === 401) {
        router.replace("/login");
        return;
      }
      if (error instanceof OrderApiError && error.status === 403) {
        router.replace("/");
        return;
      }
      setNotice(
        error instanceof Error ? error.message : "Unable to update this order.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      if (pendingStatus) setPendingStatus(null);
      else setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected, pendingStatus, busy]);

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Orders
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review delivery contacts, view full invoices and manage fulfillment.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
        >
          <LuRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-xs font-bold text-slate-700">
          Order status
          <select
            value={filter}
            onChange={(event) => {
              setPage(1);
              setFilter(event.target.value as "" | OrderStatus);
            }}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs font-semibold text-slate-500">
          {list?.total ?? 0} matching orders
        </span>
      </div>

      <DataTable<OrderListItem>
        columns={columns}
        data={list?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyMessage="No orders match the selected status."
        loadingMessage="Loading current orders..."
        ariaLabel="Anoosha Store customer orders"
      />
      {/* Same shared pagination layout as Products, Categories and Inventory. */}
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil((list?.total ?? 0) / pageSize))}
        totalItems={list?.total ?? 0}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={(nextPage) => {
          if (loading || nextPage === page) return;
          setPage(nextPage);
        }}
        onPageSizeChange={(nextPageSize) => {
          if (loading || nextPageSize === pageSize) return;
          setPage(1);
          setPageSize(nextPageSize);
        }}
      />

      {selected &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[6000] overflow-y-auto overscroll-contain bg-slate-950/70 px-3 py-5 backdrop-blur-sm sm:px-6 sm:py-8"
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-order-detail-title"
              className="mx-auto w-full max-w-5xl rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl"
            >
              <div className="rounded-[15px] bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
                      Order management
                    </p>

                    <h3
                      id="admin-order-detail-title"
                      className="mt-2 break-all text-xl font-black text-slate-950 sm:text-2xl"
                    >
                      {selected.orderNumber}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      Current status:{" "}
                      <strong>{STATUS_LABELS[selected.status]}</strong>
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Payment method:{" "}
                      <strong>
                        {PAYMENT_METHOD_LABELS[selected.paymentMethod]}
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close order details"
                    disabled={busy}
                    onClick={() => {
                      setSelected(null);
                      setPendingStatus(null);
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-50"
                  >
                    <LuX className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                      Delivery contact
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                      {selected.customerName}
                    </p>

                    <p className="mt-1 break-words text-xs text-slate-600">
                      {selected.addressLine1}
                      {selected.addressLine2
                        ? `, ${selected.addressLine2}`
                        : ""}
                      , {selected.city}, {selected.province}, {selected.country}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`tel:${selected.phone}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white"
                    >
                      <LuPhone />
                      {selected.phone}
                    </a>

                    <a
                      href={`mailto:${selected.userEmail}`}
                      className="inline-flex min-h-10 items-center rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-700"
                    >
                      Email customer
                    </a>
                  </div>
                </div>

                {available.length > 0 ? (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
                      Order actions
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {available.includes("processing") && (
                        <button
                          type="button"
                          onClick={() => setPendingStatus("processing")}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <LuClipboardList className="h-4 w-4" />
                          Mark as processing
                        </button>
                      )}

                      {available.includes("delivered") && (
                        <button
                          type="button"
                          onClick={() => setPendingStatus("delivered")}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <LuTruck className="h-4 w-4" />
                          Mark as delivered / received
                        </button>
                      )}

                      {available.includes("cancelled") && (
                        <button
                          type="button"
                          onClick={() => setPendingStatus("cancelled")}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <LuCircle className="h-4 w-4" />
                          Cancel order
                        </button>
                      )}
                    </div>

                    {selected.status === "delivered" && (
                      <p className="mt-3 text-xs font-semibold text-amber-800">
                        Cancellation of a delivered order does not automatically
                        put stock back. Record physical returns through the
                        Inventory module.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                    <LuShieldCheck className="h-4 w-4" />
                    This cancelled order is final and cannot be reopened.
                  </p>
                )}

                <div className="my-6 flex justify-end">
                  <InvoiceActions order={selected} />
                </div>

                <div>
                  <OrderReceipt order={selected} />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {selected && pendingStatus && (
        <div className="fixed inset-0 z-[1100000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-order-status-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <h3
              id="confirm-order-status-title"
              className="text-lg font-black text-slate-950"
            >
              {pendingStatus === "cancelled"
                ? "Cancel this order?"
                : `Mark as ${STATUS_LABELS[pendingStatus]}?`}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {selected.orderNumber}. This status change will be recorded in the
              order audit trail.
            </p>
            {pendingStatus === "cancelled" && (
              <label className="mt-5 block text-xs font-bold text-slate-800">
                Cancellation reason (required)
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  maxLength={500}
                  placeholder="Explain why this order is being cancelled"
                  className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </label>
            )}
            {pendingStatus === "cancelled" &&
              selected.status === "delivered" && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  Delivered orders require manual physical-return
                  reconciliation. Inventory will not be increased automatically.
                </p>
              )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingStatus(null);
                  setCancelReason("");
                }}
                className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700"
              >
                Keep current status
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  (pendingStatus === "cancelled" &&
                    cancelReason.trim().length < 5)
                }
                onClick={() => void commitStatus()}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white disabled:opacity-50 ${pendingStatus === "cancelled" ? "bg-rose-600" : "bg-indigo-600"}`}
              >
                {busy ? (
                  <LuLoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LuCheck className="h-4 w-4" />
                )}
                {busy ? "Saving..." : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
      <NotificationPopup
        open={notice !== null}
        title="Order management"
        description={notice ?? ""}
        variant="error"
        onClose={() => setNotice(null)}
      />
    </section>
  );
}
