import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { orderDetails, OrderError } from "@/lib/orders/server";
import OrderReceipt from "@/components/orders/order-receipt";
import InvoiceActions from "@/components/orders/invoice-actions";
import { VerifiedAuthProfile } from "@/components/auth/verified-auth-profile";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Order Receipt | Anoosha Store",
  robots: { index: false, follow: false },
};
type Props = { params: Promise<{ orderId: string }> };
export default async function ReceiptPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "user") redirect("/admin/dashboard");
  let order;
  try {
    order = await orderDetails(
      { id: user.id, email: user.email.trim().toLowerCase(), role: "user" },
      (await params).orderId,
    );
  } catch (e) {
    if (e instanceof OrderError && e.status === 404) notFound();
    throw e;
  }
  return (
    <main className="min-h-[70vh] bg-[radial-gradient(ellipse_at_top_left,#fff2fb_0%,#fff_36%,#f1f9ff_110%)] px-4 py-10 print:bg-white print:p-0 sm:px-6">
      <VerifiedAuthProfile email={user.email} role="user" />
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/orders" className="text-sm font-bold text-indigo-700">
            Back to my orders
          </Link>
          <InvoiceActions order={order} />
        </div>
        <OrderReceipt order={order} />
      </div>
    </main>
  );
}
