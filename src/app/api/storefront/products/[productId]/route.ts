import { NextResponse } from "next/server";
import { productDetails } from "@/lib/storefront/queries";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const item = await productDetails((await params).productId);
    if (!item)
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 },
      );
    return NextResponse.json(
      { success: true, message: "Product loaded.", data: item },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Unable to load product." },
      { status: 500 },
    );
  }
}
