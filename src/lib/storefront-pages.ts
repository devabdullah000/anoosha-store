import type { Metadata } from "next";
import { footer_brand, footer_nav_links } from "@/lib/constants";
import { STORE_URL,STOREFRONT_PAGES,StaticPageHref} from "@/lib/constants";

export function pageMetadata({
  title,
  description,
  path,
  keywords = [],
}: {
  title: string;
  description: string;
  path: StaticPageHref;
  keywords?: string[];
}): Metadata {
  return {
    metadataBase: new URL(STORE_URL),
    title: `${title} | Anoosha Store`,
    description,
    keywords: ["Anoosha Store", "mobile accessories", "gaming accessories", "Pakistan", ...keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Anoosha Store",
      locale: "en_PK",
      title: `${title} | Anoosha Store`,
      description,
      url: path,
    },
    twitter: {
      card: "summary",
      title: `${title} | Anoosha Store`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export function pageName(path: StaticPageHref): string {
  return STOREFRONT_PAGES.find((item) => item.href === path)?.name ?? "Information";
}

export function breadcrumbSchema(path: StaticPageHref) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: STORE_URL },
      { "@type": "ListItem", position: 2, name: pageName(path), item: `${STORE_URL}${path}` },
    ],
  };
}

export function pageSchema(path: StaticPageHref, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${pageName(path)} | Anoosha Store`,
    description,
    url: `${STORE_URL}${path}`,
    isPartOf: {
      "@type": "WebSite",
      name: footer_brand.name,
      url: STORE_URL,
    },
  };
}

/** Footer links are the canonical cross-page navigation source. */
export function getFooterStaticLinks() {
  const paths = new Set<string>(STOREFRONT_PAGES.map((item) => item.href));
  return footer_nav_links.flatMap((group) => group.links).filter((link) => paths.has(link.link));
}
