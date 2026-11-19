"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import {
  clearAccessTokenCache,
  startAccessTokenRefresh,
} from "@/lib/auth/access-token";
import { clearAuthProfile, setAuthProfile } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

type GoogleSessionResponse = {
  profile?: { email?: unknown; role?: unknown } | null;
};

export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const { data: session, isPending } = authClient.useSession();
  const currentUser = session?.user;
  const userId = currentUser?.id;
  const email = currentUser?.email;
  const roleValue = (
    currentUser as (typeof currentUser & { role?: string }) | undefined
  )?.role;
  const role = roleValue === "admin" ? "admin" : "user";

  useEffect(() => {
    if (isPending) return;

    let cancelled = false;
    let stopRefresh: (() => void) | undefined;

    async function hydrateProfile() {
      // Prefer the D1-backed email/password session when it exists. Its role is
      // read from the database, which is how an explicitly seeded admin signs in.
      if (userId && email) {
        if (cancelled) return;
        dispatch(setAuthProfile({ email, role }));
        stopRefresh = startAccessTokenRefresh();
        return;
      }

      clearAccessTokenCache();
      try {
        const response = await fetch("/api/google-auth/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Google session validation failed.");
        const data = (await response.json()) as GoogleSessionResponse;
        const googleEmail = data.profile?.email;

        if (
          !cancelled &&
          typeof googleEmail === "string" &&
          googleEmail.length > 0
        ) {
          // Google sessions are always customers. Never trust a client-supplied role.
          dispatch(setAuthProfile({ email: googleEmail, role: "user" }));
        } else if (!cancelled) {
          dispatch(clearAuthProfile());
        }
      } catch {
        if (!cancelled) dispatch(clearAuthProfile());
      }
    }

    void hydrateProfile();
    return () => {
      cancelled = true;
      stopRefresh?.();
    };
  }, [dispatch, email, isPending, role, userId]);

  return null;
}
