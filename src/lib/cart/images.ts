/**
 * Cart-only image URL helpers. Deliberately does not import r2FallbackUrl
 * from storefront/runtime: some existing storefront versions do not export it.
 * The fallback uses the EXISTING protected public-product media route.
 */
export function cartImageUrls(
  storageKey: string | null | undefined,
  publicBaseUrl?: string,
): { imageUrl: string | null; fallbackImageUrl: string | null } {
  if (!storageKey) return { imageUrl: null, fallbackImageUrl: null };
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  const sameOrigin = `/api/storefront/media/${encodedKey}`;
  if (!publicBaseUrl || !/^https:\/\//i.test(publicBaseUrl)) {
    return { imageUrl: sameOrigin, fallbackImageUrl: null };
  }
  return {
    imageUrl: `${publicBaseUrl.replace(/\/+$/, "")}/${encodedKey}`,
    fallbackImageUrl: sameOrigin,
  };
}
