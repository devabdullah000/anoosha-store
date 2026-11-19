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

export const ICON_CLASS = "h-5 w-5 text-black";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const STOREFRONT_PAGES = [
  { href: "/about", name: "About Us" },
  { href: "/contact", name: "Contact Us" },
  { href: "/faq", name: "FAQs" },
  { href: "/shipping-and-return-policy", name: "Shipping & Returns Information" },
  { href: "/privacy-policy", name: "Privacy Policy" },
  { href: "/terms-and-conditions", name: "Terms & Conditions" },
  { href: "/cart", name: "Cart" },
  { href: "/orders", name: "Orders" },
] as const;

/* ==================================================================
   SOCIAL LINKS & ICON CONFIGURATION
   ================================================================== */

export const footer_social_links: FooterSocialLink[] = [
  // Add your official social media URLs here.
  // Example: { name: "Instagram", link: "https://instagram.com/your-store" },
  { name: "Instagram", link: "https://instagram.com/your-store" },
  { name: "Facebook", link: "https://facebook.com/your-store" },
  { name: "YouTube", link: "https://youtube.com/your-store" },
  { name: "TikTok", link: "https://tiktok.com/@your-store" },
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
    { name: "Terms And Conditions", link: "/terms-and-conditions" },
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
    "Discover quality mobile and gaming accessories designed to keep you connected, equipped, and ready for more.",
  logo: "/brand-logo.svg",
  logoAlt: "Anoosha Store",
  logoHref: "/",
  tagline: "Mobile & Gaming Accessories",
};

