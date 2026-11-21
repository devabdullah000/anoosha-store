"use client";

import { useState } from "react";
import { LuDownload, LuLoaderCircle, LuPrinter } from "react-icons/lu";
import type { OrderInfo } from "@/lib/orders/types";

export default function InvoiceActions({ order }: { order: OrderInfo }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { downloadOrderInvoicePdf } =
        await import("@/lib/orders/invoice-jspdf");
      await downloadOrderInvoicePdf(order);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate this invoice.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <LuLoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LuDownload className="h-4 w-4" />
        )}
        {busy ? "Preparing PDF..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <LuPrinter className="h-4 w-4" /> Print / Save as PDF
      </button>
      {error && (
        <p role="alert" className="w-full text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
