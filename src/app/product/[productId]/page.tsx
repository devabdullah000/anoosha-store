import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { productDetails as fetchProductDetails } from "@/lib/storefront/queries";
import {
  canonical,
  productHref,
  pricePaisa,
  SITE_URL,
} from "@/lib/storefront/utils";

import ProductDetailClient from "@/components/storefront/product-detail-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ productId: string }>;
};

// Deduplicate database reads during the same server render.
// Both generateMetadata and ProductPage use this function.
const productDetails = cache(fetchProductDetails);

// Convert local and external image URLs into absolute URLs.
const absoluteImage = (url: string): string =>
  new URL(url, SITE_URL).toString();

// Generate a clean, search-friendly description.
function seoDescription(value: string, fallback: string): string {
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const text = cleaned || fallback;

  if (text.length <= 160) return text;

  return (
    text
      .slice(0, 157)
      .replace(/\s+\S*$/, "")
      .trimEnd() + "..."
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;

  const product = await productDetails(productId);

  // Missing products must not be indexed.
  if (!product) notFound();

  // Select the default variant for product SEO.
  const variant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0];

  if (!variant) notFound();

  const productName = product.name.trim();
  const categoryName = product.categoryName;

  const title = `${productName} | Anoosha Store`;

  const fallbackDescription =
    `Explore ${productName} at Anoosha Store. ` +
    `Discover product details, available options, ` +
    `and shop online in Pakistan.`;

  const description = seoDescription(
    variant.shortDescription?.trim() || variant.description?.trim() || "",
    fallbackDescription,
  );

  // Canonical URL always uses the actual product ID.
  const url = canonical(productHref(product.id));

  // Prioritize the default variant's image.
  // Fall back to another variant image if necessary.
  const imagePath =
    variant.images.find((img) => img.url)?.url ??
    product.variants.flatMap((v) => v.images).find((img) => img.url)?.url;

  const image = imagePath ? absoluteImage(imagePath) : undefined;

  return {
    metadataBase: new URL(SITE_URL),

    title: {
      absolute: title,
    },

    description,

    keywords: [
      productName,
      categoryName,
      `${productName} Pakistan`,
      "Anoosha Store",
      "online shopping Pakistan",
    ],

    alternates: {
      canonical: url,
    },

    openGraph: {
      type: "website",
      siteName: "Anoosha Store",
      locale: "en_PK",
      title,
      description,
      url,
      images: image
        ? [
            {
              url: image,
              alt: productName,
            },
          ]
        : undefined,
    },

    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await productDetails((await params).productId);
  if (!product) notFound();
  const variant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const img = variant.images.map((v) => absoluteImage(v.url));
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: variant.description,
    sku: variant.sku,
    image: img,
    url: canonical(productHref(product.id)),
    category: product.categoryName,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      priceCurrency: "PKR",
      price: (pricePaisa(v) / 100).toFixed(2),
      availability:
        v.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: canonical(productHref(product.id)),
      sku: v.sku,
      seller: { "@type": "Organization", name: "Anoosha Store" },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
