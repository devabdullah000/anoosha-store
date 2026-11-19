"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuArrowRight, LuArrowUpRight } from "react-icons/lu";
import type { ProductCardModel } from "@/lib/storefront/types";
import ProductCard from "./product-card";
import css from "./storefront.module.css";
import { SHOP_EXPLORER_BUTTON_TEXT,NO_ITEM_FOR_LATEST_OR_FEATURED_BUTTON,NO_ITEM_FOR_LATEST_OR_FEATURED_SECTION } from "@/lib/constants";

type ProductRailProps = {
  products: ProductCardModel[];
  title: string;
  eyebrow?: string;
  subtitle?: string;
  href?: string;
  fresh?: boolean;
};

export default function ProductRail({
  products,
  title,
  eyebrow,
  subtitle,
  href,
  fresh = false,
}: ProductRailProps) {
  const track = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const measure = useCallback(() => {
    const element = track.current;
    if (!element) return;

    // scrollWidth reliably detects the real content overflow at every breakpoint.
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const overflowing = maxScroll > 2;
    setCanScroll(overflowing);
    setCanScrollBack(overflowing && element.scrollLeft > 2);
    setCanScrollForward(overflowing && element.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    const element = track.current;
    const inner = content.current;
    if (!element) {
      setCanScroll(false);
      setCanScrollBack(false);
      setCanScrollForward(false);
      return;
    }

    measure();
    const frame = window.requestAnimationFrame(measure);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(element);
    if (inner) observer?.observe(inner);

    window.addEventListener("resize", measure, { passive: true });
    element.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      element.removeEventListener("scroll", measure);
    };
  }, [measure, products]);

  const scroll = (direction: number) => {
    const element = track.current;
    if (!element) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollBy({
      left: direction * Math.min(640, element.clientWidth * 0.83),
      behavior: reducedMotion ? "instant" : "smooth",
    });
  };

  const controls = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/90 px-4 py-2.5 text-xs font-extrabold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          {SHOP_EXPLORER_BUTTON_TEXT}
          <LuArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      {canScroll && (
        <div
          className="flex items-center gap-2"
          aria-label="Product carousel controls"
        >
          <button
            type="button"
            disabled={!canScrollBack}
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title || "category products"} left`}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <LuArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canScrollForward}
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title || "category products"} right`}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <LuArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <section
      aria-label={title || "Category products"}
      className={
        fresh
          ? "rounded-[2rem] bg-gradient-to-r from-[#f1f6ff] via-[#fdf5fc] to-[#f0fbff] px-4 py-8 sm:px-7 sm:py-10"
          : ""
      }
    >
      {title.trim() ? (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
          <div className="min-w-0 flex-1">
            {eyebrow?.trim() && (
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-indigo-600">
                {eyebrow}
              </p>
            )}
            <h2 className="text-2xl font-black tracking-[-.045em] text-slate-950 sm:text-3xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          {controls}
        </div>
      ) : canScroll ? (
        <div className="mb-3 flex justify-end">{controls}</div>
      ) : null}

      {products.length > 0 ? (
        <div
          ref={track}
          role="region"
          aria-label={`${title || "Category"} product cards`}
          tabIndex={canScroll ? 0 : undefined}
          className={`${css.rail} overflow-x-auto pb-4`}
        >
          <div
            ref={content}
            className="flex w-max min-w-full snap-x snap-mandatory gap-3 sm:gap-5"
          >
            {products.map((product) => (
              <div
                key={product.productId}
                className="w-[min(75vw,260px)] shrink-0 snap-start sm:w-[260px] lg:w-[280px]"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
          {NO_ITEM_FOR_LATEST_OR_FEATURED_SECTION}{" "}
          <Link
            href="/shop"
            className="font-bold text-indigo-700 hover:underline"
          >
            {NO_ITEM_FOR_LATEST_OR_FEATURED_BUTTON}
          </Link>
        </div>
      )}
    </section>
  );
}
