import { storefrontEnv, safeImageKey } from "@/lib/storefront/runtime";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join("/");
  if (!key.startsWith("products/") || !safeImageKey(key))
    return new Response(null, { status: 404 });
  try {
    const { DB, IMAGES_BUCKET } = await storefrontEnv();
    if (!IMAGES_BUCKET) return new Response(null, { status: 503 });
    const visible = await DB.prepare(
      `SELECT i.id FROM product_images i
      JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id
      WHERE i.storage_key=? AND p.status=1 AND p.deleted_at IS NULL AND v.status=1 AND v.deleted_at IS NULL LIMIT 1`,
    )
      .bind(key)
      .first<{ id: string }>();
    if (!visible) return new Response(null, { status: 404 });
    const object = await IMAGES_BUCKET.get(key);
    if (!object) return new Response(null, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300, s-maxage=86400",
        ETag: object.httpEtag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
