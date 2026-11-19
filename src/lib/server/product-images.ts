import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { inArray, sql } from "drizzle-orm";
import { getDb } from "../../db/index";
import { productImageCleanupJobs } from "../../db/product-schema";
import type { ImageEnvironment,FileData,ImageCleanupJob,ImageCleanupReport } from "./server-types";
import { MAX_IMAGE_BYTES } from "../constants";

export class ImageConfigurationError extends Error {}
export class ImageInputError extends Error {}
export const fileTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function imageEnvironment() {
  const context = await getCloudflareContext({ async: true });
  const env = context.env as typeof context.env & ImageEnvironment;
  if (!env.IMAGES_BUCKET)
    throw new ImageConfigurationError("IMAGES_BUCKET R2 binding is missing.");
  if (!env.R2_PUBLIC_BASE_URL || !/^https:\/\//i.test(env.R2_PUBLIC_BASE_URL)) {
    throw new ImageConfigurationError(
      "R2_PUBLIC_BASE_URL must be an HTTPS R2 custom domain.",
    );
  }
  return {
    bucket: env.IMAGES_BUCKET,
    baseUrl: env.R2_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    zoneId: env.CF_ZONE_ID?.trim(),
    purgeToken: env.CF_CACHE_PURGE_TOKEN?.trim(),
  };
}

export function imageUrl(baseUrl: string, key: string) {
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}


function verifySignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/jpeg")
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  if (contentType === "image/png")
    return (
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
    );
  if (contentType === "image/webp")
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  if (contentType === "image/avif") {
    if (
      bytes.length < 16 ||
      String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp"
    )
      return false;
    const brand = String.fromCharCode(
      ...bytes.slice(8, Math.min(32, bytes.length)),
    );
    return brand.includes("avif") || brand.includes("avis");
  }
  return false;
}

/** Validate files before any R2 write. Keep uploads to <=40 MiB/request. */
export async function validateImageFiles(
  form: FormData,
  ids: string[],
): Promise<FileData[]> {
  const expected = new Set(ids);
  if (expected.size !== ids.length)
    throw new ImageInputError("Duplicate image upload IDs.");
  if (ids.length > 100)
    throw new ImageInputError(
      "At most 100 new images per request are allowed.",
    );
  let total = 0;
  for (const [key, value] of form.entries()) {
    if (key === "payload") continue;
    if (
      !key.startsWith("file:") ||
      !expected.has(key.slice(5)) ||
      !(value instanceof File)
    ) {
      throw new ImageInputError("Unexpected image file or field in request.");
    }
  }
  const files: FileData[] = [];
  for (const uploadId of ids) {
    const values = form.getAll(`file:${uploadId}`);
    if (values.length !== 1 || !(values[0] instanceof File)) {
      throw new ImageInputError(
        "One image file is required for every new image slot.",
      );
    }
    const file = values[0];
    if (
      !fileTypes.has(file.type) ||
      !file.size ||
      file.size > MAX_IMAGE_BYTES
    ) {
      throw new ImageInputError(
        "Images must be JPEG, PNG, WebP or AVIF, up to 5 MB each.",
      );
    }
    total += file.size;
    if (total > 40 * 1024 * 1024)
      throw new ImageInputError("Total uploaded images cannot exceed 40 MB.");
    const signature = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (!verifySignature(file.type, signature))
      throw new ImageInputError(
        "An uploaded image has an invalid file signature.",
      );
    files.push({ uploadId, file });
  }
  return files;
}

