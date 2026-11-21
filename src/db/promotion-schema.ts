import { relations, sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { categories, products, productVariants } from "@/db/product-schema";

export const promotions = sqliteTable("promotions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  discountPercentage: integer("discount_percentage").notNull(),
  scope: text("scope", { enum: ["store", "categories", "products"] }).notNull(),
  targetsJson: text("targets_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  uniqueIndex("promotions_name_unique").on(sql`lower(trim(${t.name}))`),
  uniqueIndex("promotions_single_active_store").on(t.scope)
    .where(sql`${t.scope}='store' AND ${t.isActive}=1`),
  index("promotions_active_updated_idx").on(t.isActive,t.updatedAt),
  check("promotions_discount_check",sql`${t.discountPercentage} BETWEEN 1 AND 99`),
  check("promotions_scope_check",sql`${t.scope} IN ('store','categories','products')`),
  check("promotions_active_check",sql`${t.isActive} IN (0,1)`),
  check("promotions_targets_check",sql`json_valid(${t.targetsJson})`),
]);

export const promotionVariants = sqliteTable("promotion_variants", {
  promotionId: text("promotion_id").notNull().references(()=>promotions.id,{onDelete:"cascade"}),
  productId: text("product_id").notNull().references(()=>products.id,{onDelete:"cascade"}),
  variantId: text("variant_id").notNull().references(()=>productVariants.id,{onDelete:"cascade"}),
}, (t) => [
  primaryKey({columns:[t.promotionId,t.variantId]}),
  index("promotion_variants_product_idx").on(t.productId,t.promotionId),
  index("promotion_variants_variant_idx").on(t.variantId,t.promotionId),
]);

export const activePromotionProducts = sqliteTable("active_promotion_products", {
  productId: text("product_id").primaryKey().references(()=>products.id,{onDelete:"cascade"}),
  promotionId: text("promotion_id").notNull().references(()=>promotions.id,{onDelete:"cascade"}),
}, t=>[index("active_promotion_promotion_idx").on(t.promotionId)]);

/** Category-scope reservation: even selective category promos cannot overlap on one category. */
export const activePromotionCategories = sqliteTable("active_promotion_categories", {
  categoryId: text("category_id").primaryKey().references(()=>categories.id,{onDelete:"cascade"}),
  promotionId: text("promotion_id").notNull().references(()=>promotions.id,{onDelete:"cascade"}),
}, t=>[index("active_promotion_categories_promotion_idx").on(t.promotionId)]);

export const promotionsRelations = relations(promotions,({many})=>({variants:many(promotionVariants),activeProducts:many(activePromotionProducts),activeCategories:many(activePromotionCategories)}));
export const promotionVariantsRelations = relations(promotionVariants,({one})=>({
  promotion:one(promotions,{fields:[promotionVariants.promotionId],references:[promotions.id]}),
  product:one(products,{fields:[promotionVariants.productId],references:[products.id]}),
  variant:one(productVariants,{fields:[promotionVariants.variantId],references:[productVariants.id]}),
}));
export const activePromotionProductsRelations = relations(activePromotionProducts,({one})=>({
  promotion:one(promotions,{fields:[activePromotionProducts.promotionId],references:[promotions.id]}),
  product:one(products,{fields:[activePromotionProducts.productId],references:[products.id]}),
}));

export const activePromotionCategoriesRelations = relations(activePromotionCategories,({one})=>({
  promotion:one(promotions,{fields:[activePromotionCategories.promotionId],references:[promotions.id]}),
  category:one(categories,{fields:[activePromotionCategories.categoryId],references:[categories.id]}),
}));
