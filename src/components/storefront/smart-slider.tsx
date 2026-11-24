"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuArrowRight,
  LuChevronLeft,
  LuChevronRight,
  LuGamepad2,
  LuPause,
  LuPlay,
  LuSmartphone,
} from "react-icons/lu";
import type { HeroSlide } from "@/lib/storefront/types";
import ResilientImage from "./resilient-image";
import css from "./storefront.module.css";
import {
  DEFAULT_SLIDER_HEADING,
  DEFAULT_SLIDER_DESCRIPTION,
  DEFAULT_SLIDER_MAIN_TEXT_1,
  DEFAULT_SLIDER_MAIN_TEXT_2,
  DEFAULT_SLIDER_BUTTON_TEXT,
} from "@/lib/constants";
type SmartSliderProps = {
  slides: HeroSlide[];
  intervalMs?: number;
};

export default function SmartSlider({
  slides,
  intervalMs = 6500,
}: SmartSliderProps) {
  const [active, setActive] = useState(0);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const duration = Number.isFinite(intervalMs)
    ? Math.max(2500, Math.min(30000, intervalMs))
    : 6500;

  const navigate = useCallback(
    (direction: number) => {
      if (slides.length < 2) return;
      setActive(
        (previous) => (previous + direction + slides.length) % slides.length,
      );
    },
    [slides.length],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    return () => media.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    const updateVisibility = () =>
      setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (active >= slides.length && active !== 0) setActive(0);
  }, [active, slides.length]);

  // Autoplay runs independently of pointer hover and mouse-click focus. A hover
  // or clicked arrow used to stop the older implementation indefinitely.
  // Reschedule after each slide change so manual navigation gets a full interval.
  useEffect(() => {
    if (slides.length < 2 || manuallyPaused || reducedMotion || !pageVisible)
      return;
    const timeout = window.setTimeout(() => navigate(1), duration);
    return () => window.clearTimeout(timeout);
  }, [
    active,
    duration,
    manuallyPaused,
    navigate,
    pageVisible,
    reducedMotion,
    slides.length,
  ]);

  const isPlaying = slides.length > 1 && !manuallyPaused && !reducedMotion;

  return (
    <section
      aria-label="Store highlights"
      aria-roledescription="carousel"
      aria-live="off"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta =
          (event.changedTouches[0]?.clientX ?? touchStartX.current) -
          touchStartX.current;
        if (Math.abs(delta) > 55) navigate(delta < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
      className={`${css.hero} ${css.heroGlow} relative isolate min-h-[450px] overflow-hidden rounded-[1.65rem] text-white sm:min-h-[500px] sm:rounded-[2.5rem] lg:min-h-[560px]`}
    >
      {slides.length === 0 ? (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_86%_20%,#43439e_0%,transparent_35%),radial-gradient(circle_at_73%_90%,#115e88_0%,transparent_42%),linear-gradient(115deg,#15172d,#171e3a)]">
          <div
            aria-hidden="true"
            className={`${css.orb} absolute -right-14 top-10 grid h-56 w-56 place-items-center rounded-[4rem] border border-white/15 bg-white/10 text-indigo-200 shadow-2xl backdrop-blur-lg sm:right-[9%] sm:top-[12%] sm:h-72 sm:w-72`}
          >
            <LuGamepad2 className="h-24 w-24 opacity-70 sm:h-36 sm:w-36" />
          </div>
          <div
            aria-hidden="true"
            className={`${css.orbAlt} absolute bottom-5 right-[36%] hidden h-32 w-32 place-items-center rounded-[3rem] border border-white/10 bg-white/10 text-cyan-200 backdrop-blur-md lg:grid`}
          >
            <LuSmartphone className="h-16 w-16" />
          </div>
          <div className="relative z-10 flex min-h-[450px] max-w-2xl flex-col justify-center px-7 py-14 sm:min-h-[500px] sm:px-14 lg:min-h-[560px] lg:px-20">
            <span className="mb-6 w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-cyan-100">
              {DEFAULT_SLIDER_HEADING}
            </span>
            <h1 className="max-w-[620px] text-4xl font-black leading-[1.06] tracking-[-.055em] sm:text-6xl lg:text-[4.5rem]">
              {DEFAULT_SLIDER_MAIN_TEXT_1}{" "}
              <span className="bg-gradient-to-r from-pink-200 to-cyan-200 bg-clip-text text-transparent">
                {DEFAULT_SLIDER_MAIN_TEXT_2}
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-slate-200 sm:text-base">
              {DEFAULT_SLIDER_DESCRIPTION}
            </p>
            <Link
              href="/shop"
              prefetch={false}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              {DEFAULT_SLIDER_BUTTON_TEXT} <LuArrowRight />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {slides.map((slide, index) => {
            const selected = index === active;
            return (
              <div
                key={slide.id}
                className={css.slide}
                data-active={selected}
                aria-hidden={!selected}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}`}
              >
                <ResilientImage
                  src={slide.imageUrl}
                  fallbackSrc={slide.fallbackImageUrl}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className={css.slideImage}
                  placeholderClassName="h-full w-full bg-gradient-to-br from-indigo-900 via-slate-900 to-cyan-950"
                />
                <div className={css.slideShade} />
                <div className="absolute inset-0 flex items-center px-7 py-12 sm:px-14 lg:px-20">
                  <div className={`${css.slideContent} relative max-w-2xl`}>
                    {slide.eyebrow && (
                      <p className="mb-5 text-[11px] font-extrabold uppercase tracking-[.22em] text-cyan-100">
                        {slide.eyebrow}
                      </p>
                    )}
                    {index === 0 ? (
                      <h1 className="text-4xl font-black leading-[1.07] tracking-[-.05em] sm:text-6xl lg:text-7xl">
                        {slide.title}
                      </h1>
                    ) : (
                      <h2 className="text-4xl font-black leading-[1.07] tracking-[-.05em] sm:text-6xl lg:text-7xl">
                        {slide.title}
                      </h2>
                    )}
                    {slide.description && (
                      <p className="mt-6 max-w-lg text-sm leading-7 text-white/85 sm:text-base">
                        {slide.description}
                      </p>
                    )}
                    <Link
                      tabIndex={selected ? 0 : -1}
                      aria-hidden={!selected}
                      href={slide.buttonHref}
                      prefetch={false}
                      className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-50"
                    >
                      {slide.buttonLabel} <LuArrowRight />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 sm:bottom-9 sm:left-14 lg:left-20">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={active === index ? "true" : undefined}
                    onClick={() => setActive(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      active === index
                        ? "w-9 bg-white"
                        : "w-4 bg-white/45 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
              <div className="absolute bottom-5 right-5 z-10 flex gap-2 sm:bottom-8 sm:right-10">
                <button
                  type="button"
                  onClick={() => setManuallyPaused((value) => !value)}
                  aria-label={
                    isPlaying
                      ? "Pause automatic slides"
                      : "Play automatic slides"
                  }
                  aria-pressed={!isPlaying}
                  title={
                    reducedMotion
                      ? "Automatic playback is disabled by your reduced-motion preference"
                      : undefined
                  }
                  disabled={reducedMotion}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPlaying ? (
                    <LuPause className="h-5 w-5" />
                  ) : (
                    <LuPlay className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() => navigate(-1)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <LuChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() => navigate(1)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <LuChevronRight className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
