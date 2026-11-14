
import { NextResponse } from "next/server";
import { requireAdminServer } from "@/lib/auth/require-admin-server";

export async function POST(request: Request) {
  const auth = await requireAdminServer();

  if (!auth.authorized) {
    return auth.response;
  }

  // The request is now authorized.
  const admin = auth.user;

  // Your product creation logic goes here.

  return NextResponse.json({
    success: true,
    message: "Product created successfully.",
  });
}
