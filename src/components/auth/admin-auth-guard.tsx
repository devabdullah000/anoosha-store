"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

/**
 * Client-side role gate for admin UI components. It reads the Redux Persist
 * profile after AuthBootstrap validates the HttpOnly session cookie.
 * Keep requireAdmin() in the server page/route/action as the real security boundary.
 */
export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, status } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && profile?.role !== "admin")
      router.replace("/");
  }, [profile?.role, router, status]);

  if (status !== "authenticated" || profile?.role !== "admin") {
    return (
      <main className="grid min-h-[50vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">
            Checking administrator access…
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
