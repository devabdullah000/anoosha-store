import type { Metadata } from "next";
import Link from "next/link";
import { LuCircleHelp, LuMessageCircle } from "react-icons/lu";
import { breadcrumbSchema, pageMetadata, pageSchema } from "@/lib/storefront-pages";
import { PageShell, SoftNote, StructuredData } from "@/components/storefront-pages/page-shell";
import { FaqList } from "@/components/storefront-pages/faq-list";
import { FAQ_SEO_PARAMS } from "../../lib/seo/faq";
import {
  FAQ_GROUPS,
  FAQ_HELP_CARD_BODY,
  FAQ_HELP_CARD_CTA,
  FAQ_HELP_CARD_TITLE,
  FAQ_RELATED_ROUTES,
  FAQ_SEO_DESCRIPTION,
  FAQ_SHELL_DESCRIPTION,
  FAQ_SHELL_EYEBROW,
  FAQ_SHELL_PATH,
  FAQ_SHELL_TITLE,
  FAQ_SOFT_NOTE_BODY,
  FAQ_SOFT_NOTE_TITLE,
} from "../../lib/constants";

export const metadata: Metadata = pageMetadata(FAQ_SEO_PARAMS);

export default function FaqPage() {
  const faqs = FAQ_GROUPS.flatMap((group) => group.items);

  return (
    <PageShell
      path={FAQ_SHELL_PATH}
      eyebrow={FAQ_SHELL_EYEBROW}
      title={FAQ_SHELL_TITLE}
      description={FAQ_SHELL_DESCRIPTION}
      icon={<LuCircleHelp className="h-3.5 w-3.5" />}
      related={FAQ_RELATED_ROUTES}
    >
      <StructuredData
        data={[
          breadcrumbSchema(FAQ_SHELL_PATH),
          pageSchema(FAQ_SHELL_PATH, FAQ_SEO_DESCRIPTION),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          },
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <FaqList />
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-[#1c2e61] p-6 text-white shadow-xl shadow-indigo-900/10">
            <LuMessageCircle className="h-7 w-7 text-cyan-200" />
            <h2 className="mt-5 text-xl font-bold">{FAQ_HELP_CARD_TITLE}</h2>
            <p className="mt-3 text-sm leading-7 text-indigo-100/85">
              {FAQ_HELP_CARD_BODY}
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-800 transition hover:bg-indigo-50"
            >
              {FAQ_HELP_CARD_CTA}
            </Link>
          </div>
          <SoftNote icon={<LuCircleHelp className="h-5 w-5" />} title={FAQ_SOFT_NOTE_TITLE}>
            {FAQ_SOFT_NOTE_BODY}
          </SoftNote>
        </aside>
      </div>
    </PageShell>
  );
}