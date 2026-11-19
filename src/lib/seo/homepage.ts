import { SITE_URL } from "../constants";
export const HOME_PAGE_SEO_PARAMS= {
  title: "Anoosha Store | Mobile & Gaming Accessories in Pakistan",
  description:
    "Discover mobile essentials and gaming accessories at Anoosha Store. Browse curated collections, featured picks and new arrivals with cash on delivery in Pakistan.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Anoosha Store | Everyday, elevated",
    description:
      "Curated mobile and gaming accessories. Find something worth discovering.",
    url: SITE_URL,
    type: "website",
    siteName: "Anoosha Store",
  },
};

export const HOME_PAGE_STRUCTURED_SCHEMA={
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Anoosha Store",
    url: SITE_URL,
    description: "Mobile and gaming accessories in Pakistan",
  };