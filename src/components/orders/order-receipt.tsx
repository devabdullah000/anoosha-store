import type { OrderInfo } from "@/lib/orders/types";
import { money } from "@/lib/storefront/utils";
import { LuCheck } from "react-icons/lu";
import { formatOrderDate } from "@/lib/orders/format";
import {
  PAYMENT_METHOD_LABELS,
  paymentAccountNumber,
} from "@/lib/orders/payment";
export default function OrderReceipt({ order }: { order: OrderInfo }) {
  return (
    <article
      id="anoosha-receipt"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none sm:p-10"
    >
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <img
            src="/brand-logo.svg"
            alt="Anoosha Store logo"
            className="h-14 w-14 object-contain"
          />
          <div>
            <h2 className="text-xl font-black uppercase tracking-wide text-slate-950">
              {order.storeName}
            </h2>
            <p className="text-xs text-slate-500">{order.storeAddress}</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-black uppercase text-indigo-700">
            Order receipt
          </p>
          <p className="mt-1 break-all text-sm font-bold text-slate-950">
            {order.orderNumber}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatOrderDate(order.createdAt)}
          </p>
          <p className="mt-1 text-xs font-bold uppercase text-indigo-600">
            {order.status}
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
            Delivery to
          </h3>
          <p className="mt-2 font-bold text-slate-900">{order.customerName}</p>
          <p className="text-slate-600">
            {order.addressLine1}
            {order.addressLine2 ? `, ${order.addressLine2}` : ""}
            <br />
            {order.city}, {order.province}, {order.country}{" "}
            {order.postalCode || ""}
          </p>
          <p className="mt-1 text-slate-600">{order.phone}</p>
        </section>
        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
            Order details
          </h3>
          <p className="mt-2 text-slate-600">Account: {order.userEmail}</p>
          <p className="mt-1 text-slate-600">
            Payment method:{" "}
            <strong className="text-slate-900">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </strong>
          </p>
          {paymentAccountNumber(order.paymentMethod) && (
            <p className="mt-1 text-slate-600">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]} receiving number:{" "}
              <strong className="text-slate-900">
                {paymentAccountNumber(order.paymentMethod)}
              </strong>
            </p>
          )}
          {order.status === "cancelled" && (
            <p className="mt-2 text-rose-600">
              Cancelled: {order.cancellationReason}
            </p>
          )}
        </section>
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3 text-right">Unit / discount</th>
              <th className="px-3 py-3 text-right">Gross</th>
              <th className="px-3 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 align-top">
                <td className="px-3 py-4">
                  <p className="font-extrabold text-slate-900">{item.name}</p>
                  {item.hasVariants && (
                    <p className="mt-1 text-slate-500">
                      Variant: {item.variantName} · {item.sku}
                    </p>
                  )}
                  {item.selections.map((s) => (
                    <p key={s.attributeId} className="mt-1 text-slate-500">
                      {s.name}: {s.values.join(", ")}
                    </p>
                  ))}
                </td>
                <td className="px-3 py-4">{item.quantity}</td>
                <td className="px-3 py-4 text-right">
                  {money(item.originalUnitPaisa)}
                  <p className="text-emerald-600">
                    {item.appliedPromotionName
                      ? `${item.appliedPromotionName} · ${item.discountPercentage}% promotional discount`
                      : `${item.discountPercentage}% off`}
                  </p>
                  <p className="text-slate-500">
                    {money(item.finalUnitPaisa)} net
                  </p>
                </td>
                <td className="px-3 py-4 text-right">
                  {money(item.grossPaisa)}
                </td>
                <td className="px-3 py-4 text-right font-bold">
                  {money(item.netPaisa)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Gross amount</span>
          <strong>{money(order.grossPaisa)}</strong>
        </div>
        <div className="flex justify-between text-emerald-700">
          <span>Discount savings</span>
          <strong>-{money(order.discountPaisa)}</strong>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <strong>{money(order.shippingPaisa)}</strong>
        </div>
        <div className="flex justify-between border-t pt-3 text-lg font-black text-slate-950">
          <span>Grand total</span>
          <span>{money(order.totalPaisa)}</span>
        </div>
      </div>
      <div className="mt-8 flex items-start gap-2 border-t pt-5 text-xs leading-5 text-slate-500">
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
  <LuCheck className="h-6 w-6 shrink-0 text-emerald-600" />
  <p className="text-sm font-semibold leading-relaxed">
    Thank you for shopping with Anoosha Store. We appreciate your trust in us!
  </p>
</div>
    </article>
  );
}
