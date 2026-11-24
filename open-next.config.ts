import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// Persist prerendered pages and explicitly cached public data in R2.
// The DO queue is required for future time-based revalidation.
// Cache interception saves renderer CPU; it does not skip Worker invocations.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  enableCacheInterception: true,
});