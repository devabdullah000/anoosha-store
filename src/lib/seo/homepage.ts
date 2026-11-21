
import type { Metadata } from "next";
import { STORE_URL } from "@/lib/constants";
import { pageMetadata } from "@/lib/storefront-pages";

/* ============================================================
   ANOOSHA STORE — HOME PAGE SEO
   Production URL: https://anooshastore.com/
   ============================================================ */

export const HOME_URL = new URL("/", STORE_URL).toString();

export const HOME_TITLE =
  "Anoosha Store | Mobile & Gaming Accessories in Pakistan";

export const HOME_DESCRIPTION =
  "Shop mobile accessories, gaming accessories and everyday tech essentials at Anoosha Store. Explore featured products and new arrivals with cash on delivery in Pakistan.";

/* ============================================================
   METADATA
   Reuses the central metadata helper.
   ============================================================ */

const commonMetadata = pageMetadata({
  title: "Mobile & Gaming Accessories in Pakistan",
  description: HOME_DESCRIPTION,
  path: "/",
  keywords: [
    "mobile accessories Pakistan",
    "gaming accessories Pakistan",
    "mobile phone accessories",
    "gaming setup accessories",
  ],
});

export const HOME_PAGE_SEO_PARAMS: Metadata = {
  ...commonMetadata,

  // Absolute title prevents duplicate brand suffixes.
  title: {
    absolute: HOME_TITLE,
  },

  alternates: {
    canonical: HOME_URL,
  },

  openGraph: {
    ...commonMetadata.openGraph,
    type: "website",
    siteName: "Anoosha Store",
    locale: "en_PK",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: HOME_URL,
  },

  twitter: {
    ...commonMetadata.twitter,
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },

  robots: {
    index: true,
    follow: true,
  },
};

/* ============================================================
   STRUCTURED DATA — JSON-LD
   WebSite + OnlineStore
   ============================================================ */

export const HOME_PAGE_STRUCTURED_SCHEMA = {
  "@context": "https://schema.org",

  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${HOME_URL}#website`,
      name: "Anoosha Store",
      url: HOME_URL,
      description: HOME_DESCRIPTION,
      inLanguage: "en-PK",
      publisher: {
        "@id": `${HOME_URL}#organization`,
      },
    },

    {
      "@type": "OnlineStore",
      "@id": `${HOME_URL}#organization`,
      name: "Anoosha Store",
      url: HOME_URL,
      description:
        "Online store for mobile and gaming accessories in Pakistan",
      areaServed: {
        "@type": "Country",
        name: "Pakistan",
      },
    },
  ],
} as const;
