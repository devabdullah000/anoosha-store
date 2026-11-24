
import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowRight, LuChevronRight } from "react-icons/lu";

import {
  taggedProducts,
  categoryHighlights,
} from "@/lib/storefront/queries";

import { publicHero } from "@/lib/storefront/hero";
import { categoryHref } from "@/lib/storefront/utils";

import SmartSlider from "@/components/storefront/smart-slider";
import ProductRail from "@/components/storefront/product-rail";
import Reveal from "@/components/storefront/reveal";

import css from "@/components/storefront/storefront.module.css";

import {
  HOME_PAGE_SEO_PARAMS,
  HOME_PAGE_STRUCTURED_SCHEMA,
} from "@/lib/seo/homepage";

import {
  HOME_PAGE_TINYLINKS as tinyLinks,
  FEATURED_PRODUCTS_SECTION_EYEBROW,
  FEATURED_PRODUCTS_SECTION_SUBTITLE,
  FEATURED_PRODUCTS_SECTION_TITLE,
  HOME_PAGE_LEFT_DESCTIPTION,
  HOME_PAGE_LEFT_HEADING,
  HOME_PAGE_LEFT_SUBTITLE,
  HOME_PAGE_LEFT_TITLE,
  HOME_PAGE_STATIC_SECTION_ARRAY1,
  HOME_PAGE_STATIC_SECTION_DESCRIPTION,
  HOME_PAGE_STATIC_SECTION_SUBTITLE,
  HOME_PAGE_STATIC_SECTION_TITLE,
  LATEST_PRODUCTS_EYEBROW,
  LATEST_PRODUCTS_SUBTITLE,
  LATEST_PRODUCTS_TITLE,
  HOME_PAGE_NO_CATEGROIES_TEXT,
  HOME_PAGE_LEFT_BUTTON_TEXT,
} from "@/lib/constants";

/* ============================================================
   HOME PAGE CONFIGURATION
   ============================================================ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = HOME_PAGE_SEO_PARAMS;

/* ============================================================
   HOME PAGE COMPONENT
   ============================================================ */

export default async function HomePage() {
  const [hero, featured, latest, categories] = await Promise.all([
    publicHero(),
    taggedProducts("featured"),
    taggedProducts("latest"),
    categoryHighlights(4),
  ]);
  const structured = HOME_PAGE_STRUCTURED_SCHEMA;
  return (
    <main className={`${css.shell} pb-24`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-[1500px] space-y-20 px-4 pt-5 sm:space-y-24 sm:px-6 sm:pt-7 lg:space-y-28 lg:px-8">
        <SmartSlider slides={hero.slides} intervalMs={hero.intervalMs} />
        <Reveal>
          <ProductRail
            title={FEATURED_PRODUCTS_SECTION_TITLE}
            eyebrow={FEATURED_PRODUCTS_SECTION_EYEBROW}
            subtitle={FEATURED_PRODUCTS_SECTION_SUBTITLE}
            products={featured}
            href="/shop"
          />
        </Reveal>
        <Reveal>
          <ProductRail
            title={LATEST_PRODUCTS_TITLE}
            eyebrow={LATEST_PRODUCTS_EYEBROW}
            subtitle={LATEST_PRODUCTS_SUBTITLE}
            products={latest}
            href="/shop"
            fresh
          />
        </Reveal>
        <Reveal>
          <section className="relative grid gap-8 overflow-hidden rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-[#f5f7ff] via-white to-[#effbff] p-7 sm:p-11 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:p-14">
            <div
              className={`${css.dots} absolute inset-0 opacity-20`}
              aria-hidden="true"
            />

            {/* Left content */}
            <div className="relative">
              <p className="text-[11px] font-extrabold uppercase tracking-[.21em] text-indigo-600">
                {HOME_PAGE_LEFT_TITLE}
              </p>

              <h2 className="mt-4 max-w-xl text-3xl font-black leading-[1.15] tracking-[-.045em] text-slate-950 sm:text-4xl lg:text-5xl">
                {HOME_PAGE_LEFT_SUBTITLE}
                <br />
                <span className="bg-gradient-to-r from-pink-500 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  {HOME_PAGE_LEFT_HEADING}
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600">
                {HOME_PAGE_LEFT_DESCTIPTION}
              </p>

              <Link
                href="/shop"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-800"
                prefetch={false}
              >
                {HOME_PAGE_LEFT_BUTTON_TEXT}
                <LuArrowRight />
              </Link>
            </div>

            {/* Category cards */}
            <div className="relative grid gap-3 sm:grid-cols-2">
              {categories.slice(0, 4).map((category, index) => (
                <div
                  key={category.id}
                  className={`group rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(15,23,42,0.10)] ${
                    index === 1 ? "sm:translate-y-7 sm:hover:translate-y-6" : ""
                  }`}
                >
                  <Link
                    href={categoryHref(category.id)}
                    className="flex min-h-32 h-full flex-col justify-between rounded-[15px] bg-white/95 p-5 transition-colors duration-300 hover:bg-white"
                    prefetch={false}
                  >
                    {/* Category number */}
                    <span className="text-xs font-bold text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* Category name */}
                    <span className="flex items-end justify-between gap-3">
                      <span className="text-sm font-extrabold text-slate-900 sm:text-base">
                        {category.name}
                      </span>

                      <LuChevronRight className="h-5 w-5 shrink-0 text-indigo-600 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>

                    {/* Products count */}
                    <span className="text-xs text-slate-400">
                      {category.productCount}{" "}
                      {category.productCount === 1 ? "product" : "products"}
                    </span>
                  </Link>
                </div>
              ))}

              {!categories.length && (
                <div className="col-span-2 flex min-h-40 items-center justify-center rounded-2xl bg-white/90 text-sm text-slate-500">
                  {HOME_PAGE_NO_CATEGROIES_TEXT}
                </div>
              )}
            </div>
          </section>
        </Reveal>
        <Reveal>
          <div className="relative z-[2] mx-auto grid max-w-5xl gap-3 rounded-[1.5rem] border border-slate-100 bg-white/95 p-4 shadow-[0_28px_75px_-47px_rgba(22,35,98,.48)] backdrop-blur-xl sm:grid-cols-3 sm:gap-4 sm:p-6">
            {HOME_PAGE_STATIC_SECTION_ARRAY1.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl p-2 sm:gap-4"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {item.title}
                  </h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal>
          <section className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-600">
              {HOME_PAGE_STATIC_SECTION_TITLE}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em] text-slate-900">
              {HOME_PAGE_STATIC_SECTION_SUBTITLE}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">
              {HOME_PAGE_STATIC_SECTION_DESCRIPTION}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {tinyLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  prefetch={false}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
