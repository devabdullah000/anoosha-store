import type { Metadata } from "next";
import Link from "next/link";
import {
  LuArrowRight,
  LuCircleCheck,
  LuClock3,
  LuMail,
  LuMapPin,
  LuPackage,
  LuPhoneCall,
  LuShieldCheck,
  LuTruck,
} from "react-icons/lu";
import { breadcrumbSchema, pageMetadata, pageSchema } from "@/lib/storefront-pages";
import { InfoTile, PageShell, PolicySection, SoftNote, StructuredData } from "@/components/storefront-pages/page-shell";
import { SHIPPING_AND_RETURN_SEO_PARAMS } from "../../lib/seo/shipping-and-returns";
import {
  SHIPPING_AND_RETURN_ADDRESS_NOTE_BODY,
  SHIPPING_AND_RETURN_ADDRESS_NOTE_TITLE,
  SHIPPING_AND_RETURN_CHECKLIST,
  SHIPPING_AND_RETURN_CHECKLIST_HEADING,
  SHIPPING_AND_RETURN_ESTIMATE_NOTE_BODY,
  SHIPPING_AND_RETURN_ESTIMATE_NOTE_TITLE,
  SHIPPING_AND_RETURN_HELP_CARD_BODY,
  SHIPPING_AND_RETURN_HELP_CARD_CTA,
  SHIPPING_AND_RETURN_HELP_CARD_TITLE,
  SHIPPING_AND_RETURN_POLICY_UPDATED,
  SHIPPING_AND_RETURN_RELATED_ROUTES,
  SHIPPING_AND_RETURN_SECTIONS,
  SHIPPING_AND_RETURN_SEO_DESCRIPTION,
  SHIPPING_AND_RETURN_SHELL_DESCRIPTION,
  SHIPPING_AND_RETURN_SHELL_EYEBROW,
  SHIPPING_AND_RETURN_SHELL_PATH,
  SHIPPING_AND_RETURN_SHELL_TITLE,
  SHIPPING_AND_RETURN_TILES,
  SHIPPING_AND_RETURN_UPDATED_LABEL,
  SUPPORT_EMAIL,
} from "../../lib/constants";

export const metadata: Metadata = pageMetadata(SHIPPING_AND_RETURN_SEO_PARAMS);

const TILE_ICONS = {
  placed: <LuPackage className="h-5 w-5" />,
  confirmed: <LuPhoneCall className="h-5 w-5" />,
  care: <LuMail className="h-5 w-5" />,
} as const;

export default function ShippingAndReturnsPage() {
  return (
    <PageShell
      path={SHIPPING_AND_RETURN_SHELL_PATH}
      eyebrow={SHIPPING_AND_RETURN_SHELL_EYEBROW}
      title={SHIPPING_AND_RETURN_SHELL_TITLE}
      description={SHIPPING_AND_RETURN_SHELL_DESCRIPTION}
      icon={<LuTruck className="h-3.5 w-3.5" />}
      related={SHIPPING_AND_RETURN_RELATED_ROUTES}
    >
      <StructuredData
        data={[
          breadcrumbSchema(SHIPPING_AND_RETURN_SHELL_PATH),
          pageSchema(SHIPPING_AND_RETURN_SHELL_PATH, SHIPPING_AND_RETURN_SEO_DESCRIPTION),
        ]}
      />
      <p className="mb-5 text-xs font-medium text-slate-500">
        {SHIPPING_AND_RETURN_UPDATED_LABEL} {SHIPPING_AND_RETURN_POLICY_UPDATED}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {SHIPPING_AND_RETURN_TILES.map((tile) => (
          <InfoTile key={tile.key} icon={TILE_ICONS[tile.key]} title={tile.title}>
            {tile.body}
          </InfoTile>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-4">
          {SHIPPING_AND_RETURN_SECTIONS.map((section) => (
            <PolicySection key={section.key} title={section.title}>
              {section.paragraphs.map((text, idx) => (
                <p key={idx}>{text}</p>
              ))}
            </PolicySection>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              {SHIPPING_AND_RETURN_CHECKLIST_HEADING}
            </h2>
            <div className="mt-5 space-y-4">
              {SHIPPING_AND_RETURN_CHECKLIST.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <LuCircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-sm leading-6 text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-6 text-white shadow-lg shadow-indigo-950/10">
            <LuShieldCheck className="h-7 w-7 text-cyan-200" />
            <h2 className="mt-5 text-xl font-bold">{SHIPPING_AND_RETURN_HELP_CARD_TITLE}</h2>
            <p className="mt-3 text-sm leading-7 text-indigo-100/90">
              {SHIPPING_AND_RETURN_HELP_CARD_BODY}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-800 transition hover:bg-indigo-50"
            >
              {SHIPPING_AND_RETURN_HELP_CARD_CTA} <LuArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <SoftNote icon={<LuClock3 className="h-5 w-5" />} title={SHIPPING_AND_RETURN_ESTIMATE_NOTE_TITLE}>
            {SHIPPING_AND_RETURN_ESTIMATE_NOTE_BODY} <Link href="/contact">Contact support</Link>.
          </SoftNote>
        </aside>
      </div>

      <div className="mt-5">
        <SoftNote icon={<LuMapPin className="h-5 w-5" />} title={SHIPPING_AND_RETURN_ADDRESS_NOTE_TITLE}>
          {SHIPPING_AND_RETURN_ADDRESS_NOTE_BODY}
        </SoftNote>
      </div>
    </PageShell>
  );
}