
import Link from "next/link";

import {
  footer_brand,
  footer_nav_links,
  footer_social_links,
  footer_bottom_text,
} from "@/lib/constants";

function ArrowUpRight() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M5 15 15 5M6 5h9v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SocialIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase();

  if (normalized === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (normalized === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.2H7.7V13h2.7v8h3.1Z" />
      </svg>
    );
  }

  if (normalized === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M23 7.1a3 3 0 0 0-2.1-2.2C19 4.4 12 4.4 12 4.4s-7 0-8.9.5A3 3 0 0 0 1 7.1a31 31 0 0 0-.5 4.9 31 31 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.2c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9ZM9.6 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    );
  }

  if (normalized === "tiktok") {
    const path =
      "M19.6 8.4a7.2 7.2 0 0 1-4.2-1.4v7.1a6 6 0 1 1-6-6c.4 0 .8 0 1.2.1v3.3a2.8 2.8 0 1 0 1.9 2.6V2.8h3.1c.2 2.1 1.9 3.8 4 4.1v1.5Z";

    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d={path} fill="#25F4EE" transform="translate(-0.7 0.3)" />
        <path d={path} fill="#FE2C55" transform="translate(0.7 -0.3)" />
        <path d={path} fill="white" />
      </svg>
    );
  }

  return <ArrowUpRight />;
}

// Platform-specific social button styling.
function getSocialStyle(name: string) {
  switch (name.toLowerCase()) {
    case "instagram":
      return "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white shadow-sm hover:brightness-110";

    case "facebook":
      return "bg-[#1877F2] text-white shadow-sm hover:brightness-110";

    case "youtube":
      return "bg-[#FF0033] text-white shadow-sm hover:brightness-110";

    case "tiktok":
      return "bg-slate-950 text-white shadow-sm hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20";

    default:
      return "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]";
  }
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-12 overflow-hidden bg-[#F8F9FC] text-slate-900 transition-colors duration-300 dark:bg-[#080D1B] dark:text-white">

      {/* Gradient accent matching navbar and login button */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400"
      />

      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-0 h-80 w-80 rounded-full bg-pink-300/20 blur-[100px] dark:bg-pink-500/[0.07]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-[100px] dark:bg-cyan-500/[0.07]"
      />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">

        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-10 py-11 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10 lg:py-12">

          {/* Brand section */}
          <div className="lg:col-span-4">
            <Link
              href={footer_brand.logoHref}
              aria-label={`${footer_brand.name} home`}
              className="inline-flex items-center gap-3"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-lg dark:shadow-black/20">
                <img
                  src={footer_brand.logo}
                  alt={footer_brand.logoAlt}
                  className="h-full w-full object-contain"
                />
              </span>

              <span className="min-w-0">
                <span className="block text-base font-extrabold tracking-[0.16em] text-slate-950 dark:text-white">
                  {footer_brand.name}
                </span>

                <span className="mt-1 block text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">
                  {footer_brand.tagline}
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600 dark:text-slate-400">
              {footer_brand.description}
            </p>

            <Link
              href="/shop"
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:brightness-110 active:scale-[0.98]"
            >
              Explore our store

              <span className="transition-transform group-hover:translate-x-1">
                <ArrowUpRight />
              </span>
            </Link>

            {/* Social media links */}
            {footer_social_links.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-500">
                  Follow us
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {footer_social_links.map((social) => (
                    <a
                      key={social.name}
                      href={social.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit our ${social.name} page`}
                      className={`grid h-10 w-10 place-items-center rounded-xl transition duration-200 hover:-translate-y-0.5 ${getSocialStyle(social.name)}`}
                    >
                      <SocialIcon name={social.name} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation groups */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:col-span-2 sm:grid-cols-3 lg:col-span-8 lg:pl-12">
            {footer_nav_links.map((group) => (
              <div key={group.title}>
                <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-900 dark:text-white">
                  {group.title}
                </h2>

                <ul className="space-y-3.5">
                  {group.links.map((item) => (
                    <li key={item.link}>
                      <Link
                        href={item.link}
                        className="group inline-flex items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                      >
                        <span>{item.name}</span>

                        <span className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                          <ArrowUpRight />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Compact copyright section */}
        <div className="mt-3 border-t border-slate-200 py-4 dark:border-white/10">
          <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:gap-4 sm:text-left">

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-500">
              © {currentYear} {footer_brand.name}.{" "}
              {footer_bottom_text.copyright}
            </p>

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-500">
              {footer_bottom_text.closingLine}
            </p>

            <span className="text-xs font-medium tracking-wide text-slate-600 dark:text-slate-400">
              {footer_bottom_text.country}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
