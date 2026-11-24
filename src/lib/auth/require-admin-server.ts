
import "server-only";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/require-auth";

export async function requireAdminServer() {
  const user = await getCurrentUser({ forceFresh: true });

  // No valid authenticated user.
  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 400 },
      ),
    };
  }

  // Authenticated, but not an administrator.
  if (user.role !== "admin") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 400 },
      ),
    };
  }

  return {
    authorized: true as const,
    user,
  };
}
