"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import type { Category } from "./category-types";

type CategoryFormProps = {
  mode: "create" | "update";
  category?: Category | null;

  onClose: () => void;
  onSuccess: (category: Category) => void;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: Category;
};

export default function CategoryForm({
  mode,
  category,
  onClose,
  onSuccess,
}: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(
    category?.description ?? "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setFormError("");
  }, [category?.id, mode, category?.name, category?.description]);

  useEffect(() => {
    if (submitting) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, submitting]);

  if (mode === "update" && !category) {
    return null;
  }

  const isUpdate = mode === "update";

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) return;

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();

    if (!normalizedName) {
      setFormError("Category name is required.");
      return;
    }

    if (normalizedName.length > 120) {
      setFormError("Category name cannot exceed 120 characters.");
      return;
    }

    if (normalizedDescription.length > 1000) {
      setFormError("Description cannot exceed 1000 characters.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/categories", {
        method: isUpdate ? "PATCH" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...(isUpdate ? { id: category!.id } : {}),
          name: normalizedName,
          description: normalizedDescription || null,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (
        !response.ok ||
        !result ||
        result.success !== true ||
        !result.data
      ) {
        throw new Error(
          result?.message ??
            `Unable to ${isUpdate ? "update" : "create"} category.`,
        );
      }

      toast.success(
        result.message ??
          `Category ${isUpdate ? "updated" : "created"} successfully.`,
      );

      onSuccess(result.data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
    
      <div className="my-auto w-full max-w-lg rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-form-title"
          className="rounded-[15px] bg-white p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="category-form-title"
                className="text-lg font-bold text-slate-900"
              >
                {isUpdate ? "Update category" : "Add category"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {isUpdate
                  ? "Change the category name or description."
                  : "Create a category to organize your products."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close category form"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="m6 6 12 12M18 6 6 18"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="category-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Category name
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError("");
                }}
                placeholder="e.g. Women's Clothing"
                maxLength={120}
                required
                autoFocus
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50"
              />

              <p className="mt-1.5 text-right text-xs text-slate-400">
                {name.length}/120
              </p>
            </div>

            <div>
              <label
                htmlFor="category-description"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Description
                <span className="ml-2 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                id="category-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setFormError("");
                }}
                placeholder="Describe this category..."
                maxLength={1000}
                rows={4}
                disabled={submitting}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50"
              />

              <p className="mt-1.5 text-right text-xs text-slate-400">
                {description.length}/1000
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
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

                {submitting
                  ? "Saving..."
                  : isUpdate
                    ? "Save changes"
                    : "Create category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}