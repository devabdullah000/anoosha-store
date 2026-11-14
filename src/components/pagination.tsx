"use client";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;

  pageSizeOptions?: number[];

  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

type PageItem = number | "start-ellipsis" | "end-ellipsis";

function getPageItems(
  currentPage: number,
  totalPages: number,
): PageItem[] {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "end-ellipsis",
      totalPages,
    ];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "start-ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    totalPages,
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);

  const safeCurrentPage = Math.min(
    Math.max(currentPage, 1),
    safeTotalPages,
  );

  const startItem =
    totalItems === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;

  const endItem = Math.min(
    safeCurrentPage * pageSize,
    totalItems,
  );

  const pageItems = getPageItems(
    safeCurrentPage,
    safeTotalPages,
  );

  const baseButton =
    "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-medium text-slate-500">
          Showing{" "}
          <span className="font-bold tabular-nums text-slate-800">
            {startItem}–{endItem}
          </span>{" "}
          of{" "}
          <span className="font-bold tabular-nums text-slate-800">
            {totalItems}
          </span>{" "}
          records
        </p>

        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Rows:
            <select
              value={pageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value))
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center gap-1"
      >
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className={`${baseButton} mr-1 border border-slate-200 text-slate-600 hover:bg-slate-50`}
          aria-label="Previous page"
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
              d="m15 18-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {pageItems.map((item) => {
          if (typeof item !== "number") {
            return (
              <span
                key={item}
                className="grid h-9 min-w-7 place-items-center text-sm text-slate-400"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const active = item === safeCurrentPage;

          return (
            <button
              key={item}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={`${baseButton} ${
                active
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/15"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className={`${baseButton} ml-1 border border-slate-200 text-slate-600 hover:bg-slate-50`}
          aria-label="Next page"
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
              d="m9 18 6-6-6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>
    </div>
  );
}