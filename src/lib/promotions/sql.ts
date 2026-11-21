/**
 * Canonical promotion pricing for storefront, cart, quote and order placement.
 *
 * Price against an ACTIVATED promotion's enrolled variant. Do not depend on
 * active_promotion_products: that table is an exclusivity/activation lock and
 * may be out of sync with older promotion data after a migration. The actual
 * sellable promotion assignment is promotion_variants + promotions.is_active.
 *
 * The scalar SELECT returns at most one promotion per variant (even if an old
 * database contains duplicate active assignments), so joining attributes
 * cannot multiply cart rows or order lines. The admin/database remains
 * responsible for rejecting overlaps; this lookup is not a substitute for
 * those constraints. Index promotion_variants(variant_id,promotion_id) is in
 * the existing schema. No additional D1 read/Worker request is issued.
 *
 * Requires product_variants alias `v` and exposes promotions alias
 * `promo_active` to the SELECT expression.
 */
export const promotionPriceJoins = `
  LEFT JOIN promotions promo_active ON promo_active.id = (
    SELECT pv.promotion_id
    FROM promotion_variants pv
    JOIN promotions active ON active.id = pv.promotion_id
      AND active.is_active = 1
    WHERE pv.variant_id = v.id AND pv.product_id = v.product_id
    ORDER BY active.created_at DESC, active.id DESC
    LIMIT 1
  )`;

/** Promotion discount REPLACES the variant's individual discount. */
export const effectiveDiscount = `CASE
  WHEN promo_active.id IS NOT NULL THEN promo_active.discount_percentage
  WHEN v.has_discount = 1 THEN v.discount_percentage
  ELSE 0
END`;
export const effectiveHasDiscount = `CASE WHEN (${effectiveDiscount}) > 0 THEN 1 ELSE 0 END`;
/** PKR paisa: round the per-unit effective price, then multiply by quantity. */
export const effectiveUnitPrice = `CAST((v.sale_price * (100 - (${effectiveDiscount})) + 50) / 100 AS INTEGER)`;
