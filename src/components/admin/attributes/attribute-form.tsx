
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";

import type {
  Attribute,
  AttributeDisplayType,
} from "./attributes-types";

type AttributeFormProps = {
  mode: "create" | "update";
  attribute?: Attribute | null;
  onClose: () => void;
  onSuccess: (attribute: Attribute) => void;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: Attribute;
};

const displayTypeOptions: {
  value: AttributeDisplayType;
  label: string;
}[] = [
  { value: "dropdown", label: "Dropdown" },
  { value: "button", label: "Button" },
  { value: "color", label: "Color" },
];

export default function AttributeForm({
  mode,
  attribute,
  onClose,
  onSuccess,
}: AttributeFormProps) {
  const [name, setName] = useState(attribute?.name ?? "");

  const [displayType, setDisplayType] =
    useState<AttributeDisplayType>(
      attribute?.displayType ?? "dropdown",
    );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setName(attribute?.name ?? "");
    setDisplayType(attribute?.displayType ?? "dropdown");
    setFormError("");
  }, [
    attribute?.id,
    attribute?.name,
    attribute?.displayType,
    mode,
  ]);

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

  if (mode === "update" && !attribute) {
    return null;
  }

  const isUpdate = mode === "update";

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) return;

    const normalizedName = name.trim();

    if (!normalizedName) {
      setFormError("Attribute name is required.");
      return;
    }

    if (normalizedName.length > 120) {
      setFormError(
        "Attribute name cannot exceed 120 characters.",
      );
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/attributes", {
        method: isUpdate ? "PATCH" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...(isUpdate ? { id: attribute!.id } : {}),
          name: normalizedName,
          valueType: "text",
          displayType,
        }),
      });

      const result = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (
        !response.ok ||
        !result ||
        result.success !== true ||
        !result.data
      ) {
        throw new Error(
          result?.message ??
            `Unable to ${
              isUpdate ? "update" : "create"
            } attribute.`,
        );
      }

      toast.success(
        result.message ??
          `Attribute ${
            isUpdate ? "updated" : "created"
          } successfully.`,
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

  const selectClasses =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50";

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
          aria-labelledby="attribute-form-title"
          className="rounded-[15px] bg-white p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="attribute-form-title"
                className="text-lg font-bold text-slate-900"
              >
                {isUpdate
                  ? "Update attribute"
                  : "Add attribute"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {isUpdate
                  ? "Change the attribute name or display type."
                  : "Create a reusable attribute for your product variants."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close attribute form"
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

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            {/* Attribute name */}
            <div>
              <label
                htmlFor="attribute-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Attribute name
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                id="attribute-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError("");
                }}
                placeholder="e.g. Material"
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

            {/* Display type */}
            <div>
              <label
                htmlFor="attribute-display-type"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Display type
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <select
                id="attribute-display-type"
                value={displayType}
                onChange={(event) => {
                  setDisplayType(
                    event.target
                      .value as AttributeDisplayType,
                  );
                  setFormError("");
                }}
                disabled={submitting}
                className={selectClasses}
              >
                {displayTypeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
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
                    : "Create attribute"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
