"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_NAVIGATION,
  ADMIN_NAVIGATE_EVENT,
  type AdminSectionId,
} from "./admin-navigation";

function NavIcon({ name, active = false }: { name: string; active?: boolean }) {
  const common = {
    className: `h-[18px] w-[18px] shrink-0 ${active ? "text-indigo-700" : "text-slate-400"}`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "overview":
      return <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>;
    case "products":
      return <svg {...common}><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="m4 8 8 4 8-4M4 8v8l8 4 8-4V8M12 12v8"/></svg>;
    case "categories":
      return <svg {...common}><path d="M4 5.5h6l2 2h8v11H4z"/><path d="M4 8h16"/></svg>;
    case "attributes":
      return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8M12 8v8"/></svg>;
    case "inventory":
      return <svg {...common}><path d="M4 7h16v13H4zM8 7V4h8v3M8 11h8M8 15h5"/></svg>;
    case "orders":
      return <svg {...common}><path d="M6 3.5h9l3 3V20H6z"/><path d="M14.5 3.5V7H18M9 11h6M9 15h6"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2A1.7 1.7 0 0 0 7.8 17l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.2a1.7 1.7 0 1 1 0-3.4h.2A1.7 1.7 0 0 0 5.4 5.8l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a1.7 1.7 0 1 1 3.4 0v.2A1.7 1.7 0 0 0 17 3.4l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" transform="translate(-1 -1) scale(1.08)"/></svg>;
    default:
      return null;
  }
}

export function AdminWorkspace({ adminEmail }: { adminEmail: string }) {
  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");
  const activeItem = ADMIN_NAVIGATION.find((item) => item.id === activeSection) ?? ADMIN_NAVIGATION[0];
  const ActiveComponent = activeItem.component;

  useEffect(() => {
    function handleNavigation(event: Event) {
      const customEvent = event as CustomEvent<AdminSectionId>;
      if (ADMIN_NAVIGATION.some((item) => item.id === customEvent.detail)) {
        setActiveSection(customEvent.detail);
      }
    }

    window.addEventListener(ADMIN_NAVIGATE_EVENT, handleNavigation);
    return () => window.removeEventListener(ADMIN_NAVIGATE_EVENT, handleNavigation);
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
      <ActiveComponent adminEmail={adminEmail} onNavigate={setActiveSection} />
    </div>
  </div>
</main>
  );
}
