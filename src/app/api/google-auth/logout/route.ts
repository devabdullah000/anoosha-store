import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_SESSION_COOKIE } from "@/lib/auth/google-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin;
  const requestHeaderOrigin = request.headers.get("origin");
  if (!requestHeaderOrigin || requestHeaderOrigin !== requestOrigin) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(GOOGLE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
