import { requireAdmin } from "@/lib/auth/require-auth";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { VerifiedAuthProfile } from "@/components/auth/verified-auth-profile";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Keep the existing server-side page guard. This page is the only
  // browser route for the admin workspace; all section changes are client state.
  const admin = await requireAdmin();

  return (
    <>
      <VerifiedAuthProfile email={admin.email} role="admin" />
      <AdminWorkspace adminEmail={admin.email} />
    </>
  );
}
