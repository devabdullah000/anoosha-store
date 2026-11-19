import type { Metadata } from "next";
import Link from "next/link";
import {
  LuArrowUpRight,
  LuBadgeCheck,
  LuHeart,
  LuPackage,
  LuShieldCheck,
  LuSparkles,
  LuTruck,
} from "react-icons/lu";
import {
  breadcrumbSchema,
  pageMetadata,
  pageSchema,
} from "@/lib/storefront-pages";
import {
  InfoTile,
  PageShell,
  PolicySection,
  SoftNote,
  StructuredData,
} from "@/components/storefront-pages/page-shell";
import { ABOUT_SEO_PARAMS } from "../../lib/seo/about";
import {
  ABOUT_CLARITY_CARD_BODY,
  ABOUT_CLARITY_CARD_CTA_HREF,
  ABOUT_CLARITY_CARD_CTA_LABEL,
  ABOUT_CLARITY_CARD_TITLE,
  ABOUT_RELATED_ROUTES,
  ABOUT_SCHEMA_AVAILABLE_LANGUAGES,
  ABOUT_SCHEMA_CONTACT_TYPE,
  ABOUT_SEO_DESCRIPTION,
  ABOUT_SHELL_DESCRIPTION,
  ABOUT_SHELL_EYEBROW,
  ABOUT_SHELL_PATH,
  ABOUT_SHELL_TITLE,
  ABOUT_SOFT_NOTE_LINK_HREF,
  ABOUT_SOFT_NOTE_LINK_LABEL,
  ABOUT_SOFT_NOTE_PREFIX,
  ABOUT_SOFT_NOTE_TITLE,
  ABOUT_STORY_FAQ_LINK_HREF,
  ABOUT_STORY_FAQ_LINK_LABEL,
  ABOUT_STORY_PARAGRAPH_ONE_PREFIX,
  ABOUT_STORY_PARAGRAPH_ONE_SUFFIX,
  ABOUT_STORY_PARAGRAPH_THREE_HIGHLIGHT,
  ABOUT_STORY_PARAGRAPH_THREE_MIDDLE,
  ABOUT_STORY_PARAGRAPH_THREE_PREFIX,
  ABOUT_STORY_PARAGRAPH_TWO,
  ABOUT_STORY_SECTION_EYEBROW,
  ABOUT_STORY_SECTION_TITLE,
  ABOUT_STORY_TERMS_CONNECTOR,
  ABOUT_STORY_TERMS_LINK_HREF,
  ABOUT_STORY_TERMS_LINK_LABEL,
  ABOUT_TILES,
  footer_brand,
  STORE_URL,
  SUPPORT_EMAIL
} from "../../lib/constants";

export const metadata: Metadata = pageMetadata(ABOUT_SEO_PARAMS);

const TILE_ICONS = {
  design: <LuPackage className="h-5 w-5" />,
  shopping: <LuShieldCheck className="h-5 w-5" />,
  people: <LuHeart className="h-5 w-5" />,
} as const;

export default function AboutPage() {
  return (
    <PageShell
      path={ABOUT_SHELL_PATH}
      eyebrow={ABOUT_SHELL_EYEBROW}
      title={ABOUT_SHELL_TITLE}
      description={ABOUT_SHELL_DESCRIPTION}
      icon={<LuSparkles className="h-3.5 w-3.5" />}
      related={ABOUT_RELATED_ROUTES}
    >
      <StructuredData
        data={[
          breadcrumbSchema(ABOUT_SHELL_PATH),
          pageSchema(ABOUT_SHELL_PATH, ABOUT_SEO_DESCRIPTION),
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: footer_brand.name,
            url: STORE_URL,
            logo: `${STORE_URL}${footer_brand.logo}`,
            contactPoint: {
              "@type": "ContactPoint",
              contactType: ABOUT_SCHEMA_CONTACT_TYPE,
              email: SUPPORT_EMAIL,
              availableLanguage: ABOUT_SCHEMA_AVAILABLE_LANGUAGES,
            },
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {ABOUT_TILES.map((tile) => (
          <InfoTile key={tile.key} icon={TILE_ICONS[tile.key]} title={tile.title}>
            {tile.body}
            {"linkHref" in tile && (
              <>
                {" "}
                <Link
                  href={tile.linkHref}
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  {tile.linkLabel}
                </Link>
                .
              </>
            )}
          </InfoTile>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
        <PolicySection
          title={ABOUT_STORY_SECTION_TITLE}
          eyebrow={ABOUT_STORY_SECTION_EYEBROW}
        >
          <p>
            {ABOUT_STORY_PARAGRAPH_ONE_PREFIX} {footer_brand.name}{" "}
            {ABOUT_STORY_PARAGRAPH_ONE_SUFFIX}
          </p>
          <p>{ABOUT_STORY_PARAGRAPH_TWO}</p>
          <p>
            {ABOUT_STORY_PARAGRAPH_THREE_PREFIX}{" "}
            <strong>{ABOUT_STORY_PARAGRAPH_THREE_HIGHLIGHT}</strong>
            {ABOUT_STORY_PARAGRAPH_THREE_MIDDLE}{" "}
            <Link href={ABOUT_STORY_FAQ_LINK_HREF}>
              {ABOUT_STORY_FAQ_LINK_LABEL}
            </Link>{" "}
            {ABOUT_STORY_TERMS_CONNECTOR}{" "}
            <Link href={ABOUT_STORY_TERMS_LINK_HREF}>
              {ABOUT_STORY_TERMS_LINK_LABEL}
            </Link>
            .
          </p>
        </PolicySection>

        <div className="rounded-[24px] bg-gradient-to-br from-indigo-950 via-slate-900 to-[#162450] p-7 text-white shadow-xl shadow-indigo-900/10 sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10">
            <LuBadgeCheck className="h-6 w-6 text-cyan-200" />
          </span>
          <h2 className="mt-6 text-2xl font-bold tracking-tight">
            {ABOUT_CLARITY_CARD_TITLE}
          </h2>
          <p className="mt-3 text-sm leading-7 text-indigo-100/85">
            {ABOUT_CLARITY_CARD_BODY}
          </p>
          <Link
            href={ABOUT_CLARITY_CARD_CTA_HREF}
            className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-white"
          >
            {ABOUT_CLARITY_CARD_CTA_LABEL}{" "}
            <LuArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <SoftNote icon={<LuTruck className="h-5 w-5" />} title={ABOUT_SOFT_NOTE_TITLE}>
          {ABOUT_SOFT_NOTE_PREFIX}{" "}
          <Link href={ABOUT_SOFT_NOTE_LINK_HREF}>
            {ABOUT_SOFT_NOTE_LINK_LABEL}
          </Link>
          .
        </SoftNote>
      </div>
    </PageShell>
  );
}