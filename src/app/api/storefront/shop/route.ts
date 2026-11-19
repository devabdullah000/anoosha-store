import { NextRequest, NextResponse } from "next/server";
import { shopCategories } from "@/lib/storefront/queries";
import { asPage, asLimit } from "@/lib/storefront/utils";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await shopCategories(
      asPage(params.get("page")),
      asLimit(params.get("limit")),
    );
    return NextResponse.json(
      { success: true, message: "Shop categories loaded.", ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Unable to load categories." },
      { status: 500 },
    );
  }
}
