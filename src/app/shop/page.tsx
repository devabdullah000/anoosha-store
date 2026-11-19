import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowRight, LuChevronRight, LuShoppingBag } from "react-icons/lu";
import { shopCategories } from "@/lib/storefront/queries";
import {
  asLimit,
  asPage,
  categoryHref,
} from "@/lib/storefront/utils";
import ProductRail from "@/components/storefront/product-rail";
import StorefrontPagination from "@/components/storefront/storefront-pagination";
import Reveal from "@/components/storefront/reveal";
import css from "@/components/storefront/storefront.module.css";
export const dynamic = "force-dynamic";
import { pageMetadata } from "@/lib/storefront-pages";
import { SHOP_METADATA } from "@/lib/seo/shop";
import { SHOP_PAGE_DESCRIPTION, SHOP_PAGE_SUBTITLE1, SHOP_PAGE_SUBTITLE2,SHOP_PAGE_TITLE } from "@/lib/constants";

export const metadata: Metadata = pageMetadata(SHOP_METADATA);

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const result = await shopCategories(
    asPage(params.page),
    asLimit(params.limit),
  );
  return (
    <main className={`${css.shell} pb-24 pt-7 sm:pt-11`}>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-bold text-slate-400"
        >
          <Link href="/" className="hover:text-indigo-700">
            Home
          </Link>
          <LuChevronRight />
          <span className="text-indigo-700">Shop</span>
        </nav>
        <div className="relative my-8 overflow-hidden rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-[#f1f4ff] via-white to-[#edfbff] px-7 py-12 sm:rounded-[2rem] sm:px-12 sm:py-16">
          <div
            className={`${css.dots} absolute inset-0 opacity-25`}
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-indigo-600">
              <LuShoppingBag /> {SHOP_PAGE_TITLE}
            </p>
            <h1 className="text-4xl font-black leading-[1.06] tracking-[-.055em] text-slate-950 sm:text-5xl lg:text-6xl">
              {SHOP_PAGE_SUBTITLE1}{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                {SHOP_PAGE_SUBTITLE2}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              {SHOP_PAGE_DESCRIPTION}
            </p>
          </div>
          <span
            className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full border-[40px] border-indigo-100/50"
            aria-hidden="true"
          />
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Shop by category
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {result.pagination.total} collections to explore
            </p>
          </div>
          {/* <Link
            href="/contact"
            className="text-xs font-bold text-indigo-700 hover:underline"
          >
            Need help choosing? <LuArrowRight className="inline" />
          </Link> */}
        </div>
        <div className="space-y-14 sm:space-y-20">
          {result.data.map((category, index) => (
            <Reveal key={category.id}>
              <section
                aria-labelledby={`category-${category.id}`}
                className={
                  index % 2 === 1
                    ? "rounded-[1.75rem] bg-gradient-to-r from-[#f2f6ff] to-[#fdf6ff] p-4 sm:p-7"
                    : ""
                }
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id={`category-${category.id}`}
                    className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
                  >
                    {category.name}{" "}
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-400">
                      ({category.productCount}{" "}
                      {category.productCount === 1 ? "product" : "products"})
                    </span>
                  </h2>
                  <Link
                    href={categoryHref(category.id)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-700 transition hover:gap-2"
                  >
                    See more <LuArrowRight />
                  </Link>
                </div>
                {category.description && (
                  <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-500">
                    {category.description}
                  </p>
                )}
                <ProductRail
                  products={category.products}
                  title=""
                  eyebrow=""
                  href={undefined}
                />
                {category.productCount > category.products.length && (
                  <div className="mt-2 flex justify-end">
                    <Link
                      href={categoryHref(category.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                    >
                      Explore all {category.productCount} products
                      <LuArrowRight />
                    </Link>
                  </div>
                )}
              </section>
            </Reveal>
          ))}
        </div>
        {!result.data.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center text-sm text-slate-500">
            Our collections are being prepared.{" "}
            <Link href="/contact" className="font-bold text-indigo-700">
              Contact us
            </Link>{" "}
            if you need help.
          </div>
        )}
        <StorefrontPagination info={result.pagination} path="/shop" />
        <div className="mt-16 grid gap-5 rounded-3xl border border-slate-200 bg-white p-7 sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              A few questions before ordering?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Learn about our cash-on-delivery process, shipping and returns.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/faq"
              className="rounded-full bg-indigo-50 px-5 py-2.5 text-xs font-bold text-indigo-700"
            >
              FAQs
            </Link>
            <Link
              href="/terms-and-conditions"
              className="rounded-full bg-indigo-50 px-5 py-2.5 text-xs font-bold text-indigo-700"
            >
              Terms and Conditions
            </Link>
            <Link
              href="/shipping-and-return-policy"
              className="rounded-full bg-indigo-50 px-5 py-2.5 text-xs font-bold text-indigo-700"
            >
              Shipping and Returns
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
