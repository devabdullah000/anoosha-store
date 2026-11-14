import { NextResponse } from "next/server";
export function successResponse(
  message: string,
  data: unknown,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      ...extra,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function serverError(operation: string, error: unknown) {
  console.error(`Category ${operation} error:`, error);

  return errorResponse(
    "An unexpected server error occurred. Please try again.",
    500,
  );
}