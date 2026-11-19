"use client";

import { useEffect, useState } from "react";
import {
  LuLayoutGrid,
  LuPackage,
  LuFolder,
  LuCirclePlus,
  LuWarehouse,
  LuFileText,
  LuSettings,
} from "react-icons/lu";
import {
  ADMIN_NAVIGATION,
  ADMIN_NAVIGATE_EVENT,
  type AdminSectionId,
} from "./admin-navigation";
import { ICON_CLASS } from "@/lib/constants";

function NavIcon({ name, active = false }: { name: string; active?: boolean }) {
  switch (name) {
    case "overview":
      return <LuLayoutGrid className={ICON_CLASS} />;

    case "products":
      return <LuPackage className={ICON_CLASS} />;

    case "categories":
      return <LuFolder className={ICON_CLASS} />;

    case "attributes":
      return <LuCirclePlus className={ICON_CLASS} />;

    case "inventory":
      return <LuWarehouse className={ICON_CLASS} />;

    case "orders":
      return <LuFileText className={ICON_CLASS} />;

    case "settings":
      return <LuSettings className={ICON_CLASS} />;

    default:
      return null;
  }
}

export function AdminWorkspace({ adminEmail }: { adminEmail: string }) {
  const [activeSection, setActiveSection] =
    useState<AdminSectionId>("overview");
  const activeItem =
    ADMIN_NAVIGATION.find((item) => item.id === activeSection) ??
    ADMIN_NAVIGATION[0];
  const ActiveComponent = activeItem.component;

  useEffect(() => {
    function handleNavigation(event: Event) {
      const customEvent = event as CustomEvent<AdminSectionId>;
      if (ADMIN_NAVIGATION.some((item) => item.id === customEvent.detail)) {
        setActiveSection(customEvent.detail);
      }
    }

    window.addEventListener(ADMIN_NAVIGATE_EVENT, handleNavigation);
    return () =>
      window.removeEventListener(ADMIN_NAVIGATE_EVENT, handleNavigation);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-7 sm:px-6 lg:px-8 lg:pt-9">
      <div className="grid min-w-0 gap-7 lg:grid-cols-[245px_minmax(0,1fr)] xl:gap-9">
        <aside className="hidden lg:block">
          {/* Gradient border wrapper */}
          <div className="sticky top-28 rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]">
            {/* Actual white menu */}
            <div className="rounded-[15px] bg-white p-3">
              <div className="px-3 pb-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Workspace menu
                </p>
              </div>

              <nav aria-label="Admin sections" className="space-y-1">
                {ADMIN_NAVIGATION.map((item) => {
                  const active = item.id === activeSection;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-indigo-50 text-indigo-800 shadow-sm shadow-indigo-950/[0.03]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      <NavIcon name={item.icon} active={active} />
                      <span>{item.name}</span>

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 border-t border-slate-100 px-3 pb-2 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Signed in
                </p>
                <p className="mt-2 break-all text-xs font-medium leading-5 text-slate-600">
                  {adminEmail}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0" aria-live="polite">
          <ActiveComponent
            adminEmail={adminEmail}
            onNavigate={setActiveSection}
          />
        </div>
      </div>
    </main>
  );
}
