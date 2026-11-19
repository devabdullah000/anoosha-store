import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_SECONDS,
  createGoogleOAuthState,
  createPkceChallenge,
  getGoogleRedirectUri,
  randomBase64Url,
  requireGoogleConfig,
  safeReturnTo,
  type GoogleAuthEnv,
} from "@/lib/auth/google-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { env: rawEnv } = getCloudflareContext();
    const env = rawEnv as GoogleAuthEnv;
    const { clientId, sessionSecret } = requireGoogleConfig(env);
    const redirectUri = getGoogleRedirectUri(env, request.url);
    const audience = new URL(redirectUri).origin;
    const state = randomBase64Url(32);
    const nonce = randomBase64Url(32);
    const codeVerifier = randomBase64Url(48);
    const codeChallenge = await createPkceChallenge(codeVerifier);
    const now = Math.floor(Date.now() / 1000);

    const stateCookie = await createGoogleOAuthState(
      {
        state,
        nonce,
        codeVerifier,
        returnTo: safeReturnTo(request.nextUrl.searchParams.get("returnTo")),
        iat: now,
        exp: now + GOOGLE_OAUTH_STATE_SECONDS,
        aud: audience,
      },
      sessionSecret,
    );

    const authorizationUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid email profile");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("prompt", "select_account");

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, stateCookie, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/google-auth/callback",
      maxAge: GOOGLE_OAUTH_STATE_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Google OAuth start failed:", error);
    return NextResponse.redirect(new URL("/login?googleError=1", request.url));
  }
}
