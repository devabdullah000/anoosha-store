import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Supported checkout payment methods. */
export const ORDER_PAYMENT_METHODS = ["cod", "easypaisa", "jazzcash"] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

/**
 * Append-only historical order snapshots.
 * Deliberately no foreign keys to products or variants: those records may
 * change or be archived, while purchased item snapshots must remain intact.
 */
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id").notNull(),
    userEmail: text("user_email").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("Pakistan"),
    storeNameSnapshot: text("store_name_snapshot").notNull(),
    storeAddressSnapshot: text("store_address_snapshot").notNull(),
    paymentMethod: text("payment_method", {
      enum: ORDER_PAYMENT_METHODS,
    })
      .notNull()
      .default("cod"),
    status: text("status").notNull().default("pending"),
    grossPaisa: integer("gross_paisa").notNull(),
    discountPaisa: integer("discount_paisa").notNull(),
    subtotalPaisa: integer("subtotal_paisa").notNull(),
    shippingPaisa: integer("shipping_paisa").notNull().default(0),
    totalPaisa: integer("total_paisa").notNull(),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: text("cancelled_by"),
    cancelledAt: text("cancelled_at"),
    deliveredAt: text("delivered_at"),
    lastActionId: text("last_action_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("orders_owner_idempotency_unique").on(
      t.userId,
      t.idempotencyKey,
    ),
    index("orders_user_date_idx").on(t.userId, t.userEmail, t.createdAt),
    index("orders_status_date_idx").on(t.status, t.createdAt),
    check(
      "orders_status_check",
      sql`${t.status} IN ('pending','processing','delivered','cancelled')`,
    ),
    check(
      "orders_payment_check",
      sql`${t.paymentMethod} IN ('cod','easypaisa','jazzcash')`,
    ),
    check(
      "orders_totals_check",
      sql`${t.grossPaisa} >= 0 AND ${t.discountPaisa} >= 0 AND ${t.subtotalPaisa} >= 0 AND ${t.shippingPaisa} >= 0 AND ${t.totalPaisa}=${t.subtotalPaisa}+${t.shippingPaisa} AND ${t.subtotalPaisa}=${t.grossPaisa}-${t.discountPaisa}`,
    ),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productIdSnapshot: text("product_id_snapshot").notNull(),
    variantIdSnapshot: text("variant_id_snapshot").notNull(),
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    hasVariants: integer("has_variants", { mode: "boolean" }).notNull(),
    sku: text("sku").notNull(),
    quantity: integer("quantity").notNull(),
    imageKey: text("image_key"),
    originalUnitPaisa: integer("original_unit_paisa").notNull(),
    discountPercentage: integer("discount_percentage").notNull(),
    finalUnitPaisa: integer("final_unit_paisa").notNull(),
    grossPaisa: integer("gross_paisa").notNull(),
    discountPaisa: integer("discount_paisa").notNull(),
    netPaisa: integer("net_paisa").notNull(),
    selectedAttributesJson: text("selected_attributes_json").notNull(),
    productSnapshotJson: text("product_snapshot_json").notNull(),
    variantSnapshotJson: text("variant_snapshot_json").notNull(),
    attributesSnapshotJson: text("attributes_snapshot_json").notNull(),
    imagesSnapshotJson: text("images_snapshot_json").notNull(),
  },
  (t) => [
    uniqueIndex("order_items_variant_per_order_unique").on(
      t.orderId,
      t.variantIdSnapshot,
    ),
    index("order_items_order_idx").on(t.orderId),
    check("order_items_qty_check", sql`${t.quantity} BETWEEN 1 AND 99`),
    check(
      "order_items_amounts_check",
      sql`${t.originalUnitPaisa}>=0 AND ${t.finalUnitPaisa}>=0 AND ${t.netPaisa}=${t.finalUnitPaisa}*${t.quantity} AND ${t.grossPaisa}=${t.originalUnitPaisa}*${t.quantity} AND ${t.discountPaisa}=${t.grossPaisa}-${t.netPaisa}`,
    ),
    check(
      "order_items_json_check",
      sql`json_valid(${t.selectedAttributesJson}) AND json_valid(${t.productSnapshotJson}) AND json_valid(${t.variantSnapshotJson}) AND json_valid(${t.attributesSnapshotJson}) AND json_valid(${t.imagesSnapshotJson})`,
    ),
  ],
);

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    previousStatus: text("previous_status"),
    nextStatus: text("next_status").notNull(),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("order_events_order_date_idx").on(t.orderId, t.createdAt)],
);

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
}));