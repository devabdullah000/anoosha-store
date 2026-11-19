import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productDetails } from "@/lib/storefront/queries";
import {
  canonical,
  productHref,
  pricePaisa,
  SITE_URL,
} from "@/lib/storefront/utils";
import ProductDetailClient from "@/components/storefront/product-detail-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ productId: string }> };

const absoluteImage = (url: string) =>
  url.startsWith("/") ? `${SITE_URL}${url}` : url;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).productId;
  const product = await productDetails(id);
  if (!product)
    return {
      title: "Product not found | Anoosha Store",
      robots: { index: false },
    };
  const variant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const description = (variant.shortDescription || variant.description)
    .replace(/\s+/g, " ")
    .slice(0, 155);
  const image = variant.images[0]?.url;
  const url = canonical(productHref(id));
  return {
    title: `${product.name} | Anoosha Store`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} | Anoosha Store`,
      description,
      url,
      type: "website",
      images: image
        ? [{ url: absoluteImage(image), alt: product.name }]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.name,
      description,
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
