import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_SESSION_COOKIE,
  getGoogleSessionAudience,
  verifyGoogleAppSession,
  type GoogleAuthEnv,
} from "@/lib/auth/google-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(GOOGLE_SESSION_COOKIE)?.value;
  const { env: rawEnv } = getCloudflareContext();
  const env = rawEnv as GoogleAuthEnv;
  const audience = getGoogleSessionAudience(env);
  const requestOrigin = new URL(request.url).origin;
  const profile = requestOrigin === audience
    ? await verifyGoogleAppSession(token, env.GOOGLE_SESSION_SECRET, audience)
    : null;

  return NextResponse.json(
    { profile: profile ? { email: profile.email, role: "user" as const } : null },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
