
"use client";

import { useState, type ComponentType, type ReactNode } from "react";

import AdminPasswordReset from "./admin-password-reset";

type SettingsComponentProps = {
  adminEmail: string;
};

type SettingModule = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  component: ComponentType<SettingsComponentProps>;
};

/**
 * Register future settings here.
 * Every card opens its associated component.
 */
const SETTINGS_MODULES: SettingModule[] = [
  {
    id: "admin-password",
    title: "Administrator password",
    description:
      "Reset your admin password using an email verification code.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path
          d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    component: AdminPasswordReset,
  },
];

type SettingsInterfaceProps = {
  adminEmail: string;
};

export default function SettingsInterface({
  adminEmail,
}: SettingsInterfaceProps) {
  // Initially display cards only.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule = SETTINGS_MODULES.find(
    (setting) => setting.id === selectedId,
  );

  const SelectedComponent = selectedModule?.component;

  // Detail view: cards are hidden.
  if (SelectedComponent && selectedModule) {
    return (
      <section className="min-w-0 space-y-5">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          aria-label="Back to settings"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              d="m15 18-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to settings
        </button>

        <SelectedComponent
          key={selectedModule.id}
          adminEmail={adminEmail}
        />
      </section>
    );
  }

  // Overview: display registered settings cards.
  return (
    <section className="min-w-0 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          Workspace
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Settings
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Manage administrator account and workspace preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_MODULES.map((setting) => (
          <div
            key={setting.id}
            className="rounded-2xl bg-slate-200 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-pink-500 hover:via-blue-500 hover:to-cyan-400"
          >
            <button
              type="button"
              onClick={() => setSelectedId(setting.id)}
              className="flex h-full w-full flex-col items-start rounded-[15px] bg-white p-5 text-left transition hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:p-6"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                {setting.icon}
              </span>

              <span className="mt-4 text-base font-bold text-slate-900">
                {setting.title}
              </span>

              <span className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                {setting.description}
              </span>

              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-indigo-700">
                Manage setting
                <span aria-hidden="true">→</span>
              </span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
