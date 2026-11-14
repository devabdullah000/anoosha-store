"use client";

import { useEffect, useState } from "react";

export type PaginatedApiResponse<T> = {
  success: true;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type SearchInputProps<T> = {
  apiUrl: string;

  page: number;
  pageSize: number;

  debounceMs?: number;
  initialValue?: string;
  placeholder?: string;

  refreshKey?: number;

  searchParam?: string;
  pageParam?: string;
  limitParam?: string;

  onResults: (result: PaginatedApiResponse<T>) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (message: string) => void;
  onQueryChange?: (query: string) => void;
};

export default function SearchInput<T>({
  apiUrl,
  page,
  pageSize,
  debounceMs = 350,
  initialValue = "",
  placeholder = "Search...",
  refreshKey = 0,
  searchParam = "search",
  pageParam = "page",
  limitParam = "limit",
  onResults,
  onLoadingChange,
  onError,
  onQueryChange,
}: SearchInputProps<T>) {
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        onLoadingChange?.(true);

        const url = new URL(
          apiUrl,
          window.location.origin,
        );

        const normalizedQuery = query.trim();

        if (normalizedQuery) {
          url.searchParams.set(searchParam, normalizedQuery);
        } else {
          url.searchParams.delete(searchParam);
        }

        url.searchParams.set(pageParam, String(page));
        url.searchParams.set(limitParam, String(pageSize));

        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const payload: unknown = await response.json();

        if (
          !response.ok ||
          typeof payload !== "object" ||
          payload === null ||
          !("success" in payload) ||
          payload.success !== true
        ) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "Unable to retrieve records.";

          throw new Error(message);
        }

        const result = payload as PaginatedApiResponse<T>;

        if (
          !Array.isArray(result.data) ||
          !result.pagination ||
          typeof result.pagination.total !== "number"
        ) {
          throw new Error("The server returned an invalid response.");
        }

        onResults(result);
      } catch (error) {
        if (controller.signal.aborted) return;

        const message =
          error instanceof Error
            ? error.message
            : "Unable to retrieve records.";

        onError?.(message);
      } finally {
        if (!controller.signal.aborted) {
          onLoadingChange?.(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    apiUrl,
    query,
    page,
    pageSize,
    debounceMs,
    refreshKey,
    searchParam,
    pageParam,
    limitParam,
    onResults,
    onLoadingChange,
    onError,
  ]);

  const handleChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const handleClear = () => {
    handleChange("");
  };

  return (
    <div className="relative w-full sm:max-w-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path
            d="m16 16 4 4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
      />
    </div>
  );
}