import { getCloudflareContext } from "@opennextjs/cloudflare";

export const GOOGLE_SESSION_COOKIE = "anoosha_google_session";
export const GOOGLE_OAUTH_STATE_COOKIE = "anoosha_google_oauth_state";
export const GOOGLE_SESSION_SECONDS = 7 * 24 * 60 * 60;
export const GOOGLE_OAUTH_STATE_SECONDS = 10 * 60;

export type GoogleAuthEnv = CloudflareEnv & {
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GOOGLE_SESSION_SECRET?: string;
};

export type GoogleAppSession = {
  sub: string;
  email: string;
  role: "user";
  provider: "google";
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
  iss: "anoosha-store-google-auth";
  aud: string;
  purpose: "session";
};

type GoogleOAuthState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  iat: number;
  exp: number;
  iss: "anoosha-store-google-auth";
  aud: string;
  purpose: "oauth-state";
};

type SignedClaims = GoogleAppSession | GoogleOAuthState;

export function getGoogleAuthEnv(): GoogleAuthEnv {
  const { env } = getCloudflareContext();
  return env as GoogleAuthEnv;
}

export function requireGoogleConfig(env: GoogleAuthEnv) {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const sessionSecret = env.GOOGLE_SESSION_SECRET?.trim();

  if (!clientId)
    throw new Error("Missing Cloudflare variable: GOOGLE_CLIENT_ID");
  if (!clientSecret)
    throw new Error("Missing Cloudflare secret: GOOGLE_CLIENT_SECRET");
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      "GOOGLE_SESSION_SECRET must be configured with at least 32 characters.",
    );
  }

  return { clientId, clientSecret, sessionSecret };
}

export function getGoogleRedirectUri(
  env: GoogleAuthEnv,
  requestUrl: string,
): string {
  const configured = env.GOOGLE_REDIRECT_URI?.trim();
  const redirectUri =
    configured || new URL("/api/google-auth/callback", requestUrl).toString();
  const parsed = new URL(redirectUri);
  if (
    parsed.protocol !== "https:" &&
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1"
  ) {
    throw new Error(
      "Google OAuth redirect URI must use HTTPS outside local development.",
    );
  }
  return parsed.toString();
}

export function getGoogleSessionAudience(env: GoogleAuthEnv): string | null {
  const configured =
    env.GOOGLE_REDIRECT_URI?.trim() || env.BETTER_AUTH_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export function safeReturnTo(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  try {
    const parsed = new URL(value, "https://local.invalid");
    if (parsed.origin !== "https://local.invalid") return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function encodeBase64Url(value: string | Uint8Array): string {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function importHmacKey(
  secret: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function signClaims(
  claims: SignedClaims,
  secret: string,
): Promise<string> {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signingInput = `${header}.${payload}`;
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function verifyClaims(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;

    const header = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[0])),
    ) as {
      alg?: string;
      typ?: string;
    };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    const key = await importHmacKey(secret, ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[1])),
    ) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createGoogleOAuthState(
  input: Omit<GoogleOAuthState, "iss" | "purpose">,
  secret: string,
): Promise<string> {
  return signClaims(
    {
      ...input,
      iss: "anoosha-store-google-auth",
      purpose: "oauth-state",
    },
    secret,
  );
}

export async function verifyGoogleOAuthState(
  token: string,
  secret: string,
  audience: string,
): Promise<GoogleOAuthState | null> {
  const claims = await verifyClaims(token, secret);
  const now = Math.floor(Date.now() / 1000);
  if (
    !claims ||
    claims.iss !== "anoosha-store-google-auth" ||
    claims.purpose !== "oauth-state" ||
    claims.aud !== audience ||
    typeof claims.state !== "string" ||
    typeof claims.nonce !== "string" ||
    typeof claims.codeVerifier !== "string" ||
    typeof claims.returnTo !== "string" ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60
  ) {
    return null;
  }
  return claims as GoogleOAuthState;
}

export async function createGoogleAppSession(
  input: Pick<GoogleAppSession, "sub" | "email" | "aud"> &
    Partial<Pick<GoogleAppSession, "name" | "picture">>,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: GoogleAppSession = {
    ...input,
    role: "user",
    provider: "google",
    iat: now,
    exp: now + GOOGLE_SESSION_SECONDS,
    iss: "anoosha-store-google-auth",
    purpose: "session",
  };
  return signClaims(claims, secret);
}

export async function verifyGoogleAppSession(
  token: string | undefined,
  secret: string | undefined,
  audience: string | null,
): Promise<GoogleAppSession | null> {
  if (!token || !secret || secret.length < 32 || !audience) return null;
  const claims = await verifyClaims(token, secret);
  const now = Math.floor(Date.now() / 1000);
  if (
    !claims ||
    claims.iss !== "anoosha-store-google-auth" ||
    claims.purpose !== "session" ||
    claims.aud !== audience ||
    claims.provider !== "google" ||
    claims.role !== "user" ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    typeof claims.email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(claims.email) ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60
  ) {
    return null;
  }
  return claims as GoogleAppSession;
}

export function randomBase64Url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

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

export async function createPkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return encodeBase64Url(new Uint8Array(digest));
}
