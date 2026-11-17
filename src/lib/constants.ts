
/* =========================================================
   NAVBAR TYPES AND CONSTANTS
========================================================= */

export type NavbarLink = {
  name: string;
  link: string;
};

export type NavbarConfig = {
  navLinks: NavbarLink[];
  logoUrl: string;
  logoAlt: string;
  logoHref: string;
  loginHref: string;
  homeHref: string;
  logoutApiUrl: string;
  emailMaxLength: number;
  emailPreviewLength: number;
};

/* =========================================================
   NAVBAR CONFIGURATION
========================================================= */

export const NAVBAR_CONFIG: NavbarConfig = {
  // Navigation links
  navLinks: [
    { name: "Home", link: "/" },
    { name: "Orders", link: "/order" },
  ],

  // Logo
  logoUrl: "/brand-logo.svg",
  logoAlt: "Anoosha Store",
  logoHref: "/",

  // Authentication routes
  loginHref: "/login",
  homeHref: "/",
  logoutApiUrl: "/api/google-auth/logout",

  // Email display
  emailMaxLength: 22,
  emailPreviewLength: 19,
};

/* =========================================================
   NAVBAR TEXT
========================================================= */

export const NAVBAR_TEXT = {
  ariaLabel: "Main navigation",

  login: "Login",
  account: "Account",
  logout: "Logout",
  signingOut: "Signing out...",

  signedInAs: "Signed in as",

  openMenu: "Open menu",
  closeMenu: "Close menu",

  logoutError: "Could not sign out.",
  googleLogoutError: "The Google session could not be cleared.",
};


// FOOTER CONSTANTS

export type FooterLink = {
  name: string;
  link: string;
};

export type FooterLinkGroup = {
  title: string;
  links: FooterLink[];
};

export type FooterSocialLink = {
  name: string;
  link: string;
};

export const footer_brand = {
  name: "ANOOSHA STORE",
  description:
    "Discover quality mobile and gaming accessories designed to keep you connected, equipped, and ready for more.",
  logo: "/brand-logo.svg",
  logoAlt: "Anoosha Store",
  logoHref: "/",
  tagline: "Mobile & Gaming Accessories",
};

export const footer_nav_links: FooterLinkGroup[] = [
  {
    title: "Explore",
    links: [
      { name: "Home", link: "/" },
      { name: "Shop", link: "/shop" },
      { name: "Orders", link: "/order" },
    ],
  },
  {
    title: "Customer Support",
    links: [
      { name: "Contact Us", link: "/contact" },
      { name: "Frequently Asked Questions", link: "/faq" },
      { name: "Shipping Information", link: "/shipping-policy" },
      { name: "Returns & Refunds", link: "/return-policy" },
    ],
  },
  {
    title: "About & Legal",
    links: [
      { name: "About Us", link: "/about" },
      { name: "Privacy Policy", link: "/privacy-policy" },
      { name: "Terms & Conditions", link: "/terms-and-conditions" },
    ],
  },
];

export const footer_social_links: FooterSocialLink[] = [
  // Add your official social media URLs here.
  // Example: { name: "Instagram", link: "https://instagram.com/your-store" },
  { name: "Instagram", link: "https://instagram.com/your-store" },
  { name: "Facebook", link: "https://facebook.com/your-store" },
  { name: "YouTube", link: "https://youtube.com/your-store" },
  { name: "TikTok", link: "https://tiktok.com/@your-store" },
];

export const footer_bottom_text = {
  copyright: "All rights reserved.",
  country: "Pakistan",
  closingLine: "Made for everyday connections and gaming experiences.",
};

export const ADMIN_PANEL_MAIN_TEXT = "Anoosha Store · Administration";
export const ICON_CLASS = "h-5 w-5 text-black";