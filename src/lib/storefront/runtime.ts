import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { StorefrontEnv } from "./types";
// This file contains utilities for image handling and store env for server side

/** Async mode avoids OpenNext static-prerender initialization errors. */
export async function storefrontEnv(): Promise<StorefrontEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as typeof env & StorefrontEnv;
}

export function r2Url(key: string, baseUrl?: string): string {
  if (baseUrl && /^https:\/\//i.test(baseUrl)) {
    return `${baseUrl.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  const prefix = key.startsWith("storefront/hero/slides/")
    ? "/api/storefront/hero-image/"
    : "/api/storefront/media/";
  return `${prefix}${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function safeImageKey(key: string): boolean {
  return (
    !!key &&
    key.length < 500 &&
    !key.includes("..") &&
    !key.includes("\\") &&
    !key.startsWith("/") &&
    !key.includes("//")
  );
}

export function r2FallbackUrl(key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return `/api/storefront/media/${encodedKey}`;
}
