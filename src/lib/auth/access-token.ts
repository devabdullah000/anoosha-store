"use client";

import { authClient } from "@/lib/auth-client";

type TokenCache = { value: string; expiresAt: number };
let cached: TokenCache | null = null;

function readExpiry(token: string): number {
  const payloadPart = token.split(".")[1];
  if (!payloadPart) throw new Error("The auth server returned an invalid JWT.");
  const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const payload = JSON.parse(atob(padded)) as { exp?: number };
  if (typeof payload.exp !== "number") {
    throw new Error("The auth JWT does not contain an expiry claim.");
  }
  return payload.exp * 1000;
}

/**
 * Obtain an API access JWT from the current Better Auth session.
 * It is intentionally held in module memory only, never Redux/localStorage.
 */
export async function getAccessToken(force = false): Promise<string> {
  if (!force && cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.value;
  }

  const { data, error } = await authClient.token();
  if (error || !data?.token) {
    cached = null;
    throw new Error(error?.message ?? "Your session is no longer valid.");
  }

  cached = { value: data.token, expiresAt: readExpiry(data.token) };
  return cached.value;
}

export function clearAccessTokenCache(): void {
  cached = null;
}

/** Silently replaces the 7-day JWT before expiry while the app remains open. */
export function startAccessTokenRefresh(): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = async () => {
    try {
      const token = await getAccessToken(true);
      if (stopped) return;
      const expiresAt = readExpiry(token);
      const delay = Math.max(30_000, expiresAt - Date.now() - 60_000);
      timer = setTimeout(schedule, delay);
    } catch {
      if (!stopped) timer = setTimeout(schedule, 60_000);
    }
  };

  void schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
