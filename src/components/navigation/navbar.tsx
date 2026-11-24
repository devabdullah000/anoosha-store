
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { IconType } from "react-icons";

import {
  LuHouse,
  LuShoppingBag,
  LuShoppingCart,
  LuPackage,
  LuInfo,
  LuMail,
  LuCircleHelp,
  LuShieldCheck,
  LuLogIn,
  LuLogOut,
  LuChevronDown,
  LuChevronRight,
  LuLayoutDashboard,
  LuLayers,
  LuTags,
  LuWarehouse,
  LuFileText,
  LuBadgePercent,
  LuChartNoAxesColumn,
  LuSettings,
  LuMenu,
  LuX,
  LuUserRound,
  LuArrowRight,
  LuSparkles,
} from "react-icons/lu";

import {
  NAVBAR_CONFIG,
  NAVBAR_TEXT,
} from "../../lib/constants";

import { authClient } from "@/lib/auth-client";
import { clearAccessTokenCache } from "@/lib/auth/access-token";
import { clearAuthProfile } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  ADMIN_NAVIGATION,
  requestAdminNavigation,
} from "@/components/admin/admin-navigation";

// Mobile presentation: cart appears inside expanded menu.
const MOBILE_CART_IN_TOP_BAR = false;

// Icon mapping only. Existing navigation configuration is unchanged.
const NAV_ICONS: Record<string, IconType> = {
  "/": LuHouse,
  "/shop": LuShoppingBag,
  "/orders": LuPackage,
  "/cart": LuShoppingCart,
  "/about": LuInfo,
  "/contact": LuMail,
  "/faq": LuCircleHelp,
  "/privacy-policy": LuShieldCheck,
};

// Match the icons already used by the desktop admin sidebar.
// ADMIN_NAVIGATION stores icon identifiers rather than React components.
const ADMIN_NAV_ICONS: Record<
  (typeof ADMIN_NAVIGATION)[number]["icon"],
  IconType
> = {
  overview: LuLayoutDashboard,
  products: LuPackage,
  categories: LuLayers,
  attributes: LuTags,
  inventory: LuWarehouse,
  orders: LuFileText,
  promotions: LuBadgePercent,
  sales: LuChartNoAxesColumn,
  settings: LuSettings,
};

const gradientButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/15 transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

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

  // Cached Redux profile is display-only on public pages. Protected SSR
  // pages and all private APIs ALWAYS validate HttpOnly session cookies.
  const profile =
    authStatus === "authenticated" || authStatus === "cached"
      ? persistedProfile
      : null;

  const showCustomerCart =
    authStatus !== "loading" && profile?.role !== "admin";

  const storefrontLinks = NAVBAR_CONFIG.navLinks.filter(
    (item) => item.link !== "/cart",
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  function displayEmail(email: string) {
    return email.length > NAVBAR_CONFIG.emailMaxLength
      ? `${email.slice(0, NAVBAR_CONFIG.emailPreviewLength)}...`
      : email;
  }

  function closeMenus() {
    setMobileOpen(false);
    setAccountOpen(false);
  }

  // Existing logout logic: unchanged.
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

      // Changing to the public home route after logout refreshes via
      // navigation. Avoid a second redundant RSC request to router.refresh().
      router.replace(NAVBAR_CONFIG.homeHref);

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

  return (
    <header className="sticky top-3 z-4000 mx-3 mt-3 sm:top-4 sm:mx-5 sm:mt-4 lg:mx-7">

      {/* PREMIUM GRADIENT BORDER */}
      <div className="relative rounded-[22px] bg-gradient-to-r from-pink-400 via-indigo-500 to-cyan-400 p-[1px] shadow-[0_8px_35px_-12px_rgba(30,41,59,0.22)]">

        <nav
          aria-label={NAVBAR_TEXT.ariaLabel}
          className="relative rounded-[21px] bg-white/95 backdrop-blur-2xl"
        >

          {/* TOP NAVBAR */}
          <div className="mx-auto flex min-h-[70px] max-w-[1500px] items-center gap-3 px-3 sm:min-h-[76px] sm:px-5 xl:gap-4 xl:px-6 2xl:px-8">

            {/* BRAND LOGO */}
            <Link
              href={NAVBAR_CONFIG.logoHref}
              prefetch={false}
              aria-label={NAVBAR_CONFIG.logoAlt}
              onClick={closeMenus}
              className="group flex shrink-0 items-center rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <img
                src={NAVBAR_CONFIG.logoUrl}
                alt={NAVBAR_CONFIG.logoAlt}
                className="h-10 w-auto max-w-[130px] object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-11 sm:max-w-[155px] xl:max-w-[145px] 2xl:max-w-[175px]"
              />
            </Link>

            {/* DESKTOP NAVIGATION */}
            <div className="hidden min-w-0 flex-1 items-center xl:flex">

              <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                <div className="flex w-max min-w-full items-center justify-start gap-0.5 2xl:gap-1">

                  {profile?.role === "admin" ? (
                    <Link
                      href="/admin/dashboard"
                      prefetch={false}
                      className={`group inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${
                        pathname.startsWith("/admin/dashboard")
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-indigo-700"
                      }`}
                    >
                      <LuShieldCheck
                        className="h-[17px] w-[17px]"
                        aria-hidden="true"
                      />
                      Admin workspace
                    </Link>
                  ) : (
                    storefrontLinks.map((item) => {
                      const Icon =
                        NAV_ICONS[item.link] ?? LuSparkles;

                      const active = pathname === item.link;

                      return (
                        <Link
                          key={item.link}
                          href={item.link}
                          prefetch={false}
                          aria-current={active ? "page" : undefined}
                          className={`group relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2.5 text-[12px] font-bold transition-all duration-200 2xl:gap-2 2xl:px-3 2xl:text-[13px] ${
                            active
                              ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/70"
                              : "text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
                          }`}
                        >
                          <Icon
                            className={`h-[16px] w-[16px] shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                              active
                                ? "text-indigo-600"
                                : "text-slate-400 group-hover:text-indigo-500"
                            }`}
                            aria-hidden="true"
                          />

                          <span className="capitalize">
                            {item.name}
                          </span>

                          {active && (
                            <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500" />
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT CONTROLS: CART -> ACCOUNT -> MOBILE MENU */}
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">

              {/* CUSTOMER CART */}
              {showCustomerCart && (
                <Link
                  href="/cart"
                  prefetch={false}
                  aria-label="Open shopping cart"
                  title="My cart"
                  aria-current={
                    pathname === "/cart" ? "page" : undefined
                  }
                  onClick={closeMenus}
                  className={`group relative h-11 w-11 shrink-0 place-items-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    MOBILE_CART_IN_TOP_BAR
                      ? "grid"
                      : "hidden xl:grid"
                  } ${
                    pathname === "/cart"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md"
                  }`}
                >
                  <LuShoppingCart
                    className="h-[19px] w-[19px] transition-transform duration-200 group-hover:scale-110"
                    aria-hidden="true"
                  />
                </Link>
              )}

              {/* DESKTOP ACCOUNT */}
              <div className="hidden xl:block">

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
                      prefetch={false}
                    >
                      <LuLogIn
                        className="h-[17px] w-[17px]"
                        aria-hidden="true"
                      />
                      {NAVBAR_TEXT.login}
                    </Link>
                  )
                ) : (
                  <div className="relative">

                    <button
                      type="button"
                      title={profile.email}
                      aria-expanded={accountOpen}
                      aria-haspopup="menu"
                      onClick={() => {
                        setAccountOpen((open) => !open);
                        setMobileOpen(false);
                      }}
                      className={`group flex max-w-[190px] items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-semibold shadow-sm transition-all duration-200 2xl:max-w-[225px] ${
                        accountOpen
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/60"
                      }`}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm">
                        <LuUserRound
                          className="h-[17px] w-[17px]"
                          aria-hidden="true"
                        />
                      </span>

                      <span className="min-w-0 flex-1 truncate text-left text-slate-800">
                        {displayEmail(profile.email)}
                      </span>

                      <LuChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                          accountOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* ACCOUNT DROPDOWN */}
                    {accountOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-15px_rgba(15,23,42,0.25)]"
                      >

                        <div className="mb-2 rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            {NAVBAR_TEXT.signedInAs}
                          </p>
                          <p
                            title={profile.email}
                            className="mt-1 truncate text-xs font-bold text-slate-800"
                          >
                            {profile.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          role="menuitem"
                          disabled={signingOut}
                          onClick={logout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <LuLogOut
                            className="h-[17px] w-[17px]"
                            aria-hidden="true"
                          />

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
              </div>

              {/* MOBILE MENU BUTTON */}
              <button
                type="button"
                aria-label={
                  mobileOpen
                    ? NAVBAR_TEXT.closeMenu
                    : NAVBAR_TEXT.openMenu
                }
                aria-expanded={mobileOpen}
                aria-controls="mobile-navbar-menu"
                onClick={() => {
                  setMobileOpen((open) => !open);
                  setAccountOpen(false);
                }}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-sm transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 xl:hidden ${
                  mobileOpen
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
              >
                {mobileOpen ? (
                  <LuX
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                ) : (
                  <LuMenu
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>

          {/* MOBILE EXPANDED NAVIGATION */}
          {mobileOpen && (
            <div
              id="mobile-navbar-menu"
              className="max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-contain border-t border-slate-100 xl:hidden"
            >
              <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 pb-5 pt-5 sm:px-6">

                {/* 1. MOBILE ACCOUNT SECTION */}
                <div>

                  {profile ? (
                    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 shadow-sm">

                      <div className="flex items-center gap-3">

                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/15">
                          <LuUserRound
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">
                            {NAVBAR_TEXT.signedInAs}
                          </p>

                          <p className="mt-1 break-all text-sm font-bold leading-5 text-slate-800">
                            {profile.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-indigo-100 pt-3">

                        <button
                          type="button"
                          disabled={signingOut}
                          onClick={logout}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-sm font-bold text-red-600 shadow-sm ring-1 ring-slate-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="flex items-center gap-2.5">
                            <LuLogOut
                              className="h-[18px] w-[18px]"
                              aria-hidden="true"
                            />
                            {signingOut
                              ? NAVBAR_TEXT.signingOut
                              : NAVBAR_TEXT.logout}
                          </span>

                          <LuChevronRight
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </button>

                        {logoutError && (
                          <p
                            role="alert"
                            className="mt-3 text-xs text-red-600"
                          >
                            {logoutError}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : authStatus === "loading" ? (
                    <button
                      type="button"
                      disabled
                      className={`${gradientButton} w-full cursor-wait opacity-60`}
                    >
                      {NAVBAR_TEXT.account}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">

                      <p className="text-sm font-extrabold text-slate-900">
                        Welcome to Anoosha Store
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Sign in to manage your account and orders.
                      </p>

                      <Link
                        href={NAVBAR_CONFIG.loginHref}
                        onClick={closeMenus}
                        className={`${gradientButton} mt-3 w-full`}
                        prefetch={false}
                      >
                        <LuLogIn
                          className="h-[18px] w-[18px]"
                          aria-hidden="true"
                        />
                        {NAVBAR_TEXT.login}

                        <LuArrowRight
                          className="ml-auto h-4 w-4"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  )}
                </div>

                {/* 2. MOBILE CART SECTION */}
                {showCustomerCart && !MOBILE_CART_IN_TOP_BAR && (
                  <div>

                    <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Your shopping
                    </p>

                    <Link
                      href="/cart"
                      prefetch={false}
                      onClick={closeMenus}
                      aria-label="Open shopping cart"
                      aria-current={
                        pathname === "/cart" ? "page" : undefined
                      }
                      className={`group flex min-h-[58px] items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 ${
                        pathname === "/cart"
                          ? "border-indigo-200 bg-indigo-50 shadow-sm"
                          : "border-slate-200 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/60"
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-indigo-500 text-white shadow-sm shadow-indigo-500/20">
                        <LuShoppingCart
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold text-slate-900">
                          My Cart
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                          View your shopping cart
                        </span>
                      </span>

                      <LuChevronRight
                        className="h-[18px] w-[18px] shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                )}

                {/* 3. MOBILE NAVIGATION LINKS */}
                <div>

                  <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    {profile?.role === "admin"
                      ? "Admin workspace"
                      : "Explore Anoosha Store"}
                  </p>

                  {profile?.role === "admin" ? (
                    <div className="space-y-1.5">

                      {pathname.startsWith("/admin/dashboard") ? (
                        ADMIN_NAVIGATION.map((item) => {
                          const Icon = ADMIN_NAV_ICONS[item.icon] ?? LuLayoutDashboard;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                requestAdminNavigation(item.id);
                                closeMenus();
                              }}
                              className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-all duration-200 hover:border-indigo-100 hover:bg-indigo-50"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-700">
                                <Icon
                                  className="h-[18px] w-[18px]"
                                  aria-hidden="true"
                                />
                              </span>

                              <span className="min-w-0 flex-1 text-sm font-bold text-slate-700 group-hover:text-indigo-800">
                                {item.name}
                              </span>

                              <LuChevronRight
                                className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500"
                                aria-hidden="true"
                              />
                            </button>
                          );
                        })
                      ) : (
                        <Link
                          href="/admin/dashboard"
                          prefetch={false}
                          onClick={closeMenus}
                          className="group flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-3.5 text-sm font-bold text-indigo-800 transition hover:bg-indigo-100"
                        >
                          <LuLayoutDashboard
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                          <span className="flex-1">
                            Open admin workspace
                          </span>
                          <LuArrowRight
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">

                      {storefrontLinks.map((item) => {
                        const Icon =
                          NAV_ICONS[item.link] ?? LuSparkles;

                        const active = pathname === item.link;

                        return (
                          <Link
                            key={item.link}
                            href={item.link}
                            prefetch={false}
                            onClick={closeMenus}
                            aria-current={
                              active ? "page" : undefined
                            }
                            className={`group flex min-h-[53px] items-center gap-3 rounded-xl border px-3 py-2 transition-all duration-200 ${
                              active
                                ? "border-indigo-100 bg-indigo-50 shadow-sm"
                                : "border-transparent hover:border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-200 ${
                                active
                                  ? "bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                              }`}
                            >
                              <Icon
                                className="h-[18px] w-[18px]"
                                aria-hidden="true"
                              />
                            </span>

                            <span
                              className={`min-w-0 flex-1 text-sm font-bold capitalize ${
                                active
                                  ? "text-indigo-800"
                                  : "text-slate-700 group-hover:text-slate-950"
                              }`}
                            >
                              {item.name}
                            </span>

                            <LuChevronRight
                              className={`h-4 w-4 shrink-0 transition-all duration-200 group-hover:translate-x-1 ${
                                active
                                  ? "text-indigo-500"
                                  : "text-slate-300 group-hover:text-indigo-500"
                              }`}
                              aria-hidden="true"
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* MOBILE MENU FOOTER */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-center text-[11px] font-semibold tracking-wide text-slate-400">
                    Anoosha Store · Shop with confidence
                  </p>
                </div>

              </div>
            </div>
          )}

        </nav>
      </div>
    </header>
  );
}