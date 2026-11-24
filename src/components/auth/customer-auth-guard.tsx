"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

/**
 * Optional UI-only customer gate for protected sections.
 * The server page validates HttpOnly cookies before rendering and
 * VerifiedAuthProfile updates Redux without another client identity API call.
 * Every protected SERVER page/API still validates cookies independently.
 */
export function CustomerAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, status } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && profile?.role !== "user") {
      router.replace("/");
    }
  }, [profile?.role, router, status]);

  if (status !== "authenticated" || profile?.role !== "user") {
    return (
      <main className="grid min-h-[50vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">Checking customer access…</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
