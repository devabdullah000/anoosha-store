import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ============================================================
   1. CATEGORIES
   ============================================================ */

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    productCount: integer("product_count").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Case-insensitive category-name uniqueness.
    uniqueIndex("categories_name_unique").on(sql`lower(${table.name})`),
    check("categories_product_count_check", sql`${table.productCount} >= 0`),
  ],
);

/* ============================================================
   2. PRODUCTS
   Parent product shared by its variants.

   status: 1 = active, 0 = inactive
   has_variants: 1 = variable product, 0 = simple product
   ============================================================ */

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    status: integer("status", { mode: "boolean" }).notNull().default(true),
    hasVariants: integer("has_variants", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Case-insensitive, globally unique parent-product name.
    uniqueIndex("products_name_unique").on(sql`lower(${table.name})`),

    check("products_status_check", sql`${table.status} in (0, 1)`),
    check("products_has_variants_check", sql`${table.hasVariants} in (0, 1)`),

    // Supports category pages filtering active/non-deleted products
    // and ordering them by creation time.
    index("products_category_listing_idx").on(
      table.categoryId,
      table.status,
      table.deletedAt,
      table.createdAt,
    ),

    // Supports the general storefront/admin product listing.
    index("products_status_deleted_created_idx").on(
      table.status,
      table.deletedAt,
      table.createdAt,
    ),
  ],
);

/* ============================================================
   3. PRODUCT VARIANTS
   Each variant is an independently purchasable item.

   Prices are integer PKR paisa.
   Discount percentage is a whole number from 1–99 when enabled.
   Variant name is unique within its parent product.
   ============================================================ */

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    shortDescription: text("short_description"),
    sku: text("sku").notNull(),
    salePrice: integer("sale_price").notNull(),
    purchasePrice: integer("purchase_price").notNull(),
    hasDiscount: integer("has_discount", { mode: "boolean" })
      .notNull()
      .default(false),
    discountPercentage: integer("discount_percentage").notNull().default(0),
    tag: text("tag"),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    status: integer("status", { mode: "boolean" }).notNull().default(true),
    stock: integer("stock").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Variant labels such as "Small" or "Black" may repeat across
    // different products, but not within the same parent product.
    uniqueIndex("product_variants_product_name_unique").on(
      table.productId,
      sql`lower(${table.name})`,
    ),

    // SKU and slug are globally unique, case-insensitively.
    uniqueIndex("product_variants_sku_unique").on(sql`lower(${table.sku})`),
    uniqueIndex("product_variants_slug_unique").on(sql`lower(${table.slug})`),

    check("product_variants_sale_price_check", sql`${table.salePrice} >= 0`),
    check(
      "product_variants_purchase_price_check",
      sql`${table.purchasePrice} >= 0`,
    ),
    check("product_variants_stock_check", sql`${table.stock} >= 0`),
    check(
      "product_variants_discount_check",
      sql`(
        (${table.hasDiscount} = 0 AND ${table.discountPercentage} = 0)
        OR
        (${table.hasDiscount} = 1 AND ${table.discountPercentage} BETWEEN 1 AND 99)
      )`,
    ),
    check("product_variants_default_check", sql`${table.isDefault} in (0, 1)`),
    check("product_variants_status_check", sql`${table.status} in (0, 1)`),

    // At most one default variant per product. The application must also
    // ensure exactly one default variant when a product is published.
    uniqueIndex("product_variants_one_default_per_product_idx")
      .on(table.productId)
      .where(sql`${table.isDefault} = 1`),

    // Supports loading a product's active variants and default-variant status.
    index("product_variants_product_status_default_idx").on(
      table.productId,
      table.status,
      table.isDefault,
    ),
  ],
);

/* ============================================================
   4. PRODUCT IMAGES

   sort_order is restricted to 1–5 and unique per variant.
   Therefore, a variant can have no more than five image records.
   storage_key is the object-storage key (S3/R2), not a public URL.
   ============================================================ */

