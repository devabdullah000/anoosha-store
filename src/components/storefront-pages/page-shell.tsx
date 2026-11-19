import type { ReactNode } from "react";
import Link from "next/link";
import {
  LuArrowRight,
  LuChevronRight,
  LuHeadphones,
  LuShieldCheck,
} from "react-icons/lu";
import { NAVBAR_CONFIG, footer_brand } from "@/lib/constants";
import { getFooterStaticLinks, pageName } from "@/lib/storefront-pages";
import styles from "./storefront-pages.module.css";
import type { StaticPageHref } from "@/lib/constants";

type PageShellProps = {
  path: StaticPageHref;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  related?: StaticPageHref[];
};

export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function PageShell({
  path,
  eyebrow,
  title,
  description,
  icon,
  children,
  related = ["/contact", "/faq", "/shipping-and-return-policy"],
}: PageShellProps) {
  const relatedLinks = getFooterStaticLinks().filter(
    (link) =>
      link.link !== path && related.includes(link.link as StaticPageHref),
  );
  return (
    <div
      className={`${styles.page} relative isolate min-h-screen pb-10 pt-7 text-slate-900 sm:pt-10 lg:pt-12`}
    >
      <main className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-500 sm:mb-7"
        >
          <Link
            href={NAVBAR_CONFIG.homeHref}
            className="transition hover:text-indigo-700"
          >
            Home
          </Link>
          <LuChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          <span aria-current="page" className="font-semibold text-indigo-700">
            {pageName(path)}
          </span>
        </nav>

        <header
          className={`${styles.hero} rounded-[26px] border border-indigo-100/80 px-6 py-9 shadow-[0_30px_75px_rgba(71,85,150,.065)] sm:rounded-[34px] sm:px-11 sm:py-12 lg:px-14 lg:py-14`}
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-100 bg-indigo-50/90 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-indigo-700">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-indigo-600">
                {icon}
              </span>
              {eyebrow}
            </div>
            <h1 className="mt-5 max-w-3xl text-[2.15rem] font-extrabold leading-[1.1] tracking-[-.045em] text-slate-950 sm:text-5xl lg:text-[3.6rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              {description}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <LuShieldCheck className="h-4 w-4 text-emerald-600" /> Clear
                policies
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <LuHeadphones className="h-4 w-4 text-indigo-600" /> Human
                support
              </span>
            </div>
          </div>
        </header>

        <div className={`${styles.rise} ${styles.delayOne} mt-7 sm:mt-9`}>
          {children}
        </div>

        <section
          aria-labelledby="more-help-title"
          className={`${styles.rise} ${styles.delayTwo} mt-9 rounded-[26px] border border-indigo-100 bg-white/90 p-6 shadow-[0_15px_45px_rgba(59,73,126,.04)] sm:p-8`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-600">
                Continue exploring
              </p>
              <h2
                id="more-help-title"
                className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
              >
                Everything you need, in one place.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Simple answers and helpful next steps from{" "}
                {footer_brand.name.toLowerCase()}.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedLinks.map((link) => (
              <Link
                key={link.link}
                href={link.link}
                className={`${styles.interactiveCard} group flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#f9fbff] p-4 text-sm font-semibold text-slate-800`}
              >
                {link.name}
                <LuArrowRight className="h-4 w-4 shrink-0 text-indigo-500 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function PolicySection({
  id,
  title,
  eyebrow,
  children,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${styles.glassCard} scroll-mt-24 rounded-[24px] border border-slate-200/90 bg-white p-6 sm:p-8`}
    >
      {eyebrow && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.17em] text-indigo-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg font-bold tracking-[-.02em] text-slate-950 sm:text-xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 [&_a]:font-semibold [&_a]:text-indigo-700 [&_a]:underline-offset-4 hover:[&_a]:underline [&_strong]:font-semibold [&_strong]:text-slate-800 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function InfoTile({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.interactiveCard} ${styles.glassCard} rounded-[22px] border border-slate-200/90 bg-white p-5 sm:p-6`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <div className="mt-2 text-sm leading-7 text-slate-600">{children}</div>
    </div>
  );
}

export function SoftNote({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="flex items-start gap-4 rounded-[22px] border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-white to-cyan-50/70 p-5 sm:p-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <div className="mt-1 text-sm leading-7 text-slate-600 [&_a]:font-semibold [&_a]:text-indigo-700 [&_a]:underline-offset-4 hover:[&_a]:underline">
          {children}
        </div>
      </div>
    </aside>
  );
}
