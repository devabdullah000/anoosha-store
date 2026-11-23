"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";

import ConfirmationPopup from "@/components/confirmation-popup";
import type {
  AttributeDefinition,
  CategoryDefinition,
  Product,
} from "./product-types";
import ProductVariantCard from "./product-variant-card";
import {
  blankProduct,
  blankVariant,
  fromProduct,
  serializeProduct,
} from "./product-editor-model";
import type { EditorProduct, EditorVariant } from "./product-editor-model";

type Props = {
  mode: "create" | "update";
  productId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};
type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
  warnings?: string[];
};
type PageResult<T> = {
  success: boolean;
  message?: string;
  data?: T[];
  pagination?: { totalPages: number };
};

async function jsonResponse<T extends { success: boolean; message?: string }>(
  response: Response,
): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("The server returned an invalid response.");
  }
  const message =
    "message" in payload && typeof payload.message === "string"
      ? payload.message
      : "The request failed.";
  if (!response.ok || !("success" in payload) || payload.success !== true) {
    throw new Error(message);
  }
  return payload as T;
}

async function fetchAll<T>(
  endpoint: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetch(`${endpoint}?page=${page}&limit=100`, {
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
    const payload = await jsonResponse<PageResult<T>>(response);
    if (!Array.isArray(payload.data) || !payload.pagination)
      throw new Error(`Invalid ${endpoint} response.`);
    results.push(...payload.data);
    if (page >= payload.pagination.totalPages) return results;
  }
  throw new Error(
    "Too many catalog pages; narrow the list before editing products.",
  );
}

export default function ProductForm({
  mode,
  productId,
  onClose,
  onSuccess,
}: Props) {
  const [draft, setDraft] = useState<EditorProduct | null>(null);
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [definitions, setDefinitions] = useState<AttributeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmSimple, setConfirmSimple] = useState(false);
  const [error, setError] = useState("");
  const blobUrls = useRef(new Set<string>());
  const submitting = useRef(false);
  const [initializationKey] = useState(`${mode}:${productId ?? "new"}`);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const [catalogCategories, catalogAttributes, productResponse] =
          await Promise.all([
            fetchAll<CategoryDefinition>("/api/categories", controller.signal),
            fetchAll<AttributeDefinition>("/api/attributes", controller.signal),
            mode === "update" && productId
              ? fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
                  credentials: "same-origin",
                  cache: "no-store",
                  signal: controller.signal,
                })
              : Promise.resolve(null),
          ]);
        if (controller.signal.aborted) return;
        const product = productResponse
          ? (await jsonResponse<ApiResult<Product>>(productResponse)).data
          : null;
        if (mode === "update" && !product)
          throw new Error("Product could not be loaded.");
        setCategories(catalogCategories);
        setDefinitions(catalogAttributes);
        setDraft(product ? fromProduct(product) : blankProduct());
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load product editor.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [initializationKey, mode, productId]);

  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (saving || confirmSave || confirmSimple) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [saving, confirmSave, confirmSimple, onClose]);

  const previewUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    blobUrls.current.add(url);
    return url;
  }, []);
  const updateVariant = (clientId: string, patch: Partial<EditorVariant>) => {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            variants: previous.variants.map((v) =>
              v.clientId === clientId ? { ...v, ...patch } : v,
            ),
          }
        : null,
    );
    setError("");
  };
  const removeVariant = (clientId: string) => {
    setDraft((previous) => {
      if (!previous || previous.variants.length <= 1) return previous;
      const variants = previous.variants.filter((v) => v.clientId !== clientId);
      if (!variants.some((v) => v.isDefault))
        variants[0] = { ...variants[0], isDefault: true };
      return { ...previous, variants };
    });
  };
  const makeDefault = (clientId: string) => {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            variants: previous.variants.map((v) => ({
              ...v,
              isDefault: v.clientId === clientId,
            })),
          }
        : null,
    );
  };
  const turnSimple = () => {
    setDraft((previous) => {
      if (!previous) return null;
      const preferred =
        previous.variants.find((v) => v.isDefault) ?? previous.variants[0];
      return { ...previous, variants: [{ ...preferred, isDefault: true }] };
    });
    setConfirmSimple(false);
  };
  const checkForm = () => {
    if (!draft) {
      throw new Error("The product editor has not loaded.");
    }

    // Check allocations before opening confirmation or making an API request.
    for (const [index, variant] of draft.variants.entries()) {
      for (const attribute of variant.attributes) {
        if (attribute.kind !== "dropdown") continue;

        const allocated = attribute.options.reduce(
          (sum, option) => sum + option.quantity,
          0,
        );

        if (allocated > variant.stock) {
          const attributeName =
            definitions.find((item) => item.id === attribute.attributeId)
              ?.name ?? "Dropdown attribute";
          const variantName =
            draft.variants.length === 1
              ? draft.name.trim() || "Simple product"
              : variant.name.trim() || `Variant ${index + 1}`;
          const excess = allocated - variant.stock;

          throw new Error(
            `The "${attributeName}" options for "${variantName}" have ${allocated} units allocated, ` +
              `but the variant stock is ${variant.stock}. ` +
              (mode === "create"
                ? `Reduce option quantities by ${excess}, or increase initial stock to at least ${allocated}.`
                : `Reduce option quantities by ${excess}. Existing stock cannot be edited here; use Inventory to adjust stock first.`),
          );
        }
      }
    }

    // A simple product still has one internal variant; use the product name.
    // This is a new object, so Cancel leaves the original draft unchanged.
    const draftToSave: EditorProduct =
      draft.variants.length === 1
        ? {
            ...draft,
            variants: [
              {
                ...draft.variants[0],
                name: draft.name.trim(),
                isDefault: true,
              },
            ],
          }
        : draft;

    return serializeProduct(draftToSave);
  };
  const prepareSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      checkForm();
      setError("");
      setConfirmSave(true);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Please check product fields.";
      setError(message);
      toast.error(message);
    }
  };
  const save = async () => {
    if (submitting.current || !draft) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = checkForm();
      const body = new FormData();
      body.append("payload", JSON.stringify(payload));
      for (const variant of draft.variants) {
        for (const image of variant.images) {
          if (image.uploadId && image.file)
            body.append(`file:${image.uploadId}`, image.file, image.file.name);
        }
      }
      const url =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${encodeURIComponent(productId ?? "")}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        credentials: "same-origin",
        cache: "no-store",
        body,
      });
      // Do not manually set Content-Type for multipart/form-data.
      const result = await jsonResponse<ApiResult<{ id: string }>>(response);
      toast.success(
        result.message ??
          (mode === "create" ? "Product created." : "Product updated."),
      );
      for (const warning of result.warnings ?? []) toast.warning(warning);
      setConfirmSave(false);
      onSuccess();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to save product.";
      setError(message);
      toast.error(message);
      throw new Error(message); // ConfirmationPopup remains open on error.
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const isUpdate = mode === "update";
  const variantMode = (draft?.variants.length ?? 0) > 1;

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/65 p-2 sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving &&
          !confirmSave &&
          !confirmSimple
        )
          onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[20px] bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[19px] bg-white"
        >
          <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">
                Anoosha Store · Catalog manager
              </p>
              <h2
                id="product-form-title"
                className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                {isUpdate ? "Edit product" : "Add new product"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Everything stays in this form until you confirm and save.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              aria-label="Close product editor"
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              ×
            </button>
          </header>
          {loading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-medium text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              Loading product editor...
            </div>
          ) : !draft ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
              <p role="alert" className="text-sm text-rose-700">
                {error || "Unable to load product."}
              </p>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : (
            <form
              onSubmit={prepareSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-7 sm:py-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      Product information
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      Required *
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Product name *
                      </span>
                      <input
                        required
                        maxLength={120}
                        value={draft.name}
                        placeholder="e.g. Wireless Gaming Mouse"
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        className="text-black h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Category *
                      </span>
                      <select
                        required
                        value={draft.categoryId}
                        onChange={(e) =>
                          setDraft({ ...draft, categoryId: e.target.value })
                        }
                        className="text-black h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Product visibility
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.status}
                        onChange={(e) =>
                          setDraft({ ...draft, status: e.target.checked })
                        }
                        className="h-5 w-5 accent-indigo-600"
                      />{" "}
                      Active
                    </label>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Product variants
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        You can turn it on if your product has multiple
                        varients.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={variantMode}
                      disabled={saving}
                      onClick={() =>
                        variantMode
                          ? setConfirmSimple(true)
                          : setDraft({
                              ...draft,
                              variants: [...draft.variants, blankVariant()],
                            })
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${variantMode ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      <span
                        className={`relative h-5 w-9 rounded-full transition ${variantMode ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${variantMode ? "left-[18px]" : "left-0.5"}`}
                        />
                      </span>
                      {variantMode ? "Variants on" : "Simple product"}
                    </button>
                  </div>
                  {variantMode && (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {draft.variants.length} variants in this product
                      </p>
                      <button
                        type="button"
                        disabled={draft.variants.length >= 20}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            variants: [...draft.variants, blankVariant()],
                          })
                        }
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                      >
                        + Add variant
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-5">
                  {draft.variants.map((variant, index) => (
                    <ProductVariantCard
                      key={variant.clientId}
                      variant={variant}
                      index={index}
                      total={draft.variants.length}
                      stockEditable={mode === "create"}
                      definitions={definitions}
                      onChange={(patch) =>
                        updateVariant(variant.clientId, patch)
                      }
                      onRemove={() => removeVariant(variant.clientId)}
                      onMakeDefault={() => makeDefault(variant.clientId)}
                      onPreviewUrl={previewUrl}
                      onError={(message) => {
                        setError(message);
                        toast.error(message);
                      }}
                    />
                  ))}
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs leading-5 text-indigo-800">
                  <strong>Pending changes only.</strong> Images are not uploaded
                  and variants/attributes are not saved or deleted while you
                  edit. Closing or canceling leaves the original product
                  untouched. Initial stock is recorded when a product is
                  created. Later stock adjustments belong to Inventory.
                </div>
              </div>
              <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-7 sm:py-4">
                {error && (
                  <div
                    role="alert"
                    className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    {error}
                  </div>
                )}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-400">
                    {draft.variants.length} variant
                    {draft.variants.length === 1 ? "" : "s"} ·{" "}
                    {draft.variants.reduce((n, v) => n + v.images.length, 0)}{" "}
                    image(s)
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50 sm:flex-none"
                    >
                      {isUpdate ? "Review update" : "Review product"}
                    </button>
                  </div>
                </div>
              </footer>
            </form>
          )}
        </div>
      </div>
      <ConfirmationPopup
        open={confirmSave}
        title={isUpdate ? "Confirm product update" : "Confirm product creation"}
        description={
          isUpdate
            ? "Save all staged product, variant, image, stock, attribute and category changes? Removed images and variants will be removed from the live catalog."
            : "Create this product and upload the selected images to R2?"
        }
        confirmText={isUpdate ? "Update product" : "Create product"}
        loadingText="Saving product..."
        variant="primary"
        isLoading={saving}
        onConfirm={save}
        onClose={() => {
          if (!saving) setConfirmSave(false);
        }}
      />
      <ConfirmationPopup
        open={confirmSimple}
        title="Switch to simple product?"
        description="Keep only the default variant in the draft and discard the other draft variants. Your live product will not change until you save the form."
        confirmText="Keep one variant"
        variant="primary"
        onConfirm={turnSimple}
        onClose={() => setConfirmSimple(false)}
      />
    </div>
  );
}
