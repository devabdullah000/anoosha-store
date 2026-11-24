"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearAccessTokenCache } from "@/lib/auth/access-token";
import { consumeGoogleSignInPending } from "@/lib/auth/google-login-pending";
import {
  clearAuthProfile,
  setAuthProfile,
  setAuthPreview,
  type AuthProfile,
} from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

type SessionIdentityResponse = {
  profile?: { email?: unknown; role?: unknown } | null;
};

function isProtectedPage(pathname: string): boolean {
  return (
    pathname === "/admin/dashboard" ||
    pathname.startsWith("/admin/dashboard/") ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/")
  );
}

/**
 * One persistent bootstrap in the root layout.
 *
 * Public navigation: NO session checks, only Redux Persist profile preview.
 * Protected navigation: the SERVER page checks the session and passes the
 * verified identity into VerifiedAuthProfile; no duplicate identity API call.
 * Google OAuth: one recovery check after the full-page callback redirect.
 */
export function AuthBootstrap() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  // Leaving a protected route makes the cached public navbar identity
  // display-only. No network request is made here.
  useEffect(() => {
    if (!isProtectedPage(pathname)) {
      dispatch(setAuthPreview());
    }
  }, [dispatch, pathname]);

  // Google OAuth uses a full browser redirect, unlike Better Auth email login.
  // Only the initiating tab has this non-secret sessionStorage marker.
  useEffect(() => {
    // The callback marker also works when OAuth starts on www and returns to
    // the apex. It carries NO identity or credential information.
    const url = new URL(window.location.href);
    const returnedFromGoogle =
      url.searchParams.get("googleAuthComplete") === "1";
    if (returnedFromGoogle) {
      url.searchParams.delete("googleAuthComplete");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
    const pendingInThisTab = consumeGoogleSignInPending();
    if (!pendingInThisTab && !returnedFromGoogle) return;

    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/session/current", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (response.status === 401) {
          dispatch(clearAuthProfile());
          clearAccessTokenCache();
          return;
        }
        if (!response.ok) {
          // A temporary server failure must not turn an unverified persisted
          // profile into an authenticated one.
          return;
        }
        const body = (await response.json()) as SessionIdentityResponse;
        if (controller.signal.aborted) return;
        const email = body.profile?.email;
        const role = body.profile?.role;
        if (
          typeof email === "string" &&
          email.trim() &&
          (role === "user" || role === "admin")
        ) {
          const verifiedProfile: AuthProfile = { email: email.trim(), role };
          dispatch(setAuthProfile(verifiedProfile));
        } else {
          dispatch(clearAuthProfile());
          clearAccessTokenCache();
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Google session recovery failed:", error);
        }
      }
    })();

    return () => controller.abort();
  }, [dispatch]);

  return null;
}
