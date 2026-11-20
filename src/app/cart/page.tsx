import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { loadCart } from "@/lib/cart/server";
import CartClient from "@/components/cart/cart-client";
import { STORE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Your Cart | ${STORE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "user") redirect("/admin/dashboard");
  if (
    typeof user.id !== "string" ||
    !user.id.trim() ||
    typeof user.email !== "string" ||
    !user.email.trim()
  )
    redirect("/login");

  // SSR does the ONLY initial cart read; the client hydrates these same results.
  const initialCart = await loadCart({
    id: user.id,
    email: user.email.trim().toLowerCase(),
  });
  return <CartClient initialCart={initialCart} />;
}
