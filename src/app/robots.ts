import type { MetadataRoute } from "next";
import { STORE_URL } from "@/lib/constants";

const BASE_URL = STORE_URL.replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/",
        "/login",
        "/signup",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/checkout",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}