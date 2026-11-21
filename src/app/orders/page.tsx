import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { orderList } from "@/lib/orders/server";
import OrdersClient from "@/components/orders/orders-client";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Orders | Anoosha Store",
  robots: { index: false, follow: false },
};
type Props = { searchParams: Promise<{ page?: string }> };
export default async function OrdersPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "user") redirect("/admin/dashboard");
  const page = Math.max(
    1,
    Math.min(10000, Number((await searchParams).page) || 1),
  );
  const data = await orderList(
    { id: user.id, email: user.email.trim().toLowerCase(), role: "user" },
    page,
  );
  return (
    <main className="min-h-[70vh] bg-[radial-gradient(ellipse_at_top_left,#fff2fb_0%,#fff_36%,#f1f9ff_110%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          Your purchase history from Anoosha Store
        </p>
        <h1 className="mt-3 mb-8 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Your orders
        </h1>

        <OrdersClient items={data.data} page={data.page} total={data.total} />
      </div>
    </main>
  );
}
