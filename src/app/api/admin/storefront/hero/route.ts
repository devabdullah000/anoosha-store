import { NextRequest, NextResponse } from "next/server";
import { requireAdminServer } from "@/lib/auth/require-admin-server";
import {
  HeroConflictError,
  HeroInputError,
  readHeroState,
  writeHeroState,
  publicHero,
  slideFields,
  uploadHeroImage,
  removeHeroImage,
} from "@/lib/storefront/hero";
import type { HeroManifest } from "@/lib/storefront/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function fail(error: unknown) {
  if (error instanceof HeroInputError)
    return json({ success: false, message: error.message }, 400);
  if (error instanceof HeroConflictError)
    return json({ success: false, message: error.message }, 409);
  console.error("Hero administration failed", error);
  return json({ success: false, message: "Unable to update the slider." }, 500);
}
async function authorized() {
  return requireAdminServer();
}
function limited(request: Request): boolean {
  return Number(request.headers.get("content-length") || 0) > 9 * 1024 * 1024;
}
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // e.g. authenticated CLI/Postman, cross-site browser sends Origin.
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
function csrfCheck(request: NextRequest) {
  return sameOrigin(request)
    ? null
    : json(
        { success: false, message: "Cross-origin changes are not permitted." },
        403,
      );
}
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HeroInputError("Invalid JSON body.");
  return value as Record<string, unknown>;
}
async function formPayload(request: Request) {
  if (limited(request)) throw new HeroInputError("Upload is too large.");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    throw new HeroInputError("Choose a slide image.");
  const fields: Record<string, unknown> = {};
  for (const name of [
    "title",
    "eyebrow",
    "description",
    "buttonLabel",
    "buttonHref",
    "id",
  ])
    fields[name] = form.get(name);
  return { fields, file };
}
export async function GET() {
  const guard = await authorized();
  if (!guard.authorized) return guard.response;
  try {
    return json({
      success: true,
      message: "Slider loaded.",
      data: await publicHero(),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: NextRequest) {
  const guard = await authorized();
  if (!guard.authorized) return guard.response;
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  let uploaded: string | null = null;
  try {
    const { manifest, etag } = await readHeroState();
    if (manifest.slides.length >= 5)
      throw new HeroInputError("Maximum five slides are allowed.");
    const { fields, file } = await formPayload(request);
    const slideId = crypto.randomUUID();
    const values = slideFields(fields);
    uploaded = await uploadHeroImage(file, slideId);
    const slide = { id: slideId, imageKey: uploaded, imageUrl: "", ...values };
    const updated: HeroManifest = {
      ...manifest,
      slides: [...manifest.slides, slide],
    };
    await writeHeroState(updated, etag);
    return json(
      { success: true, message: "Slide created.", data: await publicHero() },
      201,
    );
  } catch (e) {
    // On an ambiguous R2 write failure, do NOT delete the upload: it might already be referenced
    // by a successfully persisted manifest. Only a confirmed CAS conflict is safe to compensate.
    if (uploaded && e instanceof HeroConflictError)
      await removeHeroImage(uploaded).catch(console.error);
    return fail(e);
  }
}
export async function PATCH(request: NextRequest) {
  const guard = await authorized();
  if (!guard.authorized) return guard.response;
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  try {
    if (limited(request)) throw new HeroInputError("Request is too large.");
    const body = obj(await request.json());
    const { manifest, etag } = await readHeroState();
    if ("intervalMs" in body) {
      const interval = Number(body.intervalMs);
      if (!Number.isInteger(interval) || interval < 2500 || interval > 30000)
        throw new HeroInputError(
          "Autoplay interval must be 2500–30000 milliseconds.",
        );
      manifest.intervalMs = interval;
    }
    if (typeof body.id === "string") {
      const slide = manifest.slides.find((s) => s.id === body.id);
      if (!slide) throw new HeroInputError("Slide was not found.");
      Object.assign(slide, slideFields({ ...slide, ...body }));
    } else if (!("intervalMs" in body))
      throw new HeroInputError("Specify a slide ID or intervalMs.");
    await writeHeroState(manifest, etag);
    return json({
      success: true,
      message: "Slider saved.",
      data: await publicHero(),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function PUT(request: NextRequest) {
  const guard = await authorized();
  if (!guard.authorized) return guard.response;
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  let uploaded: string | null = null;
  try {
    const { manifest, etag } = await readHeroState();
    const { fields, file } = await formPayload(request);
    const id = typeof fields.id === "string" ? fields.id : "";
    const slide = manifest.slides.find((s) => s.id === id);
    if (!slide) throw new HeroInputError("Slide was not found.");
    const values = slideFields({ ...slide, ...fields });
    uploaded = await uploadHeroImage(file, id);
    const previousKey = slide.imageKey;
    Object.assign(slide, values, { imageKey: uploaded });
    await writeHeroState(manifest, etag);
    // The current manifest now references a unique URL, never the previous image.
    await removeHeroImage(previousKey).catch((e) =>
      console.error("Previous slide image cleanup:", e),
    );
    return json({
      success: true,
      message: "Slide image replaced.",
      data: await publicHero(),
    });
  } catch (e) {
    // On an ambiguous R2 write failure, do NOT delete the upload: it might already be referenced
    // by a successfully persisted manifest. Only a confirmed CAS conflict is safe to compensate.
    if (uploaded && e instanceof HeroConflictError)
      await removeHeroImage(uploaded).catch(console.error);
    return fail(e);
  }
}
export async function DELETE(request: NextRequest) {
  const guard = await authorized();
  if (!guard.authorized) return guard.response;
  const csrf = csrfCheck(request);
  if (csrf) return csrf;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new HeroInputError("Slide ID is required.");
    const { manifest, etag } = await readHeroState();
    const target = manifest.slides.find((s) => s.id === id);
    if (!target) throw new HeroInputError("Slide was not found.");
    await writeHeroState(
      { ...manifest, slides: manifest.slides.filter((s) => s.id !== id) },
      etag,
    );
    await removeHeroImage(target.imageKey).catch((e) =>
      console.error("Deleted slide image cleanup:", e),
    );
    return json({
      success: true,
      message: "Slide removed.",
      data: await publicHero(),
    });
  } catch (e) {
    return fail(e);
  }
}