export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    storageKey: text("storage_key").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    check(
      "product_images_sort_order_check",
      sql`${table.sortOrder} between 1 and 5`,
    ),
    check("product_images_primary_check", sql`${table.isPrimary} in (0, 1)`),

    // Also serves image retrieval by variant, ordered by sort_order.
    uniqueIndex("product_images_variant_sort_order_unique").on(
      table.variantId,
      table.sortOrder,
    ),

    // At most one primary image per variant.
    uniqueIndex("product_images_one_primary_per_variant_idx")
      .on(table.variantId)
      .where(sql`${table.isPrimary} = 1`),
  ],
);

/* ============================================================
   5. ATTRIBUTES
   Reusable attribute definitions.
   ============================================================ */

export const attributes = sqliteTable(
  "attributes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    valueType: text("value_type").notNull(),
    unit: text("unit"),
    displayType: text("display_type").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Case-insensitive attribute-name uniqueness.
    uniqueIndex("attributes_name_unique").on(sql`lower(${table.name})`),
    check(
      "attributes_value_type_check",
      sql`${table.valueType} in ('text', 'number', 'boolean', 'color')`,
    ),
    check(
      "attributes_display_type_check",
      sql`${table.displayType} in ('dropdown', 'button', 'color')`,
    ),
  ],
);

/* ============================================================
   6. VARIANT ATTRIBUTES
   One assigned value per attribute per variant.
   ============================================================ */

export const variantAttributes = sqliteTable(
  "variant_attributes",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    attributeId: text("attribute_id")
      .notNull()
      .references(() => attributes.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    value: text("value").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Supports loading attributes for a variant and prevents duplicates.
    uniqueIndex("variant_attributes_variant_attribute_unique").on(
      table.variantId,
      table.attributeId,
    ),

    // Supports reverse lookup: variants using a given attribute.
    index("variant_attributes_attribute_id_idx").on(table.attributeId),
  ],
);

/* ============================================================
   7. INVENTORY MOVEMENTS
   Append-only inventory audit history.

   qty_diff = new_qty - previous_qty
   No updated_at: movement records are historical.
   ============================================================ */

export const inventoryMovements = sqliteTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    movementType: text("movement_type").notNull(),
    previousQty: integer("previous_qty").notNull(),
    newQty: integer("new_qty").notNull(),
    qtyDiff: integer("qty_diff").notNull(),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    check(
      "inventory_movements_previous_qty_check",
      sql`${table.previousQty} >= 0`,
    ),
    check(
      "inventory_movements_new_qty_check",
      sql`${table.newQty} >= 0`,
    ),
    check(
      "inventory_movements_qty_diff_check",
      sql`${table.qtyDiff} = (${table.newQty} - ${table.previousQty})`,
    ),

    // Supports a variant's movement history, newest first.
    index("inventory_movements_variant_created_idx").on(
      table.variantId,
      table.createdAt,
    ),

    // Supports administrative filtering by movement type and date.
    index("inventory_movements_type_created_idx").on(
      table.movementType,
      table.createdAt,
    ),
  ],
);

/* ============================================================
   DRIZZLE RELATIONS
   These enable relational/eager queries. They do not replace the
   foreign keys above and do not create database constraints.
   ============================================================ */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    images: many(productImages),
    attributes: many(variantAttributes),
    inventoryMovements: many(inventoryMovements),
  }),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  variant: one(productVariants, {
    fields: [productImages.variantId],
    references: [productVariants.id],
  }),
}));

export const attributesRelations = relations(attributes, ({ many }) => ({
  variantAttributes: many(variantAttributes),
}));

export const variantAttributesRelations = relations(
  variantAttributes,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [variantAttributes.variantId],
      references: [productVariants.id],
    }),
    attribute: one(attributes, {
      fields: [variantAttributes.attributeId],
      references: [attributes.id],
    }),
  }),
);

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [inventoryMovements.variantId],
      references: [productVariants.id],
    }),
  }),
);