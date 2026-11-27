import { LuHeadphones, LuPackageCheck, LuShieldCheck } from "react-icons/lu";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { IconType } from "react-icons";

/* ==================================================================
   TYPES & INTERFACES
   ================================================================== */

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

export type StaticPageHref = (typeof STOREFRONT_PAGES)[number]["href"];

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

/* ==================================================================
   COMMON CONSTANTS
   ================================================================== */

export const STORE_URL = "https://anooshastore.com";

export const SUPPORT_EMAIL = "anooshastoree@gmail.com";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const SITE_URL = "anoshastore.com";

export const LONG_SESSIONS = 365 * 24 * 60 * 60;

export const SHORT_SESSIONS = 7 * 24 * 60 * 60;

export const ADD_TO_CART_EVENT = "anoosha:storefront:add-to-cart";

export const ORDER_NOW_EVENT = "anoosha:storefront:order-now";

export const WHATSAPP_NUMBER = "923160484847";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hello Anoosha Store! I would like to get more information about your products. Could you please help me?";

export const EASYPAISA_NUMBER = "+923160484847";

export const JAZZCASH_NUMBER = "+923160484847";

export const ICON_CLASS = "h-5 w-5 text-black";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const STOREFRONT_PAGES = [
  { href: "/", name: "Home" },
  { href: "/about", name: "About Us" },
  { href: "/contact", name: "Contact Us" },
  { href: "/faq", name: "FAQs" },
  { href: "/shipping-and-return-policy", name: "Shipping & Returns Information" },
  { href: "/privacy-policy", name: "Privacy Policy" },
  { href: "/terms-and-conditions", name: "Terms & Conditions" },
  { href: "/cart", name: "Cart" },
  { href: "/orders", name: "Orders" },
] as const;

export const STORE_NAME="Anoosha Store"

/* ==================================================================
   SOCIAL LINKS & ICON CONFIGURATION
   ================================================================== */

export const footer_social_links: FooterSocialLink[] = [
  // Add your official social media URLs here.
  // Example: { name: "Instagram", link: "https://instagram.com/your-store" },
  { name: "Instagram", link: "https://www.instagram.com/anooshastore00?fqnt=c241d3R6bGs1Mmky" },
  { name: "Facebook", link: "https://www.facebook.com/share/1CmWTJpnyy/" },
  { name: "YouTube", link: "https://www.youtube.com/@anooshastore" },
  { name: "TikTok", link: "https://www.tiktok.com/@anooshastore" },
];

export const SOCIAL_ICONS: Record<string, { Icon: IconType; style: string }> = {
  instagram: {
    Icon: SiInstagram,
    style:
      "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white",
  },
  facebook: { Icon: SiFacebook, style: "bg-[#1877F2] text-white" },
  youtube: { Icon: SiYoutube, style: "bg-[#FF0033] text-white" },
  tiktok: { Icon: SiTiktok, style: "bg-slate-950 text-white" },
};

/* ==================================================================
   NAVBAR
   ================================================================== */

