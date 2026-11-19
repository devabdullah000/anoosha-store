"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

type ConfirmationVariant = "danger" | "primary";

export type ConfirmationPopupProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;

  confirmText: string;
  cancelText?: string;
  loadingText?: string;

  variant?: ConfirmationVariant;
  isLoading?: boolean;
  closeOnEscape?: boolean;

  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ConfirmationPopup({
  open,
  title,
  description,
  children,
  confirmText,
  cancelText = "Cancel",
  loadingText = "Processing...",
  variant = "danger",
  isLoading = false,
  closeOnEscape = true,
  onConfirm,
  onClose,
}: ConfirmationPopupProps) {
  const titleId = useId();
  const descriptionId = useId();

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = submitting || isLoading;

  useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    setSubmitting(false);
    cancelButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || busy || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, closeOnEscape, onClose]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (busy) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The operation could not be completed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmButtonClasses =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500"
      : "bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 text-white hover:brightness-105 focus-visible:ring-blue-500";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 sm:p-6">
      {/* Gradient border */}
      <div className="w-full max-w-md rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[15px] bg-white p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                variant === "danger"
                  ? "bg-rose-50 text-rose-600"
                  : "bg-indigo-50 text-indigo-600"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M12 9v4m0 4h.01M10.3 3.86 1.82 18.14A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-2.86L13.7 3.86a2 2 0 0 0-3.4 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id={titleId}
                className="text-base font-bold text-slate-900 sm:text-lg"
              >
                {title}
              </h2>

              {description && (
                <div
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-slate-500"
                >
                  {description}
                </div>
              )}
            </div>
          </div>

          {children && (
            <div className="mt-5 text-sm text-slate-600">{children}</div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"
            >
              {errorMessage}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelButtonRef}
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleConfirm}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClasses}`}
            >
              {busy && (
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
              )}

              {busy ? loadingText : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
