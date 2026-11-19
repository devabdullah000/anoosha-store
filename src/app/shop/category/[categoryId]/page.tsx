import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";
import { categoryProducts } from "@/lib/storefront/queries";
import {
  asLimit,
  asPage,
  canonical,
  categoryHref,
} from "@/lib/storefront/utils";
import ProductCard from "@/components/storefront/product-card";
import StorefrontPagination from "@/components/storefront/storefront-pagination";
import css from "@/components/storefront/storefront.module.css";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ page?: string; limit?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).categoryId;
  const data = await categoryProducts(id, 1, 10);
  if (!data)
    return {
      title: "Category not found | Anoosha Store",
      robots: { index: false },
    };
  const url = canonical(categoryHref(id));
  const description =
    data.category.description ||
    `Explore ${data.category.name} at Anoosha Store. Shop a curated range of mobile and gaming accessories in Pakistan.`;
  return {
    title: `${data.category.name} | Anoosha Store`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${data.category.name} | Anoosha Store`,
      description,
      url,
      type: "website",
    },
  };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const id = (await params).categoryId,
    p = await searchParams;
  const data = await categoryProducts(id, asPage(p.page), asLimit(p.limit));
  if (!data) notFound();
  const { category, listing } = data;
  return (
    <main className={`${css.shell} min-h-[65vh] pb-24 pt-8 sm:pt-12`}>
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500"
        >
          <Link href="/" className="hover:text-indigo-700">
            Home
          </Link>
          <LuChevronRight />
          <Link href="/shop" className="hover:text-indigo-700">
            Shop
          </Link>
          <LuChevronRight />
          <span className="text-indigo-700">{category.name}</span>
        </nav>
        <div className="rounded-[1.75rem] bg-gradient-to-r from-[#f1f3ff] via-white to-[#eafaff] p-7 sm:p-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-indigo-600">
            Explore the collection
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.045em] text-slate-950 sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            {category.productCount}{" "}
            {category.productCount === 1 ? "product" : "products"}
          </p>
          {category.description && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              {category.description}
            </p>
          )}
        </div>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {listing.data.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
        {!listing.data.length && (
          <p className="mt-10 rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
            No products are listed in this collection yet.
          </p>
        )}
        <StorefrontPagination
          info={listing.pagination}
          path={categoryHref(id)}
        />
        <Link
          href="/shop"
          className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline"
        >
          <LuArrowLeft />
          Back to all categories
        </Link>
      </div>
    </main>
  );
}
