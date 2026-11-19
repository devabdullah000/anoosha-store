"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import ConfirmationPopup from "@/components/confirmation-popup";
import InventoryVariantPicker from "./inventory-variant-picker";
import type {
  InventoryOperationType,
  SelectedInventoryVariant,
} from "./inventory-types";

type Line = {
  clientId: string;
  selection: SelectedInventoryVariant | null;
  quantity: string;
};
type SubmitPayload = {
  documentId: string;
  operationType: InventoryOperationType;
  reference: string;
  note: string;
  lines: { variantId: string; quantity: number }[];
};
type Props = { onClose: () => void; onSuccess: () => void };
const input =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-black outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10";
const label =
  "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500";
const newLine = (): Line => ({
  clientId: crypto.randomUUID(),
  selection: null,
  quantity: "",
});

export default function InventoryForm({ onClose, onSuccess }: Props) {
  // Stable for the whole form, including a retry after a network timeout.
  const [documentId] = useState(() => `inv_${crypto.randomUUID()}`);
  const [type, setType] = useState<InventoryOperationType>("purchase");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [pending, setPending] = useState<SubmitPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (pending || busy) return;
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [pending, busy, onClose]);

  function patchLine(id: string, patch: Partial<Line>) {
    setLines((previous) =>
      previous.map((line) =>
        line.clientId === id ? { ...line, ...patch } : line,
      ),
    );
    setFormError("");
  }
  function validate(): SubmitPayload {
    if (type === "purchase" && !reference.trim())
      throw new Error("Enter the purchase invoice/reference number.");
    if (reference.trim().length > 120)
      throw new Error(
        "Invoice/reference is too long (maximum 120 characters).",
      );
    if (note.trim().length > 500)
      throw new Error("Notes cannot exceed 500 characters.");
    if (!lines.length)
      throw new Error("Add at least one product to this document.");
    const used = new Set<string>();
    const items = lines.map((line, index) => {
      const { selection } = line;
      if (!selection)
        throw new Error(`Row ${index + 1}: choose a product or variant.`);
      const qty = Number(line.quantity);
      if (
        !/^\d+$/.test(line.quantity.trim()) ||
        !Number.isSafeInteger(qty) ||
        qty < 1 ||
        qty > 1_000_000
      ) {
        throw new Error(
          `Row ${index + 1}: enter a positive whole-number quantity (maximum 1,000,000).`,
        );
      }
      if (used.has(selection.variantId))
        throw new Error(
          `${selection.productName} / ${selection.variantName} was selected more than once.`,
        );
      used.add(selection.variantId);
      if (type === "decrease" && qty > selection.stock) {
        throw new Error(
          `Cannot decrease "${selection.productName}${selection.hasVariants ? ` / ${selection.variantName}` : ""}" by ${qty} units. Current stock is ${selection.stock}. Enter ${selection.stock} or fewer units.`,
        );
      }
      if (type !== "decrease" && selection.stock + qty > 2_147_483_647) {
        throw new Error(
          `Row ${index + 1}: the resulting stock would be too large.`,
        );
      }
      return { variantId: selection.variantId, quantity: qty };
    });
    return {
      documentId,
      operationType: type,
      reference: reference.trim(),
      note: note.trim(),
      lines: items,
    };
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setPending(validate());
      setFormError("");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Check your inventory document.";
      setFormError(message);
      toast.error(message);
    }
  }
  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(pending),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      if (!response.ok || payload?.success !== true)
        throw new Error(
          payload?.message ?? "Unable to post inventory document.",
        );
      toast.success(payload.message ?? "Inventory document posted.");
      setPending(null);
      onSuccess();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Unable to post inventory document.";
      setFormError(message);
      toast.error(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }
  const totalQuantity = lines.reduce(
    (sum, line) =>
      sum + (Number(line.quantity) > 0 ? Number(line.quantity) : 0),
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-2 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy && !pending)
          onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[20px] bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-form-title"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[19px] bg-white"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">
                Anoosha Store · Stock ledger
              </p>
              <h2
                id="inventory-form-title"
                className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl"
              >
                Post inventory document
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                One operation type per document. All selected items post
                together.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close inventory form"
              disabled={busy}
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl text-slate-600"
            >
              ×
            </button>
          </header>
          <form
            onSubmit={review}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-7 sm:py-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-800">
                  Document information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="inventory-type" className={label}>
                      Transaction type *
                    </label>
                    <select
                      id="inventory-type"
                      value={type}
                      onChange={(event) => {
                        setType(event.target.value as InventoryOperationType);
                        setFormError("");
                      }}
                      className={input}
                    >
                      <option value="purchase">Purchase</option>
                      <option value="increase">Increase stock</option>
                      <option value="decrease">Decrease stock</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="inventory-reference" className={label}>
                      {type === "purchase"
                        ? "Purchase invoice / reference *"
                        : "Reference (optional)"}
                    </label>
                    <input
                      id="inventory-reference"
                      type="text"
                      value={reference}
                      maxLength={120}
                      required={type === "purchase"}
                      onChange={(event) => setReference(event.target.value)}
                      className={input}
                      placeholder={
                        type === "purchase"
                          ? "e.g. INV-2026-001"
                          : "e.g. Stocktake-01"
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="inventory-note" className={label}>
                    Notes (optional)
                  </label>
                  <textarea
                    id="inventory-note"
                    value={note}
                    maxLength={500}
                    rows={2}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Supplier, stocktake reason, damaged goods..."
                    className={`${input} h-auto min-h-20 resize-y py-3`}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Products and quantities
                  </h3>
                  <button
                    type="button"
                    disabled={lines.length >= 25}
                    onClick={() =>
                      setLines((previous) => [...previous, newLine()])
                    }
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                  >
                    + Add product
                  </button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, index) => {
                    const quantity = Number(line.quantity) || 0;
                    const exceeded =
                      type === "decrease" &&
                      Boolean(line.selection) &&
                      quantity > (line.selection?.stock ?? 0);
                    return (
                      <div
                        key={line.clientId}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">
                            Item {index + 1}
                          </span>
                          {lines.length > 1 && (
                            <button
                              type="button"
                              className="text-xs font-bold text-rose-600"
                              onClick={() =>
                                setLines((old) =>
                                  old.filter(
                                    (item) => item.clientId !== line.clientId,
                                  ),
                                )
                              }
                            >
                              Remove ×
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                          <div className="min-w-0">
                            <label className={label}>Product / variant *</label>
                            <InventoryVariantPicker
                              value={line.selection}
                              onSelect={(selection) =>
                                patchLine(line.clientId, { selection })
                              }
                              excludedVariantIds={lines
                                .filter(
                                  (item) => item.clientId !== line.clientId,
                                )
                                .map((item) => item.selection?.variantId)
                                .filter((id): id is string => Boolean(id))}
                            />
                          </div>
                          <div>
                            <label className={label}>Quantity *</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={1000000}
                              step={1}
                              value={line.quantity}
                              onChange={(event) =>
                                patchLine(line.clientId, {
                                  quantity: event.target.value,
                                })
                              }
                              className={input}
                              placeholder="Units"
                            />
                          </div>
                        </div>
                        {line.selection && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                            <span>
                              Current stock:{" "}
                              <strong className="tabular-nums text-slate-800">
                                {line.selection.stock}
                              </strong>
                            </span>
                            <span>
                              {type === "decrease"
                                ? "After decrease"
                                : "After addition"}
                              :{" "}
                              <strong
                                className={`tabular-nums ${exceeded ? "text-rose-600" : "text-indigo-700"}`}
                              >
                                {line.selection.stock +
                                  (type === "decrease" ? -quantity : quantity)}
                              </strong>
                            </span>
                          </div>
                        )}
                        {exceeded && (
                          <p
                            role="alert"
                            className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700"
                          >
                            Quantity exceeds current stock. Enter at most{" "}
                            {line.selection?.stock} units or select a different
                            item.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {lines.length} item(s) · {totalQuantity} units ·{" "}
                  {type === "purchase"
                    ? "Purchase"
                    : type === "increase"
                      ? "Stock increase"
                      : "Stock decrease"}
                </p>
              </div>
            </div>
            <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-7 sm:py-4">
              {formError && (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
                >
                  Review document
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>
      <ConfirmationPopup
        open={Boolean(pending)}
        title={`Confirm ${type === "purchase" ? "purchase" : type === "increase" ? "stock increase" : "stock decrease"}`}
        description={`Post ${pending?.lines.length ?? 0} item(s) as ONE ${type} document? This updates live stock and creates permanent audit records. The posting cannot be edited or deleted.`}
        confirmText="Post inventory document"
        variant="primary"
        loadingText="Posting..."
        isLoading={busy}
        onConfirm={confirm}
        onClose={() => {
          if (!busy) setPending(null);
        }}
      />
    </div>
  );
}
