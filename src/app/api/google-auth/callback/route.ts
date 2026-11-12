import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_SESSION_COOKIE,
  GOOGLE_SESSION_SECONDS,
  createGoogleAppSession,
  getGoogleRedirectUri,
  requireGoogleConfig,
  verifyGoogleOAuthState,
  type GoogleAuthEnv,
} from "@/lib/auth/google-session";

type GoogleTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type GoogleJwtHeader = { alg?: string; kid?: string; typ?: string };
type GoogleIdClaims = {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  nonce?: string;
  exp?: number;
  iat?: number;
};

export const dynamic = "force-dynamic";

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(segment))) as T;
}

async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  expectedNonce: string,
): Promise<GoogleIdClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3)
    throw new Error("Google returned a malformed ID token.");

  const header = decodeJsonSegment<GoogleJwtHeader>(parts[0]);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Google returned an unsupported ID token signature.");
  }

  const keysResponse = await fetch(
    "https://www.googleapis.com/oauth2/v3/certs",
    {
      headers: { Accept: "application/json" },
    },
  );
  if (!keysResponse.ok)
    throw new Error("Google signing keys could not be retrieved.");
  const keySet = (await keysResponse.json()) as { keys?: GoogleJwk[] };
  const jwk = keySet.keys?.find(
    (key) => key.kid === header.kid && key.kty === "RSA",
  );
  if (!jwk) throw new Error("Google ID token used an unknown signing key.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!signatureValid)
    throw new Error("Google ID token signature validation failed.");

  const claims = decodeJsonSegment<GoogleIdClaims>(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const audienceValid = Array.isArray(claims.aud)
    ? claims.aud.includes(clientId) &&
      (claims.aud.length === 1 || claims.azp === clientId)
    : claims.aud === clientId;

  if (
    claims.iss !== "https://accounts.google.com" &&
    claims.iss !== "accounts.google.com"
  ) {
    throw new Error("Google ID token issuer is invalid.");
  }
  if (!audienceValid)
    throw new Error(
      "Google ID token audience does not match this application.",
    );
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    throw new Error("Google ID token has expired.");
  }
  if (
    typeof claims.iat !== "number" ||
    claims.iat > now + 300 ||
    claims.iat < now - 3600
  ) {
    throw new Error("Google ID token issue time is invalid.");
  }
  if (claims.nonce !== expectedNonce)
    throw new Error("Google ID token nonce validation failed.");
  if (claims.email_verified !== true)
    throw new Error("The Google account email is not verified.");
  if (!claims.sub || !claims.email || !/^\S+@\S+\.\S+$/.test(claims.email)) {
    throw new Error("Google did not return a valid account identity.");
  }

  return claims;
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login?googleError=1", request.url),
  );
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/google-auth/callback",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { env: rawEnv } = getCloudflareContext();
    const env = rawEnv as GoogleAuthEnv;
    const { clientId, clientSecret, sessionSecret } = requireGoogleConfig(env);
    const redirectUri = getGoogleRedirectUri(env, request.url);
    const audience = new URL(redirectUri).origin;
    if (new URL(request.url).origin !== audience)
      return redirectToLogin(request);
    const returnedState = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    const providerError = request.nextUrl.searchParams.get("error");
    const signedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

    if (providerError || !returnedState || !code || !signedState)
      return redirectToLogin(request);

    const state = await verifyGoogleOAuthState(
      signedState,
      sessionSecret,
      audience,
    );
    if (!state || state.state !== returnedState)
      return redirectToLogin(request);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: state.codeVerifier,
      }),
    });
    const tokenResult = (await tokenResponse
      .json()
      .catch(() => ({}))) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenResult.id_token) {
      throw new Error(
        tokenResult.error_description ||
          tokenResult.error ||
          "Google token exchange failed.",
      );
    }

    const googleIdentity = await verifyGoogleIdToken(
      tokenResult.id_token,
      clientId,
      state.nonce,
    );
    const sessionToken = await createGoogleAppSession(
      {
        sub: googleIdentity.sub!,
        email: googleIdentity.email!.trim().toLowerCase(),
        name: googleIdentity.name,
        picture: googleIdentity.picture,
        aud: audience,
      },
      sessionSecret,
    );

    const response = NextResponse.redirect(
      new URL(state.returnTo, request.url),
    );
    response.cookies.set(GOOGLE_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_SESSION_SECONDS,
    });
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/google-auth/callback",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return redirectToLogin(request);
  }
}
