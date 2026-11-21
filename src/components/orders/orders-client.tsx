"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuPackage, LuX } from "react-icons/lu";
import type { OrderListItem } from "@/lib/orders/types";
import { cancelOrder, OrderApiError } from "@/lib/orders/client";
import { money } from "@/lib/storefront/utils";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { formatOrderDate } from "@/lib/orders/format";
import NotificationPopup from "@/components/storefront/notification-popup";
import Pagination from "@/components/pagination";
export default function OrdersClient({
  items,
  page,
  total,
}: {
  items: OrderListItem[];
  page: number;
  total: number;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<OrderListItem | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit() {
    if (!cancelling || reason.trim().length < 5) {
      setNotice("Provide a cancellation reason (at least 5 characters).");
      return;
    }
    setBusy(true);
    try {
      await cancelOrder(cancelling.id, reason);
      setCancelling(null);
      setReason("");
      router.refresh();
    } catch (e) {
      if (e instanceof OrderApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setNotice(e instanceof Error ? e.message : "Unable to cancel order.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {items.length === 0 ? (
        <div className="rounded-2xl border bg-white px-6 py-16 text-center">
          <LuPackage className="mx-auto h-12 w-12 text-indigo-500" />
          <h2 className="mt-4 text-xl font-black">No orders yet</h2>
          <Link
            href="/shop"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
          >
            Visit our shop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((o) => (
            <article
              key={o.id}
              className="rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px]"
            >
              <div className="flex flex-col gap-4 rounded-[15px] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-600">
                    {o.orderNumber}
                  </p>
                  <h2 className="mt-2 text-lg font-black text-slate-950">
                    {money(o.totalPaisa)}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Placed {formatOrderDate(o.createdAt)}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                    {o.status}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/orders/${encodeURIComponent(o.id)}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 px-4 text-xs font-extrabold text-indigo-700"
                  >
                    View receipt <LuArrowRight />
                  </Link>
                  {o.canCustomerCancel ? (
                    <button
                      onClick={() => setCancelling(o)}
                      className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700"
                    >
                      Cancel order
                    </button>
                  ) : o.status !== "cancelled" && o.status !== "delivered" ? (
                    <a
                      href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Cancel request ${o.orderNumber}`)}`}
                      className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-indigo-700"
                    >
                      Contact support to cancel
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / 20))}
          totalItems={total}
          pageSize={20}
          onPageChange={(nextPage) =>
            router.push(nextPage === 1 ? "/orders" : `/orders?page=${nextPage}`)
          }
        />
      </div>
      {cancelling && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            className="w-full max-w-lg rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px]"
          >
            <div className="rounded-[15px] bg-white p-6">
              <div className="flex justify-between gap-3">
                <h2 id="cancel-order-title" className="text-lg font-black">
                  Cancel {cancelling.orderNumber}?
                </h2>
                <button
                  onClick={() => setCancelling(null)}
                  disabled={busy}
                  aria-label="Close"
                >
                  <LuX />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Cancellation is available for 15 minutes after placement. Please
                explain the reason.
              </p>
              <textarea
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                className="mt-4 min-h-28 w-full rounded-xl border p-3 text-sm"
                placeholder="Reason for cancellation"
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  disabled={busy}
                  onClick={() => setCancelling(null)}
                  className="min-h-11 rounded-xl border px-5 text-sm font-bold"
                >
                  Keep order
                </button>
                <button
                  disabled={busy}
                  onClick={() => void submit()}
                  className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white"
                >
                  {busy ? "Cancelling..." : "Confirm cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <NotificationPopup
        open={!!notice}
        title="Order notice"
        description={notice}
        variant="error"
        onClose={() => setNotice("")}
      />
    </>
  );
}
