"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import DataTable from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import Pagination from "@/components/pagination";
import InventoryForm from "./inventory-form";
import InventoryProductFilter from "./inventory-product-filter";
import type {
  InventoryMovementRow,
  InventoryOperationType,
} from "./inventory-types";
import { downloadInventoryReportPdf } from "./inventory-report-pdf";
import type { InventoryReportFilters } from "./inventory-report-pdf";

type ProductFilter = { id: string; name: string };
type ReportRequest = InventoryReportFilters & {
  requestId: number;
  tzOffsetMinutes: number;
};

type InventoryPage = {
  success: boolean;
  message?: string;
  data?: InventoryMovementRow[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// The Fetch API JSON result is unknown until its shape is checked.
// A type guard avoids assigning unknown directly to InventoryPage.
function isInventoryPage(value: unknown): value is InventoryPage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  if (!("success" in value) || typeof value.success !== "boolean") {
    return false;
  }
  if (
    "message" in value &&
    value.message !== undefined &&
    typeof value.message !== "string"
  ) {
    return false;
  }
  return true;
}

const MAX_PDF_ROWS = 10000;
const PDF_PAGE_SIZE = 100; // The current inventory API accepts 10, 20, 50 or 100.

function formatDate(value: string) {
  const parsed = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
  );
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-PK");
}

const labels: Record<InventoryOperationType | "initial", string> = {
  purchase: "Purchase",
  increase: "Increase",
  decrease: "Decrease",
  initial: "Initial stock",
};

