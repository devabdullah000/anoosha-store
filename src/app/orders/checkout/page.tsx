import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { loadCart } from "@/lib/cart/server";
import CheckoutClient from "@/components/orders/checkout-client";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout | Anoosha Store",
  robots: { index: false, follow: false },
};
type Props = { searchParams: Promise<{ mode?: string }> };
export default async function CheckoutPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "user") redirect("/admin/dashboard");
  const mode =
    (await searchParams).mode === "direct"
      ? ("direct" as const)
      : ("cart" as const);
  const cart =
    mode === "cart"
      ? await loadCart({ id: user.id, email: user.email.trim().toLowerCase() })
      : null;
  return <CheckoutClient mode={mode} initialCart={cart} email={user.email} />;
}
