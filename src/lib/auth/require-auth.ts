import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuth } from "@/lib/auth";
import {
  GOOGLE_SESSION_COOKIE,
  getGoogleSessionAudience,
  verifyGoogleAppSession,
  type GoogleAuthEnv,
} from "@/lib/auth/google-session";

/**
 * Resolve an identity INSIDE the current server request (no extra HTTP call).
 * Better Auth's signed cookie cache is used for ordinary customer reads when
 * enabled in getAuth(). Admin identities are always rechecked against D1, so a
 * revoked admin role cannot remain authorized solely due to a stale cookie.
 *
 * Call getCurrentUser({ forceFresh: true }) for particularly sensitive writes
 * when immediate revocation must be honored. No client Redux data is trusted.
 */
export async function getCurrentUser(options: { forceFresh?: boolean } = {}) {
  const requestHeaders = await headers();
  const auth = getAuth();

  let betterAuthUser;

  if (options.forceFresh) {
    const session = await auth.api.getSession({
      headers: requestHeaders,
      query: { disableCookieCache: true },
    });
    betterAuthUser = session?.user ?? null;
  } else {
    const session = await auth.api.getSession({ headers: requestHeaders });
    betterAuthUser = session?.user ?? null;

    // Important: a cached admin claim must not survive a server-side role
    // change. Explicitly fetch the current admin role from the database.
    if (betterAuthUser?.role === "admin") {
      const fresh = await auth.api.getSession({
        headers: requestHeaders,
        query: { disableCookieCache: true },
      });
      betterAuthUser = fresh?.user ?? null;
    }
  }

  if (betterAuthUser) return betterAuthUser;

  // Google OAuth uses a completely separate, HMAC-signed HttpOnly cookie.
  const cookieStore = await cookies();
  const googleCookie = cookieStore.get(GOOGLE_SESSION_COOKIE)?.value;
  if (!googleCookie) return null;

  const { env: rawEnv } = getCloudflareContext();
  const env = rawEnv as GoogleAuthEnv;
  const googleSession = await verifyGoogleAppSession(
    googleCookie,
    env.GOOGLE_SESSION_SECRET,
    getGoogleSessionAudience(env),
  );
  if (!googleSession) return null;

  return {
    id: `google:${googleSession.sub}`,
    name: googleSession.name ?? googleSession.email,
    email: googleSession.email,
    emailVerified: true,
    image: googleSession.picture ?? null,
    role: "user" as const,
    provider: "google" as const,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Only customers may enter customer UI; admins cannot access cart/orders. */
export async function requireCustomer() {
  const user = await requireUser();
  if (user.role !== "user") redirect("/");
  return user;
}

/** Server-side authorization is mandatory for every protected admin route/action. */
export async function requireAdmin() {
  // Avoid an initial cookie-cache session check followed by a second fresh
  // check. Admin entry performs ONE fresh server-side session validation.
  const user = await getCurrentUser({ forceFresh: true });
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return user;
}
