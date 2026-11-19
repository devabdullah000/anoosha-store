import { readHeroState, heroBucket } from "@/lib/storefront/hero";
import { safeImageKey } from "@/lib/storefront/runtime";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join("/");
  if (!safeImageKey(key) || !key.startsWith("storefront/hero/slides/"))
    return new Response(null, { status: 404 });
  try {
    const { manifest } = await readHeroState();
    if (!manifest.slides.some((s) => s.imageKey === key))
      return new Response(null, { status: 404 });
    const object = await (await heroBucket()).get(key);
    if (!object) return new Response(null, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
        ETag: object.httpEtag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
