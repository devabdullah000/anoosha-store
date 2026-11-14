"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

import ConfirmationPopup from "./confirmation-popup";

export type DataTableColumn<T> = {
  key: string;
  header: string;

  // Receives the complete row and its index.
  render: (row: T, rowIndex: number) => ReactNode;

  width?: string;
  align?: "left" | "center" | "right";

  headerClassName?: string;
  cellClassName?: string;
};

type RowId = string | number;

type ActionMenuState = {
  rowId: RowId;
  top: number;
  left: number;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data?: T[];

  // Must return a unique and stable ID for each row.
  getRowId: (row: T) => RowId;

  // Controls visibility of the final Actions column.
  actionButton?: boolean;

  // Called when the user selects Update.
  onUpdateCallFunction?: (row: T) => void;

  // Called only after the user confirms deletion.
  onDeleteCallFunction?: (row: T) => void | Promise<void>;

  // Delete confirmation popup configuration.
  deleteConfirmationTitle?: string;
  deleteConfirmationMessage?: (row: T) => ReactNode;
  deleteConfirmText?: string;

  isLoading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  ariaLabel?: string;
};

const alignmentClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function DataTable<T>({
  columns,
  data = [],
  getRowId,
  actionButton = false,
  onUpdateCallFunction,
  onDeleteCallFunction,
  deleteConfirmationTitle = "Confirm deletion",
  deleteConfirmationMessage,
  deleteConfirmText = "Confirm delete",
  isLoading = false,
  emptyMessage = "No records found.",
  loadingMessage = "Loading records...",
  ariaLabel = "Data table",
}: DataTableProps<T>) {
  const [actionMenu, setActionMenu] =
    useState<ActionMenuState | null>(null);

  const [rowPendingDelete, setRowPendingDelete] =
    useState<T | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  const hasActions = Boolean(
    onUpdateCallFunction || onDeleteCallFunction
  );

  const columnCount = Math.max(
    columns.length + (actionButton ? 1 : 0),
    1
  );

  const activeMenuRow =
    actionMenu === null
      ? undefined
      : data.find(
          (row) => getRowId(row) === actionMenu.rowId
        );

  // Open the action menu in a portal so it is not clipped
  // by the table's horizontal scrolling container.
  const handleActionMenuToggle = (
    event: MouseEvent<HTMLButtonElement>,
    rowId: RowId
  ) => {
    if (actionMenu?.rowId === rowId) {
      setActionMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const menuWidth = 176;
    const menuHeight =
      (onUpdateCallFunction ? 48 : 0) +
      (onDeleteCallFunction ? 48 : 0) +
      16;

    const preferredTop = rect.bottom + 8;

    const top =
      preferredTop + menuHeight > window.innerHeight
        ? Math.max(8, rect.top - menuHeight - 8)
        : preferredTop;

    const left = Math.max(
      8,
      Math.min(
        rect.right - menuWidth,
        window.innerWidth - menuWidth - 8
      )
    );

    setActionMenu({
      rowId,
      top,
      left,
    });
  };

  // Close the action menu when clicking outside,
  // pressing Escape, resizing, or scrolling.
  useEffect(() => {
    if (!actionMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      if (actionMenuRef.current?.contains(target)) return;

      if (target.closest("[data-table-action-trigger]")) return;

      setActionMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionMenu(null);
      }
    };

    const closeMenu = () => {
      setActionMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [actionMenu]);

  const handleUpdate = (row: T) => {
    setActionMenu(null);
    onUpdateCallFunction?.(row);
  };

  const handleDeleteRequest = (row: T) => {
    setActionMenu(null);
    setRowPendingDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (rowPendingDelete === null || !onDeleteCallFunction) {
      return;
    }

    await onDeleteCallFunction(rowPendingDelete);
  };

  const handleCloseDeleteConfirmation = () => {
    setRowPendingDelete(null);
  };

  return (
    <>
      {/* Gradient table border */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]">
        <div className="overflow-hidden rounded-[15px] bg-white">
          <div className="overflow-x-auto">
            {columns.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No table columns configured.
              </div>
            ) : (
              <table
                className="w-full min-w-[640px] border-collapse text-sm"
                aria-label={ariaLabel}
              >
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        style={{ width: column.width }}
                        className={`px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                          alignmentClasses[column.align ?? "left"]
                        } ${column.headerClassName ?? ""}`}
                      >
                        {column.header}
                      </th>
                    ))}

                    {actionButton && (
                      <th
                        scope="col"
                        className="w-20 px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-4 py-12 text-center text-sm text-slate-500"
                      >
                        <span className="inline-flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="opacity-30"
                            />
                            <path
                              d="M21 12a9 9 0 0 0-9-9"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                          {loadingMessage}
                        </span>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-4 py-12 text-center text-sm text-slate-500"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    data.map((row, rowIndex) => {
                      const rowId = getRowId(row);

                      return (
                        <tr
                          key={rowId}
                          className="transition hover:bg-slate-50/70"
                        >
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              style={{ width: column.width }}
                              className={`px-4 py-4 align-middle text-sm text-slate-700 ${
                                alignmentClasses[column.align ?? "left"]
                              } ${column.cellClassName ?? ""}`}
                            >
                              {column.render(row, rowIndex)}
                            </td>
                          ))}

                          {actionButton && (
                            <td className="px-4 py-3 text-right align-middle">
                              {hasActions ? (
                                <button
                                  type="button"
                                  data-table-action-trigger
                                  aria-label={`Actions for row ${String(rowId)}`}
                                  aria-haspopup="menu"
                                  aria-expanded={
                                    actionMenu?.rowId === rowId
                                  }
                                  onClick={(event) =>
                                    handleActionMenuToggle(event, rowId)
                                  }
                                  className="inline-grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  >
                                    <circle cx="5" cy="12" r="1.7" />
                                    <circle cx="12" cy="12" r="1.7" />
                                    <circle cx="19" cy="12" r="1.7" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Three-dot action menu, rendered outside the scrolling table */}
      {actionMenu &&
        activeMenuRow !== undefined &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={actionMenuRef}
            role="menu"
            aria-label="Row actions"
            style={{
              position: "fixed",
              top: actionMenu.top,
              left: actionMenu.left,
            }}
            className="z-[110] w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {onUpdateCallFunction && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleUpdate(activeMenuRow)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="m14 5 5 5M4 20l4.5-1 10.8-10.8a2.12 2.12 0 0 0-3-3L5.5 16 4 20Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Update
              </button>
            )}

            {onDeleteCallFunction && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleDeleteRequest(activeMenuRow)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Delete
              </button>
            )}
          </div>,
          document.body
        )}

      {/* Delete confirmation popup */}
      <ConfirmationPopup
        open={rowPendingDelete !== null}
        title={deleteConfirmationTitle}
        description={
          rowPendingDelete !== null
            ? deleteConfirmationMessage?.(rowPendingDelete) ??
              "Are you sure you want to delete this record? This action cannot be undone."
            : undefined
        }
        confirmText={deleteConfirmText}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDeleteConfirmation}
      />
    </>
  );
}