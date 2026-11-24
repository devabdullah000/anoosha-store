import { getCurrentUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

/**
 * Used ONLY when entering a protected UI section, and after a full-page
 * Google OAuth return. It accepts either Better Auth's or Google's signed
 * HttpOnly cookies. Client code must not treat localStorage as authorization.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || typeof user.email !== "string" || !user.email.trim()) {
      return Response.json(
        { success: false, profile: null },
        { status: 401, headers: privateHeaders },
      );
    }

    return Response.json(
      {
        success: true,
        profile: {
          email: user.email.trim(),
          role: user.role === "admin" ? "admin" : "user",
        },
      },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { success: false, profile: null },
      { status: 503, headers: privateHeaders },
    );
  }
}
