import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from "@/lib/server/attributes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return getAttributes(searchParams);
}

export async function POST(request: Request) {
  return createAttribute(request);
}

export async function PATCH(request: Request) {
  return updateAttribute(request);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);

  return deleteAttribute(searchParams);
}
