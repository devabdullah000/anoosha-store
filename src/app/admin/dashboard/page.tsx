export const dynamic = "force-dynamic";

import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";
import { requireAdmin } from "@/lib/auth/require-auth";

/**
 * The server guard is the security boundary. The Redux guard additionally
 * keeps client-side admin UI hidden unless the validated profile has role=admin.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return (
    <AdminAuthGuard>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Anoosha Store</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Admin dashboard</h1>
        <p className="mt-3 text-slate-600">Signed in as {admin.email}</p>
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Protected dashboard placeholder. Add your product, category, order, and inventory management here.
        </p>
      </main>
    </AdminAuthGuard>
  );
}
