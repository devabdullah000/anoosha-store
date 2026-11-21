"use client";

import {
  LuLayoutGrid,
  LuLayers,
  LuSlidersHorizontal,
  LuWarehouse,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import type { AdminSectionId } from "./admin-navigation";
import { CategoriesInterface } from "./categories/category-panel";
import { AttributesInterface } from "./attributes/attribute-panel";
import { ProductsInterface } from "./products";
import InventoryInterface from "./inventory/inventory-panel";
import OrdersInterface from "../orders/admin-orders-manager";
import PromotionsInterface from "./promotions/promotions-panel";
import SalesReportInterface from "./sales-report/sales-report-panel";
import SettingsInterface from "./settings/settings";
import { ADMIN_PANEL_MAIN_TEXT } from "@/lib/constants";

export type AdminPanelProps = {
  adminEmail: string;
  onNavigate: (section: AdminSectionId) => void;
};

export function OverviewPanel({ adminEmail, onNavigate }: AdminPanelProps) {
  const cards: {
    id: AdminSectionId;
    label: string;
    description: string;
    icon: IconType;
  }[] = [
    {
      id: "products",
      label: "Products",
      description:
        "Review the catalog, product variants, images and availability.",
      icon: LuLayoutGrid,
    },
    {
      id: "categories",
      label: "Categories",
      description: "Organize products into searchable storefront categories.",
      icon: LuLayers,
    },
    {
      id: "attributes",
      label: "Attributes",
      description: "Manage reusable variant attributes and their values.",
      icon: LuSlidersHorizontal,
    },
    {
      id: "inventory",
      label: "Inventory",
      description: "Review live variant stock and stock movement status.",
      icon: LuWarehouse,
    },
  ];

  return (
    <section className="space-y-7">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">
            {ADMIN_PANEL_MAIN_TEXT}
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Good to see you.
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your store operations, catalog and inventory are together in one
            workspace.
          </p>

          <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="truncate">Signed in as {adminEmail}</span>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none -mt-8 ml-auto hidden h-32 w-32 rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_0_24px_rgba(255,255,255,0.025)] sm:block"
        />
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            Quick access
          </p>
        </div>

        <span className="hidden text-xs text-slate-400 sm:block">
          Choose a workspace to get started
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => {
          // Convert the stored React Icons component into JSX.
          const Icon = card.icon;

          return (
            <div
              key={card.id}
              className="rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5"
            >
              <button
                type="button"
                onClick={() => onNavigate(card.id)}
                className="group h-full w-full rounded-[15px] bg-white p-5 text-left transition duration-200 hover:bg-white/95"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>

                <span className="mt-5 block text-base font-bold text-slate-900">
                  {card.label}
                </span>

                <span className="mt-2 block text-sm leading-6 text-slate-500">
                  {card.description}
                </span>

                <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-indigo-700">
                  Open section <span aria-hidden="true">→</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProductsPanel(_props: AdminPanelProps) {
  return <ProductsInterface {..._props} />;
}

export function CategoriesPanel(_props: AdminPanelProps) {
  return <CategoriesInterface {..._props} />;
}

export function AttributesPanel(_props: AdminPanelProps) {
  return <AttributesInterface {..._props} />;
}

export function InventoryPanel(_props: AdminPanelProps) {
  return <InventoryInterface />;
}

export function OrdersPanel(_props: AdminPanelProps) {
  return <OrdersInterface />;
}

export function PromotionsPanel(_props: AdminPanelProps) {
  return <PromotionsInterface />;
}

export function SalesReportPanel(_props: AdminPanelProps) {
  return <SalesReportInterface />;
}

export function SettingsPanel({ adminEmail }: AdminPanelProps) {
  return <SettingsInterface adminEmail={adminEmail} />;
}
