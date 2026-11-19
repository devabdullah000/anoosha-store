import { money, pricePaisa } from "@/lib/storefront/utils";
export default function Price({
  salePrice,
  hasDiscount,
  discountPercentage,
  compact = false,
}: {
  salePrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  compact?: boolean;
}) {
  const final = pricePaisa({ salePrice, hasDiscount, discountPercentage });
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${compact ? "" : "sm:gap-x-3"}`}
    >
      <span
        className={`font-extrabold tracking-tight text-slate-950 ${compact ? "text-lg" : "text-2xl sm:text-3xl"}`}
      >
        {money(final)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-xs font-medium text-slate-400 line-through sm:text-sm">
            {money(salePrice)}
          </span>
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
            -{discountPercentage}%
          </span>
        </>
      )}
    </div>
  );
}
