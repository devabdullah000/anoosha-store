
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  NAVBAR_CONFIG,
  NAVBAR_TEXT,
} from "../../lib/constants";

import { authClient } from "@/lib/auth-client";
import { clearAccessTokenCache } from "@/lib/auth/access-token";
import { clearAuthProfile } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const persistedProfile = useAppSelector(
    (state) => state.auth.profile
  );

  const authStatus = useAppSelector(
    (state) => state.auth.status
  );

  // Do not display persisted authentication data before
  // AuthBootstrap validates the server-side session.
  const profile =
    authStatus === "authenticated" ? persistedProfile : null;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  function displayEmail(email : string) {
    return email.length > NAVBAR_CONFIG.emailMaxLength
      ? `${email.slice(0, NAVBAR_CONFIG.emailPreviewLength)}...`
      : email;
  }

  function closeMenus() {
    setMobileOpen(false);
    setAccountOpen(false);
  }

  async function logout() {
    setSigningOut(true);
    setLogoutError("");

    try {
      const [betterAuthResult, googleResponse] = await Promise.all([
        authClient.signOut(),

        fetch(NAVBAR_CONFIG.logoutApiUrl, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (betterAuthResult.error) {
        throw new Error(betterAuthResult.error.message);
      }

      if (!googleResponse.ok) {
        throw new Error(NAVBAR_TEXT.googleLogoutError);
      }

      dispatch(clearAuthProfile());
      clearAccessTokenCache();

      closeMenus();

      router.replace(NAVBAR_CONFIG.homeHref);
      router.refresh();

    } catch (cause) {
      setLogoutError(
        cause instanceof Error
          ? cause.message
          : NAVBAR_TEXT.logoutError
      );

    } finally {
      setSigningOut(false);
    }
  }

  const gradientButton =
    "rounded-xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/15 transition-all duration-200 hover:brightness-105 hover:shadow-md active:scale-[0.98]";

  return (
    <header className="sticky top-3 z-40 mx-3 mt-3 sm:mx-5 lg:mx-8">

      {/* Gradient border wrapper */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-blue-500 to-cyan-400 p-[1px] shadow-[0_4px_20px_rgba(15,23,42,0.045)]">

        <nav
          aria-label={NAVBAR_TEXT.ariaLabel}
          className="overflow-visible rounded-[15px] bg-white/95 backdrop-blur-xl"
        >

          {/* MAIN NAVBAR */}
          <div className="mx-auto grid min-h-[68px] max-w-[1440px] grid-cols-[1fr_auto] items-center gap-3 px-3 sm:px-5 lg:grid-cols-[1fr_auto_1fr] lg:px-7">

            {/* LEFT: Store logo */}
            <Link
              href={NAVBAR_CONFIG.logoHref}
              aria-label={NAVBAR_CONFIG.logoAlt}
              onClick={closeMenus}
              className="order-1 flex min-w-0 items-center justify-start"
            >
              <img
                src={NAVBAR_CONFIG.logoUrl}
                alt={NAVBAR_CONFIG.logoAlt}
                className="h-10 max-w-[145px] object-contain sm:h-11 sm:max-w-[190px]"
              />
            </Link>

            {/* CENTER: Desktop navigation */}
            <div className="order-2 hidden items-center justify-center gap-1 lg:flex">
              {NAVBAR_CONFIG.navLinks.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold capitalize text-slate-600 transition duration-200 hover:bg-slate-50 hover:text-slate-950"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* RIGHT: Login / Account + Mobile menu */}
            <div className="order-2 flex min-w-0 items-center justify-end gap-2 lg:order-3">

              {/* Login / Account */}
              {!profile ? (
                authStatus === "loading" ? (
                  <button
                    type="button"
                    disabled
                    className={`${gradientButton} cursor-wait opacity-60`}
                  >
                    {NAVBAR_TEXT.account}
                  </button>
                ) : (
                  <Link
                    href={NAVBAR_CONFIG.loginHref}
                    className={gradientButton}
                  >
                    {NAVBAR_TEXT.login}
                  </Link>
                )
              ) : (
                <div className="relative min-w-0">
                  <button
                    type="button"
                    title={profile.email}
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    onClick={() => {
                      setAccountOpen((open) => !open);
                      setMobileOpen(false);
                    }}
                    className="flex max-w-[42vw] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:max-w-[240px]"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                      {profile.email.charAt(0).toUpperCase()}
                    </span>

                    <span className="truncate">
                      {displayEmail(profile.email)}
                    </span>

                    <svg
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        accountOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {accountOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={signingOut}
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M10 17l5-5-5-5M15 12H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>

                        {signingOut
                          ? NAVBAR_TEXT.signingOut
                          : NAVBAR_TEXT.logout}
                      </button>

                      {logoutError && (
                        <p
                          role="alert"
                          className="px-3 py-2 text-xs text-red-600"
                        >
                          {logoutError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                type="button"
                aria-label={
                  mobileOpen
                    ? NAVBAR_TEXT.closeMenu
                    : NAVBAR_TEXT.openMenu
                }
                aria-expanded={mobileOpen}
                onClick={() => {
                  setMobileOpen((open) => !open);
                  setAccountOpen(false);
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95 lg:hidden"
              >
                <span className="flex w-[18px] flex-col gap-[5px]">
                  <span
                    className={`h-[1.7px] w-full rounded-full bg-current transition-all ${
                      mobileOpen
                        ? "translate-y-[6.7px] rotate-45"
                        : ""
                    }`}
                  />

                  <span
                    className={`h-[1.7px] w-full rounded-full bg-current transition-all ${
                      mobileOpen ? "opacity-0" : ""
                    }`}
                  />

                  <span
                    className={`h-[1.7px] w-full rounded-full bg-current transition-all ${
                      mobileOpen
                        ? "-translate-y-[6.7px] -rotate-45"
                        : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* MOBILE MENU */}
          {mobileOpen && (
            <div className="border-t border-slate-100 px-4 py-4 lg:hidden">
              <div className="mx-auto flex max-w-[1440px] flex-col gap-2">

                {/* Full email appears first */}
                {profile && (
                  <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                        {profile.email.charAt(0).toUpperCase()}
                      </span>

                      <div className="min-w-0">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          {NAVBAR_TEXT.signedInAs}
                        </span>

                        <span className="block break-all text-sm font-semibold text-slate-800">
                          {profile.email}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={logout}
                      className="mt-3 flex w-full items-center gap-2 border-t border-slate-200 pt-3 text-left text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                    >
                      {signingOut
                        ? NAVBAR_TEXT.signingOut
                        : NAVBAR_TEXT.logout}
                    </button>

                    {logoutError && (
                      <p
                        role="alert"
                        className="mt-2 text-xs text-red-600"
                      >
                        {logoutError}
                      </p>
                    )}
                  </div>
                )}

                {/* Navigation links */}
                {NAVBAR_CONFIG.navLinks.map((item) => (
                  <Link
                    key={item.link}
                    href={item.link}
                    onClick={closeMenus}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold capitalize text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    {item.name}

                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m7.5 4 6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
