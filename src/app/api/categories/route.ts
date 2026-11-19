import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/server/categories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return getCategories(searchParams);
}

export async function POST(request: Request) {
  return createCategory(request);
}

export async function PATCH(request: Request) {
  return updateCategory(request);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);

  return deleteCategory(searchParams);
}
