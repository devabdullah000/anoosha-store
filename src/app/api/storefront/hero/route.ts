import { NextResponse } from "next/server";
import { publicHero } from "@/lib/storefront/hero";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      { success: true, message: "Slider loaded.", data: await publicHero() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Slider unavailable." },
      { status: 500 },
    );
  }
}