/** New UUID keys give safe replacement without rewriting an object referenced by D1. */
export async function uploadImages(
  bucket: R2Bucket,
  productId: string,
  assignments: { variantId: string; uploadId: string; file: File }[],
): Promise<Map<string, string>> {
  const uploaded = new Map<string, string>();
  const attemptedKeys: string[] = [];
  try {
    for (const item of assignments) {
      const ext = fileTypes.get(item.file.type)!;
      const key = `products/${productId}/${item.variantId}/${crypto.randomUUID()}.${ext}`;
      // Track the key before the upload, since a timeout could happen
      // after R2 accepted the object but before the response reaches us.
      attemptedKeys.push(key);
      // File is a sized Blob; unlike an arbitrary ReadableStream, R2 accepts it directly.
      const result = await bucket.put(key, item.file, {
        httpMetadata: {
          contentType: item.file.type,
          cacheControl: "public, max-age=300, s-maxage=31536000",
        },
      });
      if (!result) throw new Error("R2 rejected an image upload.");
      uploaded.set(item.uploadId, key);
    }
    return uploaded;
  } catch (error) {
    if (attemptedKeys.length) {
      try {
        await bucket.delete(attemptedKeys);
      } catch (cleanupError) {
        console.error(
          "Failed to compensate partial/ambiguous R2 uploads",
          cleanupError,
        );
        try {
          await queueOrphanImageCleanup(attemptedKeys);
        } catch (queueError) {
          console.error("Urgent: orphan R2 keys could not be queued", {
            attemptedKeys,
            queueError,
          });
        }
      }
    }
    throw error;
  }
}

/**
 * D1 image-cleanup outbox. Rows are inserted inside the same atomic batch
 * which removes product_images records. This is a durable retry mechanism;
 * neither Cloudflare Cache nor R2 participates in the D1 SQL transaction.
 */
export async function queueOrphanImageCleanup(keys: string[]) {
  if (!keys.length) return;
  const db = getDb();
  const distinct = [...new Set(keys)];
  for (let start = 0; start < distinct.length; start += 25) {
    await db
      .insert(productImageCleanupJobs)
      .values(
        distinct.slice(start, start + 25).map((storageKey) => ({
          id: `imgclean_${crypto.randomUUID()}`,
          storageKey,
        })),
      )
      .onConflictDoNothing({ target: productImageCleanupJobs.storageKey });
  }
}
export type ImageConfig = Awaited<ReturnType<typeof imageEnvironment>>;

export function requireImagePurgeConfig(config: ImageConfig) {
  if (!config.zoneId || !config.purgeToken) {
    throw new ImageConfigurationError(
      "Image removal requires CF_ZONE_ID and CF_CACHE_PURGE_TOKEN. " +
        "Configure the zone for images.anooshastore.com and an API token with Zone.Cache Purge permission.",
    );
  }
  if (!/^[a-f0-9]{32}$/i.test(config.zoneId.trim())) {
    throw new ImageConfigurationError(
      "CF_ZONE_ID must be the 32-character zone ID for anooshastore.com.",
    );
  }
}

function cloudflareErrorDetails(payload: unknown): string {
  if (typeof payload !== "object" || payload === null || !("errors" in payload))
    return "No error details returned";
  const errors = payload.errors;
  if (!Array.isArray(errors)) return "No error details returned";
  return (
    errors
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null)
          return "Unknown Cloudflare error";
        const entry = item as { code?: number; message?: string };
        return `${entry.code ?? ""} ${entry.message ?? "Unknown Cloudflare error"}`.trim();
      })
      .slice(0, 3)
      .join("; ") || "No error details returned"
  );
}

async function purgeImageUrls(
  keys: string[],
  config: ImageConfig,
): Promise<void> {
  if (!keys.length) return;
  requireImagePurgeConfig(config);
  const files = keys.map((key) => imageUrl(config.baseUrl, key));
  let lastError: Error = new Error("Cloudflare CDN purge failed.");
  // Retry transient HTTP/rate-limit failures; do not silently discard API errors.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.purgeToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        response.ok &&
        typeof payload === "object" &&
        payload !== null &&
        "success" in payload &&
        payload.success === true
      )
        return;
      const details = cloudflareErrorDetails(payload);
      lastError = new Error(
        `Cloudflare CDN purge HTTP ${response.status}: ${details}`,
      );
      // Wrong token, wrong zone and invalid requests won't improve on retry.
      if ([400, 401, 403, 404].includes(response.status)) break;
    } catch (cause) {
      lastError =
        cause instanceof Error
          ? cause
          : new Error("Cloudflare CDN is unreachable.");
    }
    if (attempt < 2)
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw lastError;
}

