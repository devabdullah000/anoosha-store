
"use client";

import Link from "next/link";
import { LuShoppingCart } from "react-icons/lu";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  NAVBAR_CONFIG,
  NAVBAR_TEXT,
} from "../../lib/constants";

import { authClient } from "@/lib/auth-client";
import { clearAccessTokenCache } from "@/lib/auth/access-token";
import { clearAuthProfile } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ADMIN_NAVIGATION, requestAdminNavigation } from "@/components/admin/admin-navigation";

// Choose ONE mobile layout by commenting/uncommenting this value:
const MOBILE_CART_IN_TOP_BAR = true;
// const MOBILE_CART_IN_TOP_BAR = false; // Alternative: show below account details in expanded mobile menu.

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
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

  // Hide the cart while authentication is being resolved to avoid flashing
  // a customer-only action for signed-in administrators.
  const showCustomerCart =
    authStatus !== "loading" && profile?.role !== "admin";
  const storefrontLinks = NAVBAR_CONFIG.navLinks.filter(
    (item) => item.link !== "/cart",
  );

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
          <div className="mx-auto grid min-h-[68px] max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-5 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:px-7">

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
                className="h-9 max-w-[68px] object-contain sm:h-11 sm:max-w-[145px] xl:max-w-[190px]"
              />
            </Link>

            {/* DESKTOP: links follow the logo instead of occupying a centered column. */}
            <div className="order-2 hidden min-w-0 items-center justify-start gap-0 xl:ml-7 xl:flex 2xl:ml-10">
              {profile?.role === "admin" ? (
                <Link
                  href="/admin/dashboard"
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 ${pathname.startsWith("/admin/dashboard") ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                >
                  Admin workspace
                </Link>
              ) : (
                storefrontLinks.map((item) => (
                  <Link
                    key={item.link}
                    href={item.link}
                    className={`whitespace-nowrap rounded-xl px-2.5 py-2.5 text-[13px] font-semibold capitalize transition duration-200 2xl:px-3.5 2xl:text-sm ${pathname === item.link ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                  >
                    {item.name}
                  </Link>
                ))
              )}
            </div>

            {/* RIGHT: Account, cart icon, and mobile menu. */}
            <div className="order-2 flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 xl:order-3">

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
                    className="flex max-w-[37vw] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:max-w-[240px] sm:gap-2 sm:px-3"
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

              {/* Customer cart icon: active in desktop and mobile top bar.
                  Guests may open /cart; the cart page redirects them to /login.
                  Admins never see a cart control. */}
              {showCustomerCart && (
                <Link
                  href="/cart"
                  aria-label="Open shopping cart"
                  title="My cart"
                  aria-current={pathname === "/cart" ? "page" : undefined}
                  onClick={closeMenus}
                  className={`h-10 w-10 shrink-0 place-items-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${MOBILE_CART_IN_TOP_BAR ? "grid" : "hidden xl:grid"} ${pathname === "/cart" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"}`}
                >
                  <LuShoppingCart className="h-5 w-5" aria-hidden="true" />
                </Link>
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95 xl:hidden"
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
            <div className="max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-contain border-t border-slate-100 px-4 py-4 xl:hidden">
              <div className="mx-auto flex max-w-[1440px] flex-col gap-2 pb-2">

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

                {/* Alternate MOBILE design, enabled by setting MOBILE_CART_IN_TOP_BAR = false.
                    This puts My Cart directly AFTER the signed-in account details.
                    The top bar icon is automatically hidden on mobile in this mode. */}
                {showCustomerCart && !MOBILE_CART_IN_TOP_BAR && (
                  <Link
                    href="/cart"
                    onClick={closeMenus}
                    aria-label="Open shopping cart"
                    className={`mb-2 flex min-h-12 items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition ${pathname === "/cart" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`}
                  >
                    <LuShoppingCart className="h-5 w-5" aria-hidden="true" />
                    My cart
                  </Link>
                )}

                {/* Admin section links stay on /admin/dashboard and switch components internally. */}
                {profile?.role === "admin" ? (
                  pathname.startsWith("/admin/dashboard") ? (
                    <>
                      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Admin workspace
                      </p>
                      {ADMIN_NAVIGATION.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            requestAdminNavigation(item.id);
                            closeMenus();
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-800"
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
                        </button>
                      ))}
                    </>
                  ) : (
                    <Link
                      href="/admin/dashboard"
                      onClick={closeMenus}
                      className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100"
                    >
                      Open admin workspace
                      <span aria-hidden="true">→</span>
                    </Link>
                  )
                ) : (
                  storefrontLinks.map((item) => (
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
                  ))
                )}
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}