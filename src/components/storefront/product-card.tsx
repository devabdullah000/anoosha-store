import Link from "next/link";
import { LuArrowUpRight } from "react-icons/lu";

import type { ProductCardModel } from "@/lib/storefront/types";

import {
  categoryHref,
  descriptionPreview,
  productHref,
} from "@/lib/storefront/utils";

import Price from "./price";
import css from "./storefront.module.css";
import ResilientImage from "./resilient-image";

export default function ProductCard({
  product,
}: {
  product: ProductCardModel;
}) {
  const href = productHref(product.productId);

  const preview = descriptionPreview(
    product.shortDescription,
    product.description,
  );

  return (
    <div className="group h-full rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(15,23,42,0.10)]">
      <article
        className={`${css.card} flex h-full flex-col overflow-hidden rounded-[15px] bg-white`}
      >
        {/* Product image */}
        <Link
          href={href}
          className="relative block aspect-[1.12/1] overflow-hidden bg-gradient-to-br from-[#f3f5fc] via-[#fbfaff] to-[#eaf7ff]"
          aria-label={`View ${product.name}`}
        >
          <ResilientImage
            src={product.imageUrl}
            fallbackSrc={product.fallbackImageUrl ?? undefined}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-5 transition-transform duration-700 group-hover:scale-[1.075]"
          />

          <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition duration-300 group-hover:rotate-45 group-hover:text-indigo-700">
            <LuArrowUpRight className="h-4 w-4" />
          </span>
        </Link>

        {/* Product information */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <Link
            href={href}
            className="text-[15px] font-extrabold leading-snug tracking-tight text-slate-950 transition hover:text-indigo-600 sm:text-base"
          >
            {product.name}
          </Link>

          {/* Category and variants */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link
              href={categoryHref(product.categoryId)}
              className="rounded-md border border-indigo-100 bg-indigo-50/70 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              {product.categoryName}
            </Link>

            {product.hasVariants && (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
                {product.variantCount}{" "}
                {product.variantCount === 1 ? "variant" : "variants"}
              </span>
            )}
          </div>

          {/* Product description */}
          <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500 sm:text-[13px]">
            {preview.text}

            {preview.truncated && (
              <Link
                href={href}
                className="ml-1 font-bold text-indigo-600 hover:underline"
              >
                See more
              </Link>
            )}
          </p>

          {/* Price */}
          <div className="mt-auto border-t border-slate-100 pt-4">
            <Price
              salePrice={product.salePrice}
              hasDiscount={product.hasDiscount}
              discountPercentage={product.discountPercentage}
              compact
            />
          </div>
        </div>
      </article>
    </div>
  );
}