/**
 * Order is intentional: delete the R2 origin object BEFORE purging its CDN URL.
 * Otherwise an in-flight CDN MISS could re-cache an object that still exists.
 * Successful tasks are removed from D1; failures remain retryable.
 */
export async function processImageCleanupJobs(
  jobs: ImageCleanupJob[],
  config: ImageConfig,
): Promise<ImageCleanupReport> {
  if (!jobs.length) return { completed: 0, pending: 0, warnings: [] };
  requireImagePurgeConfig(config);
  const completed: string[] = [];
  const failures: { id: string; error: string }[] = [];
  for (let offset = 0; offset < jobs.length; offset += 20) {
    const batch = jobs.slice(offset, offset + 20);
    const deleted: ImageCleanupJob[] = [];
    try {
      await config.bucket.delete(batch.map((job) => job.storageKey));
      deleted.push(...batch);
    } catch (cause) {
      console.error(
        "R2 bulk image delete failed; trying individual objects",
        cause,
      );
      for (const job of batch) {
        try {
          await config.bucket.delete(job.storageKey);
          deleted.push(job);
        } catch (error) {
          failures.push({
            id: job.id,
            error: `R2 delete: ${String(error)}`.slice(0, 500),
          });
        }
      }
    }
    if (!deleted.length) continue;
    try {
      await purgeImageUrls(
        deleted.map((job) => job.storageKey),
        config,
      );
      completed.push(...deleted.map((job) => job.id));
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Cloudflare purge failed";
      console.error("CDN purge pending; retained cleanup jobs", detail);
      failures.push(
        ...deleted.map((job) => ({ id: job.id, error: detail.slice(0, 500) })),
      );
    }
  }

  const db = getDb();
  const modifications = [];
  if (completed.length) {
    modifications.push(
      db
        .delete(productImageCleanupJobs)
        .where(inArray(productImageCleanupJobs.id, completed)),
    );
  }
  for (const failure of failures) {
    modifications.push(
      db
        .update(productImageCleanupJobs)
        .set({
          attempts: sql`${productImageCleanupJobs.attempts} + 1`,
          lastError: failure.error,
        })
        .where(inArray(productImageCleanupJobs.id, [failure.id])),
    );
  }
  if (modifications.length) {
    try {
      // A single D1 batch records all completed / pending cleanup states.
      const { env } = await getCloudflareContext({ async: true });
      await env.DB.batch(
        modifications.map((query) => {
          const { sql: statement, params } = query.toSQL();
          return env.DB.prepare(statement).bind(...params);
        }),
      );
    } catch (error) {
      console.error(
        "Could not acknowledge image cleanup; jobs will be retried",
        error,
      );
      return {
        completed: 0,
        pending: jobs.length,
        warnings: [
          "Image cleanup finished in storage but database acknowledgement failed; retry cleanup from Products.",
        ],
      };
    }
  }
  return {
    completed: completed.length,
    pending: failures.length,
    warnings: failures.length
      ? [
          `${failures.length} image cleanup operation(s) remain pending. Last error: ${failures[0].error}. Use Retry image cleanup in Products.`,
        ]
      : [],
  };
}

export async function retryPendingImageCleanup(
  limit = 100,
): Promise<ImageCleanupReport> {
  const config = await imageEnvironment();
  requireImagePurgeConfig(config);
  const rows = await getDb()
    .select({
      id: productImageCleanupJobs.id,
      storageKey: productImageCleanupJobs.storageKey,
    })
    .from(productImageCleanupJobs)
    .orderBy(productImageCleanupJobs.createdAt)
    .limit(Math.min(Math.max(limit, 1), 100));
  return processImageCleanupJobs(rows, config);
}