export const footer_bottom_text = {
  copyright: "All rights reserved.",
  country: "Pakistan",
  closingLine: "Made for everyday connections and gaming experiences.",
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

export const Terms_AND_Condition_EYEBROW = "The essentials";

export const Terms_AND_Condition_TITLE = "Clear terms. Confident shopping.";

export const Terms_AND_Condition_DESCRIPTION =
  "These terms explain how orders, payments, delivery, cancellations and customer support work at Anoosha Store. Please read them before placing an order.";

export const Terms_AND_Condition_POLICY_UPDATED = "18 November 2026";

export const Terms_AND_Condition_POLIICY_SECTION = [
  {
    heading: "1. About these terms",
    description:
      "These terms apply to browsing, ordering and purchasing products from Anoosha Store. By placing an order, you agree to provide accurate information and follow the purchasing process described here. Your statutory consumer rights under applicable law remain unaffected. We may update these terms to reflect changes in our operations or legal requirements. The current version will appear on this page.",
  },
  {
    heading: "2. Products, information and availability",
    description:
      "We aim to present useful product descriptions, specifications and images. Actual appearance, packaging and availability can vary slightly. Please review product details before ordering and contact us if anything is unclear. Products and pricing may change without notice. An order can require verification of product availability or delivery feasibility before confirmation.",
  },
  {
    heading: "3. Placing and confirming orders",
    description:
      "To place an order, provide your correct full name, reachable phone number, email where requested, and complete delivery address, including any relevant area or landmark. We may call or email you to confirm the order or resolve questions about the delivery details. Incorrect or unreachable contact information may delay or prevent order processing. Placing an order does not guarantee dispatch until it has been confirmed and processed. Review order details through your Orders page where available.",
  },
  {
    heading: "4. Payment",
    description:
      "We currently accept cash on delivery (COD) only. Pay the amount confirmed for your order when the parcel is delivered. Any applicable shipping charge should be shown during checkout or communicated before order confirmation. We do not currently request online card payment through our store.",
  },
  {
    heading: "5. Cancellation requests",
    description: `You may cancel an order within 15 minutes of placing it, using the available order cancellation option where provided. After the initial 15 minutes, email ${SUPPORT_EMAIL} as soon as possible. Include your order number and explicitly request cancellation. Our team will check the order status and notify you when it has been cancelled, or explain if cancellation is no longer possible. After dispatch, an order may no longer be cancellable. If a parcel has already shipped, refer to our Returns & Refunds guidance.`,
  },
  {
    heading: "6. Shipping and delivery",
    description:
      "Delivery serviceability, applicable charges and estimated timing depend on the destination, courier coverage and order circumstances. Delivery estimates are not guarantees. Keep your phone reachable for order confirmation and delivery coordination. See Shipping Information for more detail.",
  },
  {
    heading: "7. Returns, issues and refunds",
    description:
      "For a damaged item, wrong item, or other concern, contact us promptly with your order number and relevant photographs. Requests are reviewed case by case, subject to the applicable law and our Returns & Refunds policy. Do not send a parcel back without first requesting instructions from our support team.",
  },
  {
    heading: "8. Accounts, website use and content",
    description:
      "Keep your account credentials private and use the website lawfully. Do not misuse checkout, impersonate another customer or interfere with the website's operation. Store content, imagery and branding belong to Anoosha Store or their respective owners. Do not reproduce them for commercial use without permission.",
  },
  {
    heading: "9. Privacy and communication",
    description:
      "We use information supplied during account creation, ordering and support requests to operate the store, handle purchases and communicate with you. Read our Privacy Policy for a more detailed explanation. Order-related calls or emails are operational communications and may be necessary to complete a purchase.",
  },
  {
    heading: "10. Questions about these terms",
    description: `Contact ${SUPPORT_EMAIL} or use our Contact page. For order-specific questions, include your order number. These terms are subject to applicable laws and mandatory consumer protections in Pakistan.`,
  },
];

export const Terms_AND_Condition_AT_A_GLANCE = [
  "Cash on delivery only",
  "Accurate details required",
  "Order confirmation may involve a call or email",
  "15-minute cancellation window",
  "Email support for later cancellation requests",
];

/* ==================================================================
   SHIPPING & RETURNS PAGE
   ================================================================== */

export const SHIPPING_AND_RETURN_SEO_TITLE = "Shipping & Returns";

export const SHIPPING_AND_RETURN_SEO_DESCRIPTION =
  "Find Anoosha Store shipping and return policies, including order verification, delivery estimates, cash on delivery, address accuracy, damaged or wrong items and refund help.";

export const SHIPPING_AND_RETURN_SEO_PATH: StaticPageHref =
  "/shipping-and-return-policy";

export const SHIPPING_AND_RETURN_SHELL_PATH: StaticPageHref =
  "/shipping-and-return-policy";

export const SHIPPING_AND_RETURN_SHELL_EYEBROW = "Delivery & post-purchase care";

export const SHIPPING_AND_RETURN_SHELL_TITLE =
  "Shipping, returns and help, all in one place.";

export const SHIPPING_AND_RETURN_SHELL_DESCRIPTION =
  "How order confirmation, cash on delivery, delivery estimates, item issues and return reviews work at Anoosha Store.";

export const SHIPPING_AND_RETURN_UPDATED_LABEL = "Last updated:";

export const SHIPPING_AND_RETURN_CHECKLIST_HEADING =
  "Before you order or reach out";

export const SHIPPING_AND_RETURN_HELP_CARD_TITLE =
  "Need help with an order or item?";

export const SHIPPING_AND_RETURN_HELP_CARD_BODY =
  "Start with your order number and a clear description—and keep packaging and photos handy—so our team can guide you.";

export const SHIPPING_AND_RETURN_HELP_CARD_CTA = "Start a request";

export const SHIPPING_AND_RETURN_ESTIMATE_NOTE_TITLE =
  "No guaranteed delivery dates";

export const SHIPPING_AND_RETURN_ESTIMATE_NOTE_BODY =
  "Estimates may vary. Need a status update? Get in touch with your order number.";

export const SHIPPING_AND_RETURN_ADDRESS_NOTE_TITLE =
  "Accurate addresses make a difference";

export const SHIPPING_AND_RETURN_ADDRESS_NOTE_BODY =
  "Double-check your street, area, city and reachable contact number before submitting an order.";

export const SHIPPING_AND_RETURN_POLICY_UPDATED = "18 November 2026";

export const SHIPPING_AND_RETURN_SEO_KEYWORDS: string[] = [
  "shipping Pakistan",
  "cash on delivery",
  "returns",
  "refund request",
  "wrong item",
  "damaged parcel",
];

export const SHIPPING_AND_RETURN_RELATED_ROUTES: StaticPageHref[] = [
  "/contact",
  "/faq",
  "/terms-and-conditions",
];

export const SHIPPING_AND_RETURN_TILES = [
  {
    key: "placed",
    title: "Order placed",
    body: "Choose your accessories and enter your complete contact and delivery details.",
  },
  {
    key: "confirmed",
    title: "Order confirmed",
    body: "Our team may call or email to confirm details or clarify questions before dispatch.",
  },
  {
    key: "care",
    title: "Delivery & care",
    body: "Pay cash on delivery on arrival, inspect promptly, and reach out with your order number for any issue.",
  },
] as const;

export const SHIPPING_AND_RETURN_SECTIONS = [
  {
    key: "availability",
    title: "Delivery availability",
    paragraphs: [
      "Delivery coverage depends on the destination, courier serviceability and the items ordered. Confirm that your location can be served when placing your order or during order confirmation.",
      "We cannot guarantee service in every location. If there is a delivery limitation, our team may contact you to discuss the available options.",
    ],
  },
  {
    key: "fees-payment",
    title: "Shipping fees and cash on delivery",
    paragraphs: [
      "Any applicable delivery fee should be shown during checkout or communicated before the order is confirmed. The payable amount includes the order total and any confirmed delivery charge.",
      "We currently support cash on delivery (COD). Please arrange to pay the confirmed amount when your parcel arrives.",
    ],
  },
  {
    key: "estimates",
    title: "Processing and delivery estimates",
    paragraphs: [
      "Orders may require a confirmation call or email before processing. Dispatch and delivery times vary with product availability, destination, courier operations and seasonal demand.",
      "If a delivery estimate is provided, it is an estimate rather than a guaranteed date. Unexpected delays, weather, public holidays or courier disruptions may affect arrival.",
    ],
  },
  {
    key: "address-accuracy",
    title: "Accurate contact and location details",
    paragraphs: [
      "At checkout, provide a reachable phone number, correct name and full delivery address. Include the area, city and any helpful landmark or location information.",
      "If details are incorrect or you cannot be reached, the shipment may be delayed, returned or cancelled. To request an address correction, contact support immediately with your order number; changes cannot always be made after dispatch.",
    ],
  },
  {
    key: "tracking",
    title: "Tracking and delivery questions",
    paragraphs: [
      "Shipment or tracking information may be provided when available from the courier. Check your Orders page or email support with your order number for shipment updates.",
      "If a parcel is delayed, damaged or not delivered as expected, contact us with your order number and clear photos where relevant so we can review and guide you.",
    ],
  },
  {
    key: "return-review",
    title: "How return and refund reviews work",
    paragraphs: [
      "Contact us as soon as reasonably possible with your order number, contact details, explanation of the issue and clear photos if an item is damaged, defective or incorrect.",
      "Email support or use the contact form, wait for eligibility guidance and instructions before sending anything back, and note that refunds for COD orders follow an arranged non-card method or an appropriate resolution under applicable consumer laws.",
    ],
  },
  {
    key: "cancellations-rights",
    title: "Cancellations and consumer rights",
    paragraphs: [
      "You may cancel within the first 15 minutes of ordering. After that, email support with your order number immediately; cancellation may not be possible after dispatch, and the return review process may apply instead.",
      "Nothing here limits mandatory consumer protection rights under applicable law. See our Terms & Conditions and FAQs for more details.",
    ],
  },
] as const;

export const SHIPPING_AND_RETURN_CHECKLIST = [
  "Your phone number is active and reachable",
  "Your address includes city, area and helpful location details",
  "You understand that payment is cash on delivery",
  "You have checked item details, quantities and packaging on arrival",
] as const;

/* ==================================================================
   PRIVACY POLICY PAGE
   ================================================================== */

export const PRIVACY_POLICY_SEO_TITLE = "Privacy Policy";

export const PRIVACY_POLICY_SEO_DESCRIPTION =
  "Learn how Anoosha Store collects, uses and protects personal information for accounts, cash-on-delivery orders, customer support and contact requests.";

export const PRIVACY_POLICY_SEO_PATH: StaticPageHref = "/privacy-policy";

export const PRIVACY_POLICY_SHELL_PATH: StaticPageHref = "/privacy-policy";

export const PRIVACY_POLICY_SHELL_EYEBROW = "Your information";

export const PRIVACY_POLICY_SHELL_TITLE = "Your trust deserves clarity.";

export const PRIVACY_POLICY_SHELL_DESCRIPTION =
  "This policy explains what information we use, why we need it, and how you can reach us with privacy-related questions while shopping at Anoosha Store.";

export const PRIVACY_POLICY_UPDATED_LABEL = "Last updated:";

export const PRIVACY_POLICY_SOFT_NOTE_TITLE =
  "Cash on delivery means no card checkout";

export const PRIVACY_POLICY_SOFT_NOTE_BODY =
  "We currently accept cash on delivery. Please never email payment-card information or passwords to customer support.";

export const PRIVACY_POLICY_UPDATED = "Last updated: January 1, 2023";

export const PRIVACY_POLICY_SEO_KEYWORDS: string[] = [
  "customer privacy",
  "personal data",
  "cookies",
];

export const PRIVACY_POLICY_RELATED_ROUTES: StaticPageHref[] = [
  "/terms-and-conditions",
  "/contact",
  "/faq",
  "/shipping-and-return-policy",
];

export const PRIVACY_POLICY_PILLARS = [
  {
    key: "purpose",
    title: "Purpose-led data",
    body: "We use customer information to serve orders and answer requests.",
  },
  {
    key: "security",
    title: "Account protection",
    body: "Authentication and session controls help protect account access.",
  },
  {
    key: "questions",
    title: "Privacy questions",
    body: "You can contact our team to ask about information associated with you.",
  },
] as const;

export const PRIVACY_POLICY_SECTIONS = [
  {
    key: "collection",
    title: "1. Information we collect",
    paragraphs: [
      "Depending on how you use Anoosha Store, information may include your name, email address, phone number, delivery address, account identifiers, order details and messages you send to us.",
      "We may also receive routine technical information such as browser details, IP address and essential session-cookie data needed to run the website and keep accounts signed in.",
      "When you choose Google sign-in, authentication information is used to establish your session. We do not require an online payment-card number for cash-on-delivery orders.",
    ],
    bullets: [] as string[],
  },
  {
    key: "usage",
    title: "2. How we use information",
    paragraphs: [
      "We do not use the contact form as an automatic newsletter signup.",
    ],
    bullets: [
      "To create and maintain customer accounts and authenticate sign-ins.",
      "To process orders, confirm availability, arrange delivery and respond to order questions.",
      "To contact you by phone or email for order confirmation, corrections and operational updates.",
      "To address cancellation, return, refund and general support requests.",
      "To protect against misuse, diagnose service issues and meet applicable legal requirements.",
    ],
  },
  {
    key: "sharing",
    title: "3. Sharing with service providers",
    paragraphs: [
      "To operate the store, relevant information may be processed by service providers such as cloud hosting, authentication, email delivery and fulfilment or courier partners. For example, our contact emails and verification messages are delivered through an email service provider.",
      "We share only information reasonably needed for the relevant service. Information may also be disclosed when required by applicable law or to address security or legal matters.",
    ],
    bullets: [] as string[],
  },
  {
    key: "cookies",
    title: "4. Cookies and authentication",
    paragraphs: [
      "Essential cookies may be used to maintain login sessions, support account security and keep the website working. Some sign-in options can involve third-party identity providers, such as Google, under their own privacy notices.",
      "You can manage cookies in your browser, but disabling essential cookies may prevent sign-in or order-related features from working correctly.",
    ],
    bullets: [] as string[],
  },
  {
    key: "storage",
    title: "5. Data storage and security",
    paragraphs: [
      "We use technical and organizational measures intended to reduce unauthorized access, alteration and loss. No internet-connected service can guarantee absolute security.",
      "Information is kept for as long as reasonably needed for the purpose collected, operational records, dispute handling and applicable legal obligations. Different categories of records may have different retention periods.",
    ],
    bullets: [] as string[],
  },
  {
    key: "rights",
    title: "6. Access, correction and deletion requests",
    paragraphs: [
      "For questions about your information, to request corrections or to ask about deletion where applicable, contact support with enough detail to identify your request; we may need to verify your identity before acting.",
      "Some records may need to be retained to comply with legal obligations, resolve disputes or preserve legitimate transaction records.",
    ],
    bullets: [] as string[],
  },
  {
    key: "children",
    title: "7. Children's privacy and external sites",
    paragraphs: [
      "The website is intended for customers who can legally place orders. If you believe a child submitted personal information without appropriate authorization, please contact us.",
      "Links to external platforms, including social networks, are governed by those platforms' own terms and privacy practices.",
    ],
    bullets: [] as string[],
  },
  {
    key: "changes",
    title: "8. Changes and contact",
    paragraphs: [
      "We may revise this policy as features and legal requirements evolve. The updated version and date will appear here.",
      "For privacy enquiries, use our contact form or email support. Read our Terms & Conditions for purchasing rules.",
    ],
    bullets: [] as string[],
  },
] as const;

/* ==================================================================
   FREQUENTLY ASKED QUESTIONS PAGE
   ================================================================== */

export const FAQ_SEO_TITLE = "Frequently Asked Questions";

export const FAQ_SEO_DESCRIPTION =
  "Find answers to questions about Anoosha Store orders, cash on delivery, 15-minute cancellation, shipping, returns and customer support.";

export const FAQ_SEO_PATH: StaticPageHref = "/faq";

export const FAQ_SHELL_PATH: StaticPageHref = "/faq";

export const FAQ_SHELL_EYEBROW = "Help center";

export const FAQ_SHELL_TITLE = "Questions? We've got the details.";

export const FAQ_SHELL_DESCRIPTION =
  "Everything you need to know about ordering, cash on delivery, shipping and getting help from Anoosha Store—all in one easy place.";

export const FAQ_HELP_CARD_TITLE = "We’re here to help.";

export const FAQ_HELP_CARD_BODY =
  "Didn’t find an answer? Contact our team and we’ll help you with your question.";

export const FAQ_HELP_CARD_CTA = "Contact support";

export const FAQ_SOFT_NOTE_TITLE = "Order enquiries";

export const FAQ_SOFT_NOTE_BODY =
  "When contacting us about an order, include your order number to help us find the right details.";

export const FAQ_SEO_KEYWORDS: string[] = [
  "Anoosha Store FAQ",
  "COD",
  "cancel order",
];

export const FAQ_RELATED_ROUTES: StaticPageHref[] = [
  "/contact",
  "/shipping-and-return-policy",
  "/terms-and-conditions",
];

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Orders & payment",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "We currently offer cash on delivery (COD). Please have the payable amount ready when your parcel arrives. Other payment methods are not available at this time.",
      },
      {
        q: "Will Anoosha Store contact me after I place an order?",
        a: "Yes. We may contact you using the phone number or email provided at checkout to confirm your order, clarify delivery details or resolve order-related questions. Please keep your contact information accurate and reachable.",
      },
      {
        q: "Can I cancel an order?",
        a: "Orders can be cancelled within 15 minutes of placement. After that, please email anooshastoree@gmail.com as soon as possible with your order number and cancellation request. We will review the order status and confirm when cancellation has been processed. Once dispatched, cancellation may no longer be possible.",
      },
      {
        q: "How can I find information about an existing order?",
        a: "Go to the Orders page to review available order details. For further help, contact our support team and include your order number.",
      },
    ],
  },
  {
    title: "Shipping & delivery",
    items: [
      {
        q: "Where do you deliver?",
        a: "Delivery availability depends on the destination and courier coverage. Confirm your complete address and available shipping options during checkout or order confirmation.",
      },
      {
        q: "How much does shipping cost?",
        a: "Any applicable delivery charge should be shown during checkout or communicated before your order is confirmed. Contact us if you need clarification about the total amount to pay on delivery.",
      },
      {
        q: "How long will delivery take?",
        a: "Timing varies with destination, courier coverage and order processing. An estimated timeline may be shared when your order is confirmed; it is not a guaranteed delivery date.",
      },
      {
        q: "What if I entered the wrong address or phone number?",
        a: "Contact us immediately and include your order number and corrected details. Changes may not be possible once the parcel has been dispatched.",
      },
    ],
  },
  {
    title: "Returns, refunds & support",
    items: [
      {
        q: "What should I do if my parcel is damaged or the wrong item arrives?",
        a: "Contact us promptly with your order number, a description of the issue and clear photographs of the parcel and item. We will review the matter and explain the next steps.",
      },
      {
        q: "Can I request a return or refund?",
        a: "You can request a review through our Contact page or by email. Eligibility, return instructions and any refund arrangement are confirmed after reviewing your order and the condition or issue, subject to applicable consumer rights.",
      },
      {
        q: "Do you offer refunds to the original payment card?",
        a: "We currently accept cash on delivery, not online card payments. If a refund is approved, our team will confirm an appropriate refund method with you.",
      },
      {
        q: "How can I reach Anoosha Store?",
        a: "Use our contact form or email anooshastoree@gmail.com. Include your order number for any order-related request so we can assist you more efficiently.",
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
   ABOUT US PAGE
   ================================================================== */

export const ABOUT_SEO_TITLE = "About Us";

export const ABOUT_SEO_DESCRIPTION =
  "Get to know Anoosha Store: practical mobile and gaming accessories, clear cash-on-delivery ordering, and customer-focused support in Pakistan.";

export const ABOUT_SEO_PATH: StaticPageHref = "/about";

export const ABOUT_SHELL_PATH: StaticPageHref = "/about";

export const ABOUT_SHELL_EYEBROW = "Our story";

export const ABOUT_SHELL_TITLE = "Small accessories. Better everyday moments.";

export const ABOUT_SHELL_DESCRIPTION =
  "A modern place to discover mobile and gaming accessories, with a shopping experience built around clarity, convenience and genuine customer care.";

export const ABOUT_SCHEMA_CONTACT_TYPE = "customer support";

export const ABOUT_STORY_SECTION_EYEBROW = "Why Anoosha Store exists";

export const ABOUT_STORY_SECTION_TITLE = "A store for what moves with you";

export const ABOUT_STORY_PARAGRAPH_ONE_PREFIX =
  "Technology is part of how we communicate, work, play and relax. The little things around it matter too.";

export const ABOUT_STORY_PARAGRAPH_ONE_SUFFIX =
  "brings mobile and gaming accessories together in a shopping space that feels simple to explore.";

export const ABOUT_STORY_PARAGRAPH_TWO =
  "We want customers to understand what they are ordering and what happens next. From accurate product information to straightforward support, our aim is to make each interaction feel considered.";

export const ABOUT_STORY_PARAGRAPH_THREE_PREFIX = "We currently accept";

export const ABOUT_STORY_PARAGRAPH_THREE_HIGHLIGHT = "cash on delivery";

export const ABOUT_STORY_PARAGRAPH_THREE_MIDDLE =
  ". For more details about ordering and confirmation, explore our";

export const ABOUT_STORY_FAQ_LINK_LABEL = "frequently asked questions";

export const ABOUT_STORY_FAQ_LINK_HREF: StaticPageHref = "/faq";

export const ABOUT_STORY_TERMS_CONNECTOR = "and";

export const ABOUT_STORY_TERMS_LINK_LABEL = "terms and conditions";

export const ABOUT_STORY_TERMS_LINK_HREF: StaticPageHref =
  "/terms-and-conditions";

export const ABOUT_CLARITY_CARD_TITLE = "Shopping with clarity.";

export const ABOUT_CLARITY_CARD_BODY =
  "Accurate contact and delivery information helps us confirm orders and avoid preventable delays. We may reach out when information needs clarification.";

export const ABOUT_CLARITY_CARD_CTA_LABEL = "Get in touch";

export const ABOUT_CLARITY_CARD_CTA_HREF: StaticPageHref = "/contact";

export const ABOUT_SOFT_NOTE_TITLE = "Before your order arrives";

export const ABOUT_SOFT_NOTE_PREFIX =
  "Learn how delivery confirmation and return reviews work in our";

export const ABOUT_SOFT_NOTE_LINK_LABEL =
  "shipping and returns guidance";

export const ABOUT_SOFT_NOTE_LINK_HREF: StaticPageHref =
  "/shipping-and-return-policy";

export const ABOUT_SEO_KEYWORDS: string[] = [
  "about Anoosha Store",
  "accessory shop",
];

export const ABOUT_RELATED_ROUTES: StaticPageHref[] = [
  "/contact",
  "/faq",
  "/shipping-and-return-policy",
  "/terms-and-conditions",
];

export const ABOUT_SCHEMA_AVAILABLE_LANGUAGES: string[] = ["English"];

export const ABOUT_TILES = [
  {
    key: "design",
    title: "Useful by design",
    body: "We focus on accessories that belong in your daily setup, from mobile essentials to gaming gear.",
  },
  {
    key: "shopping",
    title: "Straightforward shopping",
    body: "Clear order steps, cash on delivery and accessible",
    linkLabel: "shipping guidance",
    linkHref: "/shipping-and-return-policy" as StaticPageHref,
  },
  {
    key: "people",
    title: "People behind the parcel",
    body: "We can contact you to confirm an order and help resolve questions before it reaches you.",
  },
] as const;