export const NAVBAR_CONFIG: NavbarConfig = {
  // Navigation links
  navLinks: [
    { name: "Home", link: "/" },
    { name: "Shop", link: "/shop" },
    { name: "Orders", link: "/orders" },
    { name: "Cart", link: "/cart" },
    { name: "About Us", link: "/about" },
    { name: "Contact Us", link: "/contact" },
    { name: "FAQs", link: "/faq" },
    { name: "Privacy Policy", link: "/privacy-policy" },
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
  emailMaxLength: 30,
  emailPreviewLength: 19,
};

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

/* ==================================================================
   FOOTER
   ================================================================== */


export const footer_brand = {
  name: "ANOOSHA STORE",
  description:
    "Discover a wide variety of products in one place. Enjoy convenient online shopping, great finds, and a simple, customer-focused shopping experience.",
  logo: "/brand-logo.svg",
  logoAlt: "Anoosha Store",
  logoHref: "/",
  tagline: "Discover More. Shop Better.",
};

export const footer_bottom_text = {
  copyright: "All rights reserved.",
  country: "Pakistan",
  closingLine: "Designed to make everyday life simpler, smarter, and more convenient.",
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
      { name: "Shipping & Returns", link: "/shipping-and-return-policy" },
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

/* ==================================================================
   ADMIN WORKSPACE
   ================================================================== */

export const ADMIN_PANEL_MAIN_TEXT = "Anoosha Store · Administration";

/* ==================================================================
   SMART SLIDER — CUSTOMER-FACING
   ================================================================== */

export const DEFAULT_SLIDER_HEADING = "Anoosha Store · Made to elevate";

export const DEFAULT_SLIDER_MAIN_TEXT_1 = "The details make";

export const DEFAULT_SLIDER_MAIN_TEXT_2 = "the difference.";

export const DEFAULT_SLIDER_DESCRIPTION =
  "Discover mobile essentials and gaming accessories, thoughtfully brought together for life in motion.";

export const DEFAULT_SLIDER_BUTTON_TEXT = "Explore the collection";

/* ==================================================================
   SMART SLIDER — ADMIN MANAGEMENT
   ================================================================== */

export const SLIDER_MAIN_TEXT = "Homepage slider";

export const SLIDER_DESCRIPTION_ADMIN =
  "Update up to five slide images, copy and autoplay timing in the protected slider workspace.";

export const MAX_SLIDES = 5;

export const MAX_FILE_SIZE = 8 * 1024 * 1024;

export const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const NO_BANNERS_TEXT =
  "No banners yet. The storefront will display its fallback hero until a slide is published.";

export const BUTTON_TEXT_TO_PUBLISH_SLIDE = "Publish slide";

export const NEW_SLIDE_UPLOAD_HEADING = "Upload a new slide";

export const BANNER_INTERVAL_DESCRIPTION =
  "Choose 2.5–30 seconds between slides.Playback pauses for user interaction and reduced-motion preferences.";

export const BANNER_INTERVAL_HEADING = "Autoplay interval";

export const LOADING_TEXT_FOR_BANNERS = "Loading slides...";

export const BANNER_COMPONENT_MAIN_HEADING = "Home slider manager";

export const BANNER_COMPONENT_MAIN_TEXT =
  "Create, update, or remove up to five homepage banners.Replaced images receive a new URL so visitors see the latest version.";

/* ==================================================================
   SHARED STOREFRONT UI — PRODUCT RAILS & NOTIFICATIONS
   ================================================================== */

export const SHOP_EXPLORER_BUTTON_TEXT = "Visit our shop";

export const NO_ITEM_FOR_LATEST_OR_FEATURED_SECTION =
  "New products are being prepared for this collection.";

export const NO_ITEM_FOR_LATEST_OR_FEATURED_BUTTON = "Explore the shop";

export const NOTIFICATION_BUTTON_TEXT = "OK";

/* ==================================================================
   PRODUCT DETAILS PAGE
   ================================================================== */

export const PRODUCT_ORDER_BUTTON_TEXT = "Order Now";

export const PRODUCT_ADD_TO_CART_BUTTON_TEXT = "Add To Cart";

export const PRODUCT_ATTRIBUTE_SELECT_DROPDOWN_TEXT = "Select Your Choice";

export const HEADING_FOR_PRODUCT_DETAILS = "Product details";

export const PRODUCT_DETAILS_DISCLAIMER =
  "We only support cash on delivery for now · Prices in PKR";

/* ==================================================================
   HOME PAGE
   ================================================================== */

export const FEATURED_PRODUCTS_SECTION_TITLE = "Featured products";

export const FEATURED_PRODUCTS_SECTION_EYEBROW = "";

export const FEATURED_PRODUCTS_SECTION_SUBTITLE =
  "Thoughtfully selected favorites to make every setup feel a little more complete.";

export const LATEST_PRODUCTS_TITLE = "Latest arrivals";

export const LATEST_PRODUCTS_EYEBROW = "";

export const LATEST_PRODUCTS_SUBTITLE =
  "Fresh finds to give your tech, desk and gaming world a new perspective.";

export const HOME_PAGE_LEFT_TITLE = "Discover what fits you";

export const HOME_PAGE_LEFT_SUBTITLE = "Everyday essentials.";

export const HOME_PAGE_LEFT_HEADING = "Elevated experiences.";

export const HOME_PAGE_LEFT_DESCTIPTION =
  "From keeping devices ready to completing your gaming setup, explore accessories chosen for the moments you use them most.";

export const HOME_PAGE_NO_CATEGROIES_TEXT =
  "Collections will appear here shortly.";

export const HOME_PAGE_LEFT_BUTTON_TEXT = "Discover the shop";

export const HOME_PAGE_STATIC_SECTION_TITLE = "The Anoosha promise";

export const HOME_PAGE_STATIC_SECTION_SUBTITLE = "Shopping should feel simple.";

export const HOME_PAGE_STATIC_SECTION_DESCRIPTION =
  "Browse confidently, find helpful information and contact us when you need a hand. We confirm orders using the contact details you provide.";

export const HOME_PAGE_STATIC_SECTION_ARRAY1 = [
  {
    icon: LuShieldCheck,
    title: "Secure shopping",
    description: "Clear details and reliable support",
  },
  {
    icon: LuPackageCheck,
    title: "Cash on delivery",
    description: "Order now, pay on delivery",
  },
  {
    icon: LuHeadphones,
    title: "Here to help",
    description: "Questions? Our team is a message away",
  },
];

export const HOME_PAGE_TINYLINKS = [
  { href: "/about", label: "Our story" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Talk to us" },
  { href: "/shipping-and-return-policy", label: "Shipping and returns" },
];

/* ==================================================================
   SHOP PAGE
   ================================================================== */

export const SHOP_PAGE_TITLE = "Everything in one place";

export const SHOP_PAGE_SUBTITLE1 = "Find your kind of  ";

export const SHOP_PAGE_SUBTITLE2 = "everyday extraordinary.";

export const SHOP_PAGE_DESCRIPTION =
  "Browse by collection and discover accessories that fit the way you work, play and stay connected.";


/* ==================================================================
   TERMS & CONDITIONS PAGE
   ================================================================== */

export const Terms_AND_Condition_EYEBROW =
  "Terms of service";

export const Terms_AND_Condition_TITLE =
  "Simple terms. Transparent shopping.";

export const Terms_AND_Condition_DESCRIPTION =
  "Please review these terms before shopping at Anoosha Store. They explain our ordering process, payments, delivery, cancellations, returns and customer responsibilities.";

export const Terms_AND_Condition_POLICY_UPDATED =
  "27 November 2026";

/* ==================================================================
   TERMS & CONDITIONS SECTIONS
   ================================================================== */

export const Terms_AND_Condition_POLIICY_SECTION = [
  {
    heading: "1. General terms",
    description:
      "By using Anoosha Store or placing an order, you agree to these Terms & Conditions. You must provide accurate information and use the website lawfully. We may update these terms when necessary. Applicable consumer rights under Pakistani law remain unaffected.",
  },
  {
    heading: "2. Products & pricing",
    description:
      "We aim to provide accurate product descriptions, images, prices and availability. Minor differences in appearance or packaging may occur. Prices and availability may change, but the order total is displayed before checkout confirmation. If an item becomes unavailable or its price changes before placement, you may need to review your order again.",
  },
  {
    heading: "3. Orders & confirmation",
    description:
      "Customers must provide a valid name, active phone number and complete delivery address. An order is recorded after successful checkout but remains subject to processing and availability. We may contact you to verify order or delivery information. You can review your order details and status through your account.",
  },
  {
    heading: "4. Payment methods",
    description:
      "We accept Cash on Delivery (COD), Easypaisa and JazzCash. COD payments are collected upon delivery. Easypaisa and JazzCash require manual transfers to the receiving number shown at checkout. Keep your transaction reference and contact support for verification. Selecting a payment method or placing an order does not automatically confirm payment. Online card payments and automated wallet verification are not currently available.",
  },
  {
    heading: "5. Shipping & delivery",
    description:
      "Delivery is available within Pakistan, subject to courier coverage and product availability. Any applicable shipping charges are shown at checkout. Delivery times are estimates and may vary due to location, courier operations or unforeseen delays. Customers are responsible for providing accurate delivery information and remaining reachable.",
  },
  {
    heading: "6. Order cancellation",
    description: `Eligible pending or processing orders may be cancelled through your account within 15 minutes of placement. After this period, contact ${SUPPORT_EMAIL} with your order number. Later cancellation requests are subject to the order's current status and may not be possible after dispatch.`,
  },
  {
    heading: "7. Returns & refunds",
    description:
      "If you receive a damaged, defective or incorrect item, contact support promptly with your order number and supporting photographs. Return and refund requests are reviewed under our Shipping & Returns Policy and applicable consumer laws. Do not send items back without receiving return instructions. Approved refunds are arranged through a method confirmed by our team.",
  },
  {
    heading: "8. Accounts, privacy & support",
    description: `Keep your account credentials secure and do not misuse the website. We handle customer information according to our Privacy Policy. For questions about products, payments, orders or these terms, contact ${SUPPORT_EMAIL} or use our Contact page. Include your order number for order-related enquiries.`,
  },
];

/* ==================================================================
   TERMS AT A GLANCE
   ================================================================== */

export const Terms_AND_Condition_AT_A_GLANCE = [
  "Cash on Delivery, Easypaisa and JazzCash accepted",
  "Wallet payments require manual verification",
  "Accurate contact and delivery details required",
  "Eligible orders can be cancelled within 15 minutes",
  "Returns and refunds are subject to review",
];


/* ==================================================================
   SHIPPING & RETURNS PAGE
   ================================================================== */

export const SHIPPING_AND_RETURN_SEO_TITLE =
  "Shipping & Returns";

export const SHIPPING_AND_RETURN_SEO_DESCRIPTION =
  "Learn about Anoosha Store delivery, shipping charges, payment methods, order cancellations, returns and refunds in Pakistan.";

export const SHIPPING_AND_RETURN_SEO_PATH: StaticPageHref =
  "/shipping-and-return-policy";

export const SHIPPING_AND_RETURN_SHELL_PATH: StaticPageHref =
  "/shipping-and-return-policy";

export const SHIPPING_AND_RETURN_SHELL_EYEBROW =
  "Shipping & returns";

export const SHIPPING_AND_RETURN_SHELL_TITLE =
  "Delivery made simple. Support when you need it.";

export const SHIPPING_AND_RETURN_SHELL_DESCRIPTION =
  "Everything you need to know about shipping, payment, cancellations, returns and refunds at Anoosha Store.";

export const SHIPPING_AND_RETURN_UPDATED_LABEL =
  "Last updated:";

export const SHIPPING_AND_RETURN_POLICY_UPDATED =
  "27 November 2026";

/* ==================================================================
   HELP AND INFORMATION
   ================================================================== */

export const SHIPPING_AND_RETURN_CHECKLIST_HEADING =
  "Before placing your order";

export const SHIPPING_AND_RETURN_HELP_CARD_TITLE =
  "Need help with your order?";

export const SHIPPING_AND_RETURN_HELP_CARD_BODY =
  "Contact our support team with your order number and a brief explanation. Include photographs if your request concerns a damaged or incorrect item.";

export const SHIPPING_AND_RETURN_HELP_CARD_CTA =
  "Contact support";

export const SHIPPING_AND_RETURN_ESTIMATE_NOTE_TITLE =
  "Delivery times may vary";

export const SHIPPING_AND_RETURN_ESTIMATE_NOTE_BODY =
  "Delivery estimates depend on location, processing and courier availability. Contact support for order-related enquiries.";

export const SHIPPING_AND_RETURN_ADDRESS_NOTE_TITLE =
  "Check your delivery details";

export const SHIPPING_AND_RETURN_ADDRESS_NOTE_BODY =
  "Provide your complete address and an active phone number to help prevent delivery delays.";

/* ==================================================================
   SEO
   ================================================================== */

export const SHIPPING_AND_RETURN_SEO_KEYWORDS: string[] = [
  "Anoosha Store shipping",
  "shipping and returns Pakistan",
  "online shopping delivery",
  "cash on delivery",
  "Easypaisa JazzCash",
  "order cancellation",
  "returns and refunds",
];

export const SHIPPING_AND_RETURN_RELATED_ROUTES: StaticPageHref[] = [
  "/contact",
  "/faq",
  "/terms-and-conditions",
];

/* ==================================================================
   SHIPPING PROCESS
   ================================================================== */

export const SHIPPING_AND_RETURN_TILES = [
  {
    key: "placed",
    title: "Place your order",
    body: "Select your products, choose a payment method and enter your delivery details.",
  },
  {
    key: "confirmed",
    title: "Order processing",
    body: "We review your order and may contact you to confirm payment or delivery information.",
  },
  {
    key: "care",
    title: "Delivery & support",
    body: "Receive your order, inspect your items and contact us if you need assistance.",
  },
] as const;

/* ==================================================================
   SHIPPING & RETURN POLICY
   ================================================================== */

export const SHIPPING_AND_RETURN_SECTIONS = [
  {
    key: "availability",
    title: "1. Shipping & delivery",
    paragraphs: [
      "We arrange deliveries within Pakistan, subject to courier coverage and product availability. Shipping charges, if applicable, are displayed during checkout.",
      "Delivery times vary by location and courier operations. Estimated dates are not guaranteed.",
    ],
  },
  {
    key: "fees-payment",
    title: "2. Payment methods",
    paragraphs: [
      "We accept Cash on Delivery (COD), Easypaisa and JazzCash. For COD, pay when your parcel arrives. For Easypaisa or JazzCash, use the receiving number displayed at checkout and keep your transaction reference for manual payment verification.",
    ],
  },
  {
    key: "address-accuracy",
    title: "3. Order details & tracking",
    paragraphs: [
      "Please provide an accurate delivery address and reachable phone number. You can review your order status in your account's Orders section. Contact support immediately if your details need correction; changes after dispatch may not be possible.",
    ],
  },
  {
    key: "cancellations-rights",
    title: "4. Order cancellation",
    paragraphs: [
      "Eligible orders can be cancelled through your account within 15 minutes of placement. After this period, contact support with your order number. Cancellation requests depend on the order's current status and may not be possible after dispatch.",
    ],
  },
  {
    key: "return-review",
    title: "5. Returns & refunds",
    paragraphs: [
      "If you receive a damaged, defective or incorrect item, contact us promptly with your order number, details and clear photographs. Please wait for return instructions before sending any item back.",
      "Returns and refunds are reviewed individually, subject to applicable consumer rights. If approved, our team will confirm the return instructions, refund method and expected processing time.",
    ],
  },
] as const;

/* ==================================================================
   CUSTOMER CHECKLIST
   ================================================================== */

export const SHIPPING_AND_RETURN_CHECKLIST = [
  "Confirm your products, quantities and order total",
  "Provide your complete address and active phone number",
  "Choose COD, Easypaisa or JazzCash at checkout",
  "Inspect your items after delivery and report any issues promptly",
] as const;


/* ==================================================================
   PRIVACY POLICY PAGE
   ================================================================== */

export const PRIVACY_POLICY_SEO_TITLE = "Privacy Policy";

export const PRIVACY_POLICY_SEO_DESCRIPTION =
  "Learn how Anoosha Store protects your personal information, account details, shopping cart, order history and privacy while shopping online.";

export const PRIVACY_POLICY_SEO_PATH: StaticPageHref =
  "/privacy-policy";

export const PRIVACY_POLICY_SHELL_PATH: StaticPageHref =
  "/privacy-policy";

export const PRIVACY_POLICY_SHELL_EYEBROW = "Your privacy matters";

export const PRIVACY_POLICY_SHELL_TITLE =
  "Your information. Your privacy. Our responsibility.";

export const PRIVACY_POLICY_SHELL_DESCRIPTION =
  "At Anoosha Store, we respect your privacy. We collect only the information needed to operate our store, process orders and provide customer support.";

export const PRIVACY_POLICY_UPDATED_LABEL = "Last updated:";

export const PRIVACY_POLICY_UPDATED = "November 27, 2026";

export const PRIVACY_POLICY_SOFT_NOTE_TITLE =
  "Your privacy is our priority";

export const PRIVACY_POLICY_SOFT_NOTE_BODY =
  "We never sell customer information or provide personal data, login details, shopping cart information or order history for advertising or AI model training. Never share your password or verification codes with anyone.";

export const PRIVACY_POLICY_SEO_KEYWORDS: string[] = [
  "Anoosha Store privacy policy",
  "customer data protection",
  "online shopping privacy",
  "personal information security",
  "account privacy",
  "order data privacy",
];

export const PRIVACY_POLICY_RELATED_ROUTES: StaticPageHref[] = [
  "/terms-and-conditions",
  "/contact",
  "/faq",
  "/shipping-and-return-policy",
];

/* ==================================================================
   PRIVACY COMMITMENTS
   ================================================================== */

export const PRIVACY_POLICY_PILLARS = [
  {
    key: "purpose",
    title: "Your data stays private",
    body: "We do not sell customer information or share it for advertising, marketing databases or AI model training.",
  },
  {
    key: "security",
    title: "Secure shopping",
    body: "We use authentication and security measures to help protect your account, cart and order information.",
  },
  {
    key: "questions",
    title: "You're in control",
    body: "Contact us to ask questions or request access, corrections or applicable deletion of your personal information.",
  },
] as const;

/* ==================================================================
   PRIVACY POLICY SECTIONS
   ================================================================== */


export const PRIVACY_POLICY_SECTIONS = [
  {
    key: "collection",
    title: "1. Information we collect",
    paragraphs: [
      "We collect information necessary to operate Anoosha Store, including your name, email address, phone number, delivery address, account details, shopping cart, order history and support messages.",
      "Basic technical information, including IP addresses, browser details and essential session cookies, may also be processed for website functionality and security.",
    ],
    bullets: [] as string[],
  },
  {
    key: "usage",
    title: "2. How we use your information",
    paragraphs: [
      "Your information is used to maintain accounts, process orders, arrange deliveries, provide customer support and protect our services. We do not use your personal information for unrelated purposes without an appropriate basis.",
    ],
    bullets: [] as string[],
  },
  {
    key: "protection",
    title: "3. Privacy and AI protection",
    paragraphs: [
      "Anoosha Store does not sell, rent or share customer information with unrelated organizations for advertising, data trading or AI model training.",
      "We do not provide personal details, login information, shopping cart contents, order histories or private customer communications to third parties for training artificial intelligence models.",
    ],
    bullets: [] as string[],
  },
  {
    key: "services",
    title: "4. Essential services and security",
    paragraphs: [
      "Limited information may be processed by trusted providers supporting hosting, authentication, communication and delivery. Only information reasonably necessary for these services or required by law is shared.",
      "We use reasonable security measures to protect customer information. Essential cookies support account access and security.",
    ],
    bullets: [] as string[],
  },
  {
    key: "rights",
    title: "5. Your information and privacy rights",
    paragraphs: [
      "You may request access to, correction of or applicable deletion of your personal information. Identity verification may be required. Certain transaction records may be retained for legal, security or dispute-resolution purposes.",
    ],
    bullets: [] as string[],
  },
  {
    key: "children",
    title: "6. Children's privacy",
    paragraphs: [
      "Anoosha Store is intended for customers who can legally place orders. If a child has provided personal information without appropriate authorization, a parent or guardian may contact us for assistance.",
    ],
    bullets: [] as string[],
  },
  {
    key: "changes",
    title: "7. Policy updates and contact",
    paragraphs: [
      "We may update this Privacy Policy to reflect changes in our services or applicable requirements. The latest version and revision date will be published on this page.",
    ],
    bullets: [] as string[],
  },
] as const;



/* ==================================================================
   FREQUENTLY ASKED QUESTIONS PAGE
   ================================================================== */

export const FAQ_SEO_TITLE = "Frequently Asked Questions";

export const FAQ_SEO_DESCRIPTION =
  "Find answers about shopping at Anoosha Store, payment methods, order tracking, cancellations, shipping, delivery, returns, refunds and customer support in Pakistan.";

export const FAQ_SEO_PATH: StaticPageHref = "/faq";

export const FAQ_SHELL_PATH: StaticPageHref = "/faq";

export const FAQ_SHELL_EYEBROW = "Help center";

export const FAQ_SHELL_TITLE =
  "Frequently asked questions";

export const FAQ_SHELL_DESCRIPTION =
  "Find clear answers to common questions about placing orders, making payments, delivery, returns and getting support. We're here to make your shopping experience easier.";

export const FAQ_HELP_CARD_TITLE =
  "Still have a question?";

export const FAQ_HELP_CARD_BODY =
  "Our support team is available to help with product enquiries, orders, payments and delivery-related questions. Get in touch and let us know how we can assist.";

export const FAQ_HELP_CARD_CTA = "Contact support";

export const FAQ_SOFT_NOTE_TITLE =
  "Need help with an existing order?";

export const FAQ_SOFT_NOTE_BODY =
  "Please include your order number when contacting support about an existing order. This helps us locate your order and respond more efficiently.";

export const FAQ_SEO_KEYWORDS: string[] = [
  "Anoosha Store FAQ",
  "online shopping help Pakistan",
  "Anoosha Store payment methods",
  "cash on delivery",
  "Easypaisa and JazzCash",
  "order tracking",
  "order cancellation",
  "shipping and delivery",
  "returns and refunds",
];

export const FAQ_RELATED_ROUTES: StaticPageHref[] = [
  "/contact",
  "/shipping-and-return-policy",
  "/terms-and-conditions",
];

/* ==================================================================
   FAQ QUESTIONS AND ANSWERS
   ================================================================== */

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Orders & payments",
    items: [
      {
        q: "How do I place an order at Anoosha Store?",
        a: "Browse our store, select a product and its available options, and choose Order Now or add it to your cart. At checkout, enter your delivery details, select a payment method and review your order summary. Once your order is submitted successfully, you can view its details and status in the Orders section of your account.",
      },
      {
        q: "Which payment methods are available?",
        a: "We currently support Cash on Delivery (COD), Easypaisa and JazzCash. With Cash on Delivery, you pay when your order arrives. Easypaisa and JazzCash are manual transfer options. Select your preferred method at checkout to view the corresponding receiving number. We do not currently process wallet payments automatically through the website.",
      },
      {
        q: "How do I pay using Easypaisa or JazzCash?",
        a: "Choose Easypaisa or JazzCash during checkout and carefully check the receiving number displayed for your selected method. Complete the transfer through the appropriate wallet service and keep your transaction reference or receipt. Contact our support team with your order number and transaction details so the payment can be reviewed. Selecting a wallet method does not automatically confirm that payment has been received.",
      },
      {
        q: "How will I know if my order was placed successfully?",
        a: "After a successful checkout, your order details will be available in your account, including the order number, selected payment method, total amount and current order status. You can review these details through the Orders page. We may also contact you using the information provided at checkout if confirmation or clarification is needed.",
      },
      {
        q: "Can I cancel or change my order after placing it?",
        a: "Eligible pending or processing orders can be cancelled from your account within 15 minutes of placement. After this period, contact our support team as soon as possible with your order number and request. Changes or cancellations are subject to the order's current processing and dispatch status and cannot always be guaranteed.",
      },
      {
        q: "Where can I check my order status and receipt?",
        a: "Sign in to your Anoosha Store account and open the Orders page. Select an order to review its current status, purchased items, delivery information, payment method and total amount. You can also view the available receipt or invoice details. If anything appears incorrect, contact support and provide your order number.",
      },
    ],
  },

  {
    title: "Shipping & delivery",
    items: [
      {
        q: "Where does Anoosha Store deliver?",
        a: "We accept delivery information for destinations in Pakistan, subject to courier availability and service coverage. Delivery may not be possible in every location. If you are unsure whether your address is serviceable, contact our support team before placing an order.",
      },
      {
        q: "How much does delivery cost?",
        a: "Your checkout summary displays the currently applicable delivery charge and order total before you submit your order. If shipping is shown as Rs. 0, no delivery charge has been added to that checkout total. Any delivery arrangement requiring an additional charge should be clarified with you before proceeding.",
      },
      {
        q: "How long does it take to receive an order?",
        a: "Delivery times depend on your location, order processing and the courier's service availability. Any estimated timeframe communicated by our team is an estimate rather than a guaranteed delivery date. Delays may occur due to courier operations, weather, holidays or incomplete delivery information.",
      },
      {
        q: "How can I track the progress of my order?",
        a: "Open the Orders section of your account to check the latest available order status. Orders may appear as Pending, Processing, Delivered or Cancelled. These statuses describe the order's progress; they do not necessarily provide live courier tracking. For dispatch or delivery enquiries, contact support with your order number.",
      },
      {
        q: "What should I do if I entered an incorrect address or phone number?",
        a: "Contact our support team immediately with your order number and the correct information. Please provide a complete delivery address and an active mobile number that can receive calls or SMS. We will review whether the details can be updated, but changes may not be possible once the order has been dispatched.",
      },
      {
        q: "What happens if the courier cannot deliver my order?",
        a: "A delivery attempt may be unsuccessful if the recipient cannot be reached, the address is incomplete or the location is outside available courier coverage. Contact support with your order number if you believe delivery has failed. Any further delivery attempt or alternative arrangement will depend on the courier's availability and the order's circumstances.",
      },
    ],
  },

  {
    title: "Returns, refunds & customer support",
    items: [
      {
        q: "What should I do if I receive a damaged, defective or incorrect item?",
        a: "Contact Anoosha Store as soon as possible after receiving the parcel. Provide your order number, a clear explanation of the issue and photographs showing the product, packaging and any visible damage or discrepancy. Our team will review the information and advise you about the available next steps.",
      },
      {
        q: "Can I return a product after delivery?",
        a: "You can contact us to request a return review. Eligibility depends on the reason for the request, the condition of the product and our published Shipping and Return Policy, subject to applicable consumer rights. Please contact support before sending anything back so that any approved return instructions can be provided.",
      },
      {
        q: "How do I request a refund?",
        a: "Submit your request through our Contact page or email anooshastoree@gmail.com with your order number and the reason for the refund request. Include relevant photographs or supporting information where appropriate. We will review the request and explain the available resolution, including any applicable return or refund requirements.",
      },
      {
        q: "How will an approved refund be issued?",
        a: "If a refund is approved, our support team will confirm the appropriate refund method and any required details with you. The arrangement may depend on how the original order was paid and the circumstances of the refund. Processing time can vary, and a specific completion date will be communicated only when it can be reasonably confirmed.",
      },
      {
        q: "Can I exchange an item or request a different product?",
        a: "If you would like to exchange an item, contact support with your order number and explain the requested change. Our team will review whether an exchange or another resolution is possible based on product availability, order circumstances and the applicable return policy. Exchanges are not automatically guaranteed.",
      },
      {
        q: "How can I contact Anoosha Store for assistance?",
        a: "You can reach our support team through the Contact page or by emailing anooshastoree@gmail.com. For general product enquiries, describe what you need help with. For existing orders, include your order number and a brief explanation of the issue. Please never share passwords, OTP codes or sensitive account credentials when requesting support.",
      },
    ],
  },
];

/* ==================================================================
   CONTACT PAGE
   ================================================================== */

export const CONTACT_SEO_TITLE = "Contact Us";

export const CONTACT_SEO_DESCRIPTION =
  "Contact Anoosha Store for order help, cancellations, shipping questions and returns. Send a message to our team or email anooshastoree@gmail.com.";

export const CONTACT_SEO_PATH: StaticPageHref = "/contact";

export const CONTACT_SHELL_PATH: StaticPageHref = "/contact";

export const CONTACT_SHELL_EYEBROW = "We're here to help";

export const CONTACT_SHELL_TITLE = "A real conversation starts here.";

export const CONTACT_SHELL_DESCRIPTION =
  "A question about an order, a product or a delivery? Send our team a message. Include your order number when reaching out about an existing purchase.";

export const CONTACT_SCHEMA_NAME = "Contact Anoosha Store";

export const CONTACT_SCHEMA_ORG_NAME = "Anoosha Store";

export const CONTACT_FORM_EYEBROW = "Get in touch";

export const CONTACT_FORM_TITLE = "Send us a message";

export const CONTACT_FORM_SUBTITLE =
  "Fill out the form and we’ll route your message to our support inbox.";

export const CONTACT_EMAIL_CARD_TITLE = "Email us directly";

export const CONTACT_EMAIL_CARD_BODY =
  "For cancellations, shipping questions or order-related help, email us with your order number and relevant details.";

export const CONTACT_CANCEL_NOTE_TITLE = "Need to cancel an order?";

export const CONTACT_CANCEL_NOTE_BODY =
  "Orders may be cancelled within 15 minutes of placement. After that, email us promptly with your order number. We’ll review the status and confirm the outcome.";

export const CONTACT_CANCEL_NOTE_LINK_LABEL = "Read the terms";

export const CONTACT_CANCEL_NOTE_LINK_HREF: StaticPageHref =
  "/terms-and-conditions";

export const CONTACT_REACH_NOTE_TITLE = "Help us reach you";

export const CONTACT_REACH_NOTE_BODY =
  "Please provide a correct email, phone number and delivery address at checkout. We may contact you to confirm your order or ask follow-up questions.";

export const CONTACT_SOCIAL_EYEBROW = "Social channels";

export const CONTACT_SOCIAL_TITLE = "Find us across platforms";

export const CONTACT_SOCIAL_BODY =
  "Connect with us on our official accounts. Links appear once the real account URLs are configured.";

export const INPUT_CLASS =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60";

export const LABEL_CLASS = "block text-sm font-semibold text-slate-700";

export const CONTACT_SEO_KEYWORDS: string[] = [
  "Anoosha Store contact",
  "customer support",
  "order help",
];

export const CONTACT_RELATED_ROUTES: StaticPageHref[] = [
  "/faq",
  "/shipping-and-return-policy",
  "/privacy-policy",
];

export const SUBJECT_OPTIONS = [
  { value: "general", label: "General enquiry" },
  { value: "order", label: "Order assistance" },
  { value: "cancel", label: "Cancel an order" },
  { value: "shipping", label: "Shipping & delivery" },
  { value: "return", label: "Returns & refunds" },
];


/* ==================================================================
   ABOUT US PAGE — ANOOSHA STORE
   General-purpose online shopping
   ================================================================== */

export const ABOUT_SEO_TITLE = "About Us";

export const ABOUT_SEO_DESCRIPTION =
  "Learn about Anoosha Store, an online shopping destination in Pakistan offering a diverse selection of products, convenient ordering, flexible payment options, and helpful customer support.";

export const ABOUT_SEO_PATH: StaticPageHref = "/about";

export const ABOUT_SHELL_PATH: StaticPageHref = "/about";

export const ABOUT_SHELL_EYEBROW = "Get to know us";

export const ABOUT_SHELL_TITLE =
  "Everyday discoveries. A better way to shop.";

export const ABOUT_SHELL_DESCRIPTION =
  "Welcome to Anoosha Store, your online destination for discovering a variety of products in one place. We believe shopping should be simple, convenient, and enjoyable, with clear information and support when you need it.";

export const ABOUT_SCHEMA_CONTACT_TYPE = "customer support";

/* ==================================================================
   OUR STORY
   ================================================================== */

export const ABOUT_STORY_SECTION_EYEBROW = "Our story";

export const ABOUT_STORY_SECTION_TITLE =
  "A store built around your everyday needs";

export const ABOUT_STORY_PARAGRAPH_ONE_PREFIX =
  "Online shopping should feel simple, whether you know exactly what you want or are just exploring. That belief is at the heart of";

export const ABOUT_STORY_PARAGRAPH_ONE_SUFFIX =
  "— a place where different products come together, giving you the freedom to explore, discover, and choose what works for you.";

export const ABOUT_STORY_PARAGRAPH_TWO =
  "Our goal is to create a shopping experience built on convenience, clarity, and customer care. We focus on making product information easy to understand, the ordering process straightforward, and support accessible whenever questions arise. As our store grows, we aim to continue bringing fresh choices and a more enjoyable shopping experience to our customers.";

export const ABOUT_STORY_PARAGRAPH_THREE_PREFIX =
  "At checkout, you can choose";

export const ABOUT_STORY_PARAGRAPH_THREE_HIGHLIGHT =
  "cash on delivery, Easypaisa, or JazzCash";

export const ABOUT_STORY_PARAGRAPH_THREE_MIDDLE =
  ". Easypaisa and JazzCash transfers are handled manually and require payment confirmation. For more information about ordering, payments, and delivery, explore our";

export const ABOUT_STORY_FAQ_LINK_LABEL =
  "frequently asked questions";

export const ABOUT_STORY_FAQ_LINK_HREF: StaticPageHref = "/faq";

export const ABOUT_STORY_TERMS_CONNECTOR = "and";

export const ABOUT_STORY_TERMS_LINK_LABEL =
  "terms and conditions";

export const ABOUT_STORY_TERMS_LINK_HREF: StaticPageHref =
  "/terms-and-conditions";

/* ==================================================================
   CUSTOMER EXPERIENCE CARD
   ================================================================== */

export const ABOUT_CLARITY_CARD_TITLE =
  "Shopping made simple. Support that matters.";

export const ABOUT_CLARITY_CARD_BODY =
  "We want every customer to feel informed and comfortable when shopping with us. From choosing a product to placing an order and understanding delivery expectations, clear communication matters. Accurate contact and delivery details also help us process orders smoothly and reach you if anything needs clarification.";

export const ABOUT_CLARITY_CARD_CTA_LABEL = "Get in touch";

export const ABOUT_CLARITY_CARD_CTA_HREF: StaticPageHref = "/contact";

/* ==================================================================
   SHIPPING AND RETURNS
   ================================================================== */

export const ABOUT_SOFT_NOTE_TITLE =
  "What happens after you place an order?";

export const ABOUT_SOFT_NOTE_PREFIX =
  "Find information about delivery, order confirmation, and return requests in our";

export const ABOUT_SOFT_NOTE_LINK_LABEL =
  "shipping and returns guidance";

export const ABOUT_SOFT_NOTE_LINK_HREF: StaticPageHref =
  "/shipping-and-return-policy";

/* ==================================================================
   SEO
   ================================================================== */

export const ABOUT_SEO_KEYWORDS: string[] = [
  "Anoosha Store",
  "about Anoosha Store",
  "Anoosha Store Pakistan",
  "online shopping in Pakistan",
  "general online shopping store",
  "online shopping experience",
  "convenient online shopping",
  "customer support",
];

export const ABOUT_RELATED_ROUTES: StaticPageHref[] = [
  "/contact",
  "/faq",
  "/shipping-and-return-policy",
  "/terms-and-conditions",
];

export const ABOUT_SCHEMA_AVAILABLE_LANGUAGES: string[] = [
  "English",
];

/* ==================================================================
   ABOUT PAGE INFORMATION TILES
   ================================================================== */

export const ABOUT_TILES = [
  {
    key: "design",
    title: "Something new to discover",
    body: "Explore a changing selection of products, discover new possibilities, and find choices that fit your preferences and everyday needs.",
  },
  {
    key: "shopping",
    title: "Simple and convenient shopping",
    body: "Easy-to-follow ordering, flexible payment options, and helpful",
    linkLabel: "shipping guidance",
    linkHref: "/shipping-and-return-policy" as StaticPageHref,
  },
  {
    key: "people",
    title: "Customers come first",
    body: "We value clear communication and a helpful shopping experience. If you have questions about products, orders, or delivery, our support is here to assist.",
  },
] as const;
