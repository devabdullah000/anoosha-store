import "server-only";
import { storefrontEnv, r2Url, safeImageKey } from "./runtime";
import {
  DEFAULT_HERO_MANIFEST,
  type HeroManifest,
  type HeroSlide,
  type StorefrontEnvPurge
} from "./types";
import { TYPES } from "../../lib/constants";
//component specific constants
export const HERO_MANIFEST_KEY = "storefront/hero/manifest.json";
const HERO_IMAGE_PREFIX = "storefront/hero/slides/";
export class HeroConflictError extends Error {}
export class HeroInputError extends Error {}

export async function heroBucket(): Promise<R2Bucket> {
  const { IMAGES_BUCKET } = await storefrontEnv();
  if (!IMAGES_BUCKET) throw new Error("Missing IMAGES_BUCKET R2 binding.");
  return IMAGES_BUCKET;
}

function cleanSlide(value: unknown): HeroSlide | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<HeroSlide>;
  if (
    typeof v.id !== "string" ||
    typeof v.imageKey !== "string" ||
    !v.imageKey.startsWith(HERO_IMAGE_PREFIX) ||
    !safeImageKey(v.imageKey)
  )
    return null;
  return {
    id: v.id,
    imageKey: v.imageKey,
    imageUrl: "",
    eyebrow: typeof v.eyebrow === "string" ? v.eyebrow.slice(0, 65) : "",
    title:
      typeof v.title === "string"
        ? v.title.slice(0, 100)
        : "Made for your everyday",
    description:
      typeof v.description === "string" ? v.description.slice(0, 260) : "",
    buttonLabel:
      typeof v.buttonLabel === "string"
        ? v.buttonLabel.slice(0, 35)
        : "Explore collection",
    buttonHref:
      typeof v.buttonHref === "string" && /^\/(?!\/)/.test(v.buttonHref)
        ? v.buttonHref
        : "/shop",
  };
}

export async function readHeroState(): Promise<{
  manifest: HeroManifest;
  etag: string | null;
}> {
  const bucket = await heroBucket();
  const object = await bucket.get(HERO_MANIFEST_KEY);
  if (!object)
    return { manifest: structuredClone(DEFAULT_HERO_MANIFEST), etag: null };
  const raw: unknown = await object.json();
  if (!raw || typeof raw !== "object")
    throw new Error("Hero manifest is invalid.");
  const input = raw as Partial<HeroManifest>;
  const slides = Array.isArray(input.slides)
    ? input.slides
        .map(cleanSlide)
        .filter((s): s is HeroSlide => !!s)
        .slice(0, 5)
    : [];
  const interval = Number(input.intervalMs);
  return {
    manifest: {
      version: 1,
      intervalMs:
        Number.isInteger(interval) && interval >= 2500 && interval <= 30000
          ? interval
          : 6500,
      slides,
    },
    etag: object.etag,
  };
}
export async function publicHero(): Promise<HeroManifest> {
  const { manifest } = await readHeroState();
  const { R2_PUBLIC_BASE_URL } = await storefrontEnv();
  return {
    ...manifest,
    slides: manifest.slides.map((s) => ({
      ...s,
      imageUrl: r2Url(s.imageKey, R2_PUBLIC_BASE_URL),
    })),
  };
}

/** Atomic compare-and-swap avoids overwriting two concurrent admin edits. */
export async function writeHeroState(
  manifest: HeroManifest,
  etag: string | null,
): Promise<void> {
  const bucket = await heroBucket();
  if (manifest.slides.length > 5)
    throw new HeroInputError("Maximum five slides are allowed.");
  const result = await bucket.put(
    HERO_MANIFEST_KEY,
    JSON.stringify({
      ...manifest,
      slides: manifest.slides.map((s) => ({ ...s, imageUrl: "" })),
    }),
    {
      onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
      httpMetadata: {
        contentType: "application/json",
        cacheControl: "no-store",
      },
    },
  );
  if (!result)
    throw new HeroConflictError(
      "Slider was modified by someone else. Refresh and retry.",
    );
}

export async function uploadHeroImage(
  file: File,
  slideId: string,
): Promise<string> {
  if (
    !(file instanceof File) ||
    !TYPES[file.type] ||
    file.size < 32 ||
    file.size > 8 * 1024 * 1024
  )
    throw new HeroInputError(
      "Upload a JPEG, PNG, WebP or AVIF image up to 8 MB.",
    );
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to));
  const valid =
    file.type === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
        : file.type === "image/webp"
          ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
          : ascii(4, 8) === "ftyp" && /avif|avis/.test(ascii(8, 24));
  if (!valid)
    throw new HeroInputError("The image content does not match its file type.");
  const key = `${HERO_IMAGE_PREFIX}${slideId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const result = await (
    await heroBucket()
  ).put(key, file, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
  if (!result) throw new Error("Image upload to R2 failed.");
  return key;
}

/** Delete origin, then best-effort Cloudflare CDN purge. Active slides never use deleted version keys. */
export async function removeHeroImage(key: string): Promise<void> {
  if (!key.startsWith(HERO_IMAGE_PREFIX) || !safeImageKey(key)) return;
  await (await heroBucket()).delete(key);
  const env = await storefrontEnv();
  const extended = env as typeof env & StorefrontEnvPurge;
  if (
    !extended.CF_ZONE_ID ||
    !extended.CF_CACHE_PURGE_TOKEN ||
    !env.R2_PUBLIC_BASE_URL
  )
    return;
  const url = r2Url(key, env.R2_PUBLIC_BASE_URL);
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${extended.CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${extended.CF_CACHE_PURGE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: [url] }),
      },
    );
    const data: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !(
        data &&
        typeof data === "object" &&
        "success" in data &&
        data.success === true
      )
    ) {
      console.error("Hero image purge was not confirmed", {
        code: response.status,
        key,
      });
    }
  } catch (error) {
    console.error("Hero CDN purge failed", error);
  }
}

export function slideFields(
  raw: Record<string, unknown>,
): Pick<
  HeroSlide,
  "title" | "eyebrow" | "description" | "buttonLabel" | "buttonHref"
> {
  const s = (key: string, max: number, fallback = "") =>
    typeof raw[key] === "string"
      ? (raw[key] as string).trim().slice(0, max)
      : fallback;
  const href = s("buttonHref", 150, "/shop");
  if (!/^\/(?!\/)/.test(href) || /[\u0000-\u001f]/.test(href))
    throw new HeroInputError(
      "Slide button must link to a local path such as /shop.",
    );
  const title = s("title", 100);
  if (!title) throw new HeroInputError("Slide title is required.");
  return {
    title,
    eyebrow: s("eyebrow", 65),
    description: s("description", 260),
    buttonLabel: s("buttonLabel", 35, "Shop now"),
    buttonHref: href,
  };
}
