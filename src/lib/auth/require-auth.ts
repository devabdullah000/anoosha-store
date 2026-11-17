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
 * Resolve the authenticated server identity.
 * Email/password sessions are Better Auth + D1. Google sessions are validated
 * from their separate signed HttpOnly cookie and do not create D1 auth rows.
 */
export async function getCurrentUser() {
  const betterAuthSession = await getAuth().api.getSession({ 
    headers: await headers(),
    query: {
    disableCookieCache: true,
  },
  });
  if (betterAuthSession?.user) return betterAuthSession.user;

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

  // Google identities use a distinct namespaced ID and can never be admins.
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

/** Server-side authorization is mandatory for every protected admin route/action. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
