
import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";

import {
  categoryProducts as fetchCategoryProducts,
} from "@/lib/storefront/queries";

import {
  asLimit,
  asPage,
  canonical,
  categoryHref,
  SITE_URL,
} from "@/lib/storefront/utils";

import ProductCard from "@/components/storefront/product-card";
import StorefrontPagination from "@/components/storefront/storefront-pagination";
import css from "@/components/storefront/storefront.module.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
  }>;
};

// Reuse category data across metadata and page rendering.
// This deduplicates identical queries within a server render.
const categoryProducts = cache(fetchCategoryProducts);

// Clean and normalize category descriptions for SEO.
function seoDescription(
  value: string,
  fallback: string,
): string {
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const text = cleaned || fallback;

  if (text.length <= 160) return text;

  return (
    text
      .slice(0, 157)
      .replace(/\s+\S*$/, "")
      .trimEnd() + "..."
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { categoryId } = await params;
  const query = await searchParams;

  // Use the same pagination values as CategoryPage.
  const page = asPage(query.page);
  const limit = asLimit(query.limit);

  // Derive the default page size from the existing utility.
  const defaultLimit = asLimit(undefined);

  const data = await categoryProducts(
    categoryId,
    page,
    limit,
  );

  // Invalid or deleted categories return a real 404.
  if (!data) notFound();

  const { category, listing } = data;

  const categoryName = category.name.trim();

  // Differentiate paginated category pages.
  const pageSuffix = page > 1
    ? ` - Page ${page}`
    : "";

  const title =
    `${categoryName}${pageSuffix} | Anoosha Store`;

  const fallbackDescription =
    `Explore ${categoryName} at Anoosha Store. ` +
    `Browse available products, discover accessories, ` +
    `and shop online in Pakistan.`;

  const description = seoDescription(
    category.description || "",
    fallbackDescription,
  );

  // Build an absolute canonical URL.
  const canonicalUrl = new URL(
    canonical(categoryHref(categoryId)),
  );

  // Each paginated page must have its own canonical URL.
  if (page > 1) {
    canonicalUrl.searchParams.set(
      "page",
      String(page),
    );
  }

  // Preserve alternative page sizes in canonical URLs
  // because they can display different product sets.
  const isDefaultLimit = limit === defaultLimit;

  if (!isDefaultLimit) {
    canonicalUrl.searchParams.set(
      "limit",
      String(limit),
    );
  }

  const url = canonicalUrl.toString();

  // Index normal category listings and their valid pages.
  // Avoid indexing empty pages or alternate page-size URLs.
  const shouldIndex =
    listing.data.length > 0 && isDefaultLimit;

  return {
    metadataBase: new URL(SITE_URL),

    title: {
      absolute: title,
    },

    description,

    keywords: [
      categoryName,
      `${categoryName} Pakistan`,
      `buy ${categoryName} online`,
      "Anoosha Store",
      "online shopping Pakistan",
      "mobile accessories",
      "gaming accessories",
    ],

    alternates: {
      canonical: url,
    },

    openGraph: {
      type: "website",
      siteName: "Anoosha Store",
      locale: "en_PK",
      title,
      description,
      url,
    },

    twitter: {
      card: "summary",
      title,
      description,
    },

    robots: {
      index: shouldIndex,
      follow: true,
      googleBot: {
        index: shouldIndex,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
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
