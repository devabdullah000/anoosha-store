// Admin config and constants file. All constants and config related to admin panel is described in this file.
// These are programatic constants and other displayed text for admin panel is still described in constants.ts file
"use client";

import type { ComponentType } from "react";
import {
  AttributesPanel,
  CategoriesPanel,
  InventoryPanel,
  OrdersPanel,
  OverviewPanel,
  ProductsPanel,
  SettingsPanel,
  PromotionsPanel,
  type AdminPanelProps,
} from "./admin-panels";

export type AdminSectionId =
  | "overview"
  | "products"
  | "categories"
  | "attributes"
  | "inventory"
  | "orders"
  | "promotions"
  | "settings";

export type AdminNavigationItem = {
  id: AdminSectionId;
  name: string;
  icon: "overview" | "products" | "categories" | "attributes" | "inventory" | "orders" | "promotions" | "settings";
  component: ComponentType<AdminPanelProps>;
};

// This is the single navigation registry used by both the desktop sidebar
// and the mobile Navbar. Add another item here to add a new workspace section.
export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { id: "overview", name: "Overview", icon: "overview", component: OverviewPanel },
  { id: "products", name: "Products", icon: "products", component: ProductsPanel },
  { id: "categories", name: "Categories", icon: "categories", component: CategoriesPanel },
  { id: "attributes", name: "Attributes", icon: "attributes", component: AttributesPanel },
  { id: "inventory", name: "Inventory", icon: "inventory", component: InventoryPanel },
  { id: "orders", name: "Orders", icon: "orders", component: OrdersPanel },
  { id: "promotions", name: "Promotions", icon: "promotions", component: PromotionsPanel },
  { id: "settings", name: "Settings", icon: "settings", component: SettingsPanel },
];

export const ADMIN_NAVIGATE_EVENT = "anoosha-store:admin-navigate";

export function requestAdminNavigation(section: AdminSectionId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AdminSectionId>(ADMIN_NAVIGATE_EVENT, { detail: section }),
  );
}
