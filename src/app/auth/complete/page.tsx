export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/require-auth";

/** Legacy landing route retained for old links; the new Google callback is separate. */
export default async function AuthCompletePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "admin" ? "/admin/dashboard" : "/");
}
