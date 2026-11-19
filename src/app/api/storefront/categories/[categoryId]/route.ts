import { NextRequest, NextResponse } from "next/server";
import { categoryProducts } from "@/lib/storefront/queries";
import { asPage, asLimit } from "@/lib/storefront/utils";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const { categoryId } = await params;
    const result = await categoryProducts(
      categoryId,
      asPage(request.nextUrl.searchParams.get("page")),
      asLimit(request.nextUrl.searchParams.get("limit")),
    );
    if (!result)
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 },
      );
    return NextResponse.json(
      {
        success: true,
        message: "Category products loaded.",
        data: result.listing.data,
        category: result.category,
        pagination: result.listing.pagination,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Unable to load products." },
      { status: 500 },
    );
  }
}