const columns: DataTableColumn<InventoryMovementRow>[] = [
  {
    key: "product",
    header: "Product / variant",
    width: "27%",
    render: (item) => (
      <div className="min-w-44">
        <p className="font-bold text-slate-900">{item.productName}</p>
        {item.hasVariants && (
          <p className="mt-0.5 text-xs text-slate-500">{item.variantName}</p>
        )}
        <p className="mt-0.5 text-[11px] text-slate-400">SKU: {item.sku}</p>
      </div>
    ),
  },
  {
    key: "type",
    header: "Activity",
    width: "13%",
    render: (item) => (
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
          item.type === "purchase"
            ? "bg-indigo-50 text-indigo-700"
            : item.type === "decrease"
              ? "bg-rose-50 text-rose-700"
              : item.type === "increase"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
        }`}
      >
        {labels[item.type]}
      </span>
    ),
  },
  {
    key: "previousQty",
    header: "Before",
    align: "right",
    render: (item) => <span className="tabular-nums">{item.previousQty}</span>,
  },
  {
    key: "qtyDiff",
    header: "Change",
    align: "right",
    render: (item) => (
      <span
        className={`font-bold tabular-nums ${
          item.qtyDiff < 0 ? "text-rose-600" : "text-emerald-700"
        }`}
      >
        {item.qtyDiff > 0 ? "+" : ""}
        {item.qtyDiff}
      </span>
    ),
  },
  {
    key: "newQty",
    header: "After",
    align: "right",
    render: (item) => (
      <strong className="tabular-nums text-slate-800">{item.newQty}</strong>
    ),
  },
  {
    key: "reference",
    header: "Reference / notes",
    width: "22%",
    render: (item) => (
      <div className="min-w-32 max-w-56 break-words">
        <p className="text-xs font-semibold text-slate-800">
          {item.reference || "—"}
        </p>
        {(item.documentNote || item.note) && (
          <p
            className="mt-1 line-clamp-2 text-xs text-slate-500"
            title={item.documentNote || item.note || ""}
          >
            {item.documentNote || item.note}
          </p>
        )}
        {item.createdBy && (
          <p className="mt-1 truncate text-[11px] text-slate-400">
            {item.createdBy}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "createdAt",
    header: "Date",
    render: (item) => (
      <span className="whitespace-nowrap text-xs text-slate-500">
        {formatDate(item.createdAt)}
      </span>
    ),
  },
];

function inventoryUrl(report: ReportRequest, page: number, limit: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    from: report.fromDate,
    to: report.toDate,
    tzOffsetMinutes: String(report.tzOffsetMinutes),
  });
  if (report.type !== "all") params.set("type", report.type);
  if (report.products.length) {
    params.set("productIds", report.products.map((item) => item.id).join(","));
  }
  return `/api/admin/inventory?${params.toString()}`;
}

async function fetchInventoryPage(
  report: ReportRequest,
  page: number,
  limit: number,
  signal?: AbortSignal,
) {
  const response = await fetch(inventoryUrl(report, page, limit), {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  const rawPayload: unknown = await response.json().catch(() => null);
  if (!isInventoryPage(rawPayload)) {
    throw new Error("The inventory API returned an invalid JSON response.");
  }
  const payload = rawPayload;
  if (!response.ok || payload.success !== true) {
    throw new Error(
      payload.message || "Unable to generate the inventory report.",
    );
  }
  if (
    !Array.isArray(payload.data) ||
    !payload.pagination ||
    !Number.isSafeInteger(payload.pagination.total) ||
    !Number.isSafeInteger(payload.pagination.totalPages)
  ) {
    throw new Error("The inventory API returned an invalid report response.");
  }
  return { data: payload.data, pagination: payload.pagination };
}

export default function InventoryInterface() {
  // These filters are draft-only. Changing them does not call the report API.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [type, setType] = useState<"all" | InventoryOperationType>("all");
  const [selectedProducts, setSelectedProducts] = useState<ProductFilter[]>([]);

  // Frozen filter snapshot: the report API is called only after Generate.
  const [report, setReport] = useState<ReportRequest | null>(null);
  const [reportId, setReportId] = useState(0);
  const [rows, setRows] = useState<InventoryMovementRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

  // A changed filter invalidates the previous result, without fetching anew.
  const clearGeneratedReport = () => {
    setReport(null);
    setRows([]);
    setTotal(0);
    setTotalPages(1);
    setPage(1);
    setLoading(false);
  };

  const updateFrom = (value: string) => {
    if (value && toDate && value > toDate) {
      toast.error(
        "From date cannot be after To date. Choose an earlier date or change To date first.",
      );
      return;
    }
    setFromDate(value);
    clearGeneratedReport();
  };

  const updateTo = (value: string) => {
    if (value && fromDate && value < fromDate) {
      toast.error(
        "To date cannot be earlier than From date. Choose a later date or change From date first.",
      );
      return;
    }
    setToDate(value);
    clearGeneratedReport();
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setType("all");
    setSelectedProducts([]);
    clearGeneratedReport();
  };

  const generateReport = () => {
    if (!fromDate || !toDate) {
      toast.error(
        "Select both From date and To date before generating the inventory report.",
      );
      return;
    }
    if (fromDate > toDate) {
      toast.error(
        "From date cannot be later than To date. Correct the date range and try again.",
      );
      return;
    }
    setRows([]);
    setPage(1);
    setTotal(0);
    setTotalPages(1);
    setLoading(true);
    setReportId((value) => value + 1);
    setReport({
      requestId: reportId + 1,
      fromDate,
      toDate,
      type,
      products: selectedProducts.map((product) => ({ ...product })),
      search: "", // Retained for the existing PDF export filter type.
      // Minutes EAST of UTC, as required by the inventory endpoint.
      tzOffsetMinutes: -new Date().getTimezoneOffset(),
    });
  };

  useEffect(() => {
    if (!report) return; // No GET request on initial Inventory navigation.
    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const result = await fetchInventoryPage(
          report,
          page,
          pageSize,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setRows(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        if (controller.signal.aborted) return;
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to generate the inventory report.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [report, page, pageSize]);

  const canDownload = Boolean(report && total > 0 && !loading && !downloading);

  const downloadReport = async () => {
    if (!report || !canDownload) return;
    setDownloading(true);
    const expectedTotal = total;
    try {
      if (expectedTotal > MAX_PDF_ROWS) {
        throw new Error(
          `This report contains ${expectedTotal.toLocaleString()} movements. ` +
            `For a PDF export, narrow your date range to at most ${MAX_PDF_ROWS.toLocaleString()} rows.`,
        );
      }

      let reportRows: InventoryMovementRow[];
      if (page === 1 && rows.length === expectedTotal) {
        // Already have the whole report; zero additional Worker requests.
        reportRows = rows;
      } else {
        // The backend is paginated (maximum 100). Fetch every matching row
        // only when the admin explicitly requests a full PDF export.
        reportRows = [];
        const totalApiPages = Math.ceil(expectedTotal / PDF_PAGE_SIZE);
        for (let nextPage = 1; nextPage <= totalApiPages; nextPage++) {
          const result = await fetchInventoryPage(
            report,
            nextPage,
            PDF_PAGE_SIZE,
          );
          if (result.pagination.total !== expectedTotal) {
            throw new Error(
              "Inventory changed since this report was generated. Generate the report again before downloading.",
            );
          }
          reportRows.push(...result.data);
        }
        if (
          reportRows.length !== expectedTotal ||
          new Set(reportRows.map((item) => item.id)).size !== expectedTotal
        ) {
          throw new Error(
            "The downloaded inventory rows are inconsistent. Generate the report again and retry.",
          );
        }
      }

      await downloadInventoryReportPdf({
        rows: reportRows,
        filters: report,
        generatedAt: new Date(),
      });
      toast.success(
        `Downloaded inventory report (${reportRows.length} movements).`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to download inventory report.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const onPosted = () => {
    setShowForm(false);
    clearGeneratedReport();
    toast.info(
      "Inventory posted. Select dates and click Generate report to see the latest history.",
    );
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Inventory
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Record purchases and manual stock adjustments, with a permanent
            audit trail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <span className="text-lg leading-none">+</span> Add inventory record
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
            History report filters
          </h2>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-bold text-indigo-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              From date *
            </span>
            <input
              required
              type="date"
              value={fromDate}
              onChange={(event) => updateFrom(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-black outline-none focus:border-indigo-400"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              To date *
            </span>
            <input
              required
              type="date"
              value={toDate}
              onChange={(event) => updateTo(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-black outline-none focus:border-indigo-400"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Activity type
            </span>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as "all" | InventoryOperationType);
                clearGeneratedReport();
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-black outline-none focus:border-indigo-400"
            >
              <option value="all">All activities</option>
              <option value="purchase">Purchases</option>
              <option value="increase">Stock increases</option>
              <option value="decrease">Stock decreases</option>
            </select>
          </label>
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Products (multiple)
            </label>
            <InventoryProductFilter
              selected={selectedProducts}
              onChange={(next) => {
                setSelectedProducts(next);
                clearGeneratedReport();
              }}
            />
          </div>
        </div>
        {/* Keep report actions content-sized and right-aligned; wrap on narrow screens. */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={generateReport}
            disabled={downloading}
            className="inline-flex h-11 w-auto max-w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate inventory report"}
          </button>
          <button
            type="button"
            onClick={() => void downloadReport()}
            disabled={!canDownload}
            className="inline-flex h-11 w-auto max-w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
        {invalidDateRange && (
          <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">
            From date must be before or equal to To date.
          </p>
        )}
      </div>

      {!report ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-14 text-center">
          <h2 className="text-sm font-bold text-slate-800">
            No inventory report generated
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Choose a From date and To date, optionally filter by activity or
            products, then click Generate inventory report. No history is
            fetched on page load.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              Report: {report.fromDate} to {report.toDate}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {loading
                  ? "Loading results..."
                  : `${total.toLocaleString()} movement${total === 1 ? "" : "s"}`}
              </span>
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <DataTable
              columns={columns}
              data={rows}
              getRowId={(item) => item.id}
              actionButton={false}
              isLoading={loading}
              emptyMessage="No movements match the selected filters."
              ariaLabel="Inventory movement report"
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(next) => {
                setRows([]);
                setPage(next);
              }}
              onPageSizeChange={(size) => {
                setRows([]);
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
          <p className="text-xs text-slate-500">
            Download exports all matching movements, not only the visible page.
            For long reports, PDF preparation makes additional paginated
            requests only when you click Download.
          </p>
        </div>
      )}

      {showForm && (
        <InventoryForm
          onClose={() => setShowForm(false)}
          onSuccess={onPosted}
        />
      )}
    </div>
  );
}
