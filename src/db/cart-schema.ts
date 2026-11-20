import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { productVariants } from "@/db/product-schema";

/** Additional table only; import/re-export from your Drizzle schema index. */
export const cartItems = sqliteTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    userEmail: text("user_email").notNull(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    quantity: integer("quantity").notNull(),
    selectionsJson: text("selections_json").notNull().default("[]"),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    variantNameSnapshot: text("variant_name_snapshot").notNull(),
    unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
    imageKeySnapshot: text("image_key_snapshot"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("cart_items_user_variant_unique").on(
      table.userId,
      table.variantId,
    ),
    index("cart_items_user_created_idx").on(table.userId, table.createdAt),
    check("cart_items_quantity_check", sql`${table.quantity} BETWEEN 1 AND 99`),
    check(
      "cart_items_selection_json_check",
      sql`json_valid(${table.selectionsJson})`,
    ),
    check("cart_items_unit_price_check", sql`${table.unitPriceSnapshot} >= 0`),
  ],
);
