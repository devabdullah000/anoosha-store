import { NextResponse } from "next/server";
import { publicHero } from "@/lib/storefront/hero";
import { taggedProducts } from "@/lib/storefront/queries";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [hero, featured, latest] = await Promise.all([
      publicHero(),
      taggedProducts("featured", 16),
      taggedProducts("latest", 16),
    ]);
    return NextResponse.json(
      {
        success: true,
        message: "Home content loaded.",
        data: { hero, featured, latest },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Unable to load storefront content." },
      { status: 500 },
    );
  }
}
