import type { Metadata } from "next";
import Link from "next/link";
import { LuClock3, LuMail, LuMessageCircle, LuShieldCheck } from "react-icons/lu";
import {
  breadcrumbSchema,
  pageMetadata,
  pageSchema,
} from "@/lib/storefront-pages";
import { PageShell, SoftNote, StructuredData } from "@/components/storefront-pages/page-shell";
import ContactForm from "@/components/storefront-pages/contact-form";
import { SocialLinks } from "@/components/storefront-pages/social-links";
import { CONTACT_SEO_PARAMS } from "../../lib/seo/contact";
import {
  CONTACT_CANCEL_NOTE_BODY,
  CONTACT_CANCEL_NOTE_LINK_HREF,
  CONTACT_CANCEL_NOTE_LINK_LABEL,
  CONTACT_CANCEL_NOTE_TITLE,
  CONTACT_EMAIL_CARD_BODY,
  CONTACT_EMAIL_CARD_TITLE,
  CONTACT_FORM_EYEBROW,
  CONTACT_FORM_SUBTITLE,
  CONTACT_FORM_TITLE,
  CONTACT_REACH_NOTE_BODY,
  CONTACT_REACH_NOTE_TITLE,
  CONTACT_RELATED_ROUTES,
  CONTACT_SCHEMA_NAME,
  CONTACT_SCHEMA_ORG_NAME,
  CONTACT_SEO_DESCRIPTION,
  CONTACT_SHELL_DESCRIPTION,
  CONTACT_SHELL_EYEBROW,
  CONTACT_SHELL_PATH,
  CONTACT_SHELL_TITLE,
  CONTACT_SOCIAL_BODY,
  CONTACT_SOCIAL_EYEBROW,
  CONTACT_SOCIAL_TITLE,
  STORE_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO
} from "../../lib/constants";

export const metadata: Metadata = pageMetadata(CONTACT_SEO_PARAMS);

export default function ContactPage() {
  return (
    <PageShell
      path={CONTACT_SHELL_PATH}
      eyebrow={CONTACT_SHELL_EYEBROW}
      title={CONTACT_SHELL_TITLE}
      description={CONTACT_SHELL_DESCRIPTION}
      icon={<LuMessageCircle className="h-3.5 w-3.5" />}
      related={CONTACT_RELATED_ROUTES}
    >
      <StructuredData
        data={[
          breadcrumbSchema(CONTACT_SHELL_PATH),
          pageSchema(CONTACT_SHELL_PATH, CONTACT_SEO_DESCRIPTION),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: CONTACT_SCHEMA_NAME,
            url: `${STORE_URL}${CONTACT_SHELL_PATH}`,
            mainEntity: {
              "@type": "Organization",
              name: CONTACT_SCHEMA_ORG_NAME,
              email: SUPPORT_EMAIL,
            },
          },
        ]}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
        <section
          aria-labelledby="contact-form-title"
          className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(37,55,91,.05)] sm:p-8"
        >
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-indigo-600">
            {CONTACT_FORM_EYEBROW}
          </p>
          <h2
            id="contact-form-title"
            className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
          >
            {CONTACT_FORM_TITLE}
          </h2>
          <p className="mb-7 mt-2 text-sm leading-7 text-slate-500">
            {CONTACT_FORM_SUBTITLE}
          </p>
          <ContactForm />
        </section>

        <div className="space-y-5">
          <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(37,55,91,.05)] sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <LuMail className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-slate-950">
              {CONTACT_EMAIL_CARD_TITLE}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {CONTACT_EMAIL_CARD_BODY}
            </p>
            <a
              href={SUPPORT_MAILTO}
              className="mt-4 inline-block break-all text-sm font-bold text-indigo-700 underline underline-offset-4 hover:text-indigo-900"
            >
              {SUPPORT_EMAIL}
            </a>
          </section>

          <SoftNote icon={<LuClock3 className="h-5 w-5" />} title={CONTACT_CANCEL_NOTE_TITLE}>
            {CONTACT_CANCEL_NOTE_BODY}{" "}
            <Link href={CONTACT_CANCEL_NOTE_LINK_HREF}>
              {CONTACT_CANCEL_NOTE_LINK_LABEL}
            </Link>
            .
          </SoftNote>

          <SoftNote icon={<LuShieldCheck className="h-5 w-5" />} title={CONTACT_REACH_NOTE_TITLE}>
            {CONTACT_REACH_NOTE_BODY}
          </SoftNote>
        </div>
      </div>

      <section
        aria-labelledby="social-title"
        className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(37,55,91,.035)] sm:p-8"
      >
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-indigo-600">
            {CONTACT_SOCIAL_EYEBROW}
          </p>
          <h2 id="social-title" className="mt-2 text-xl font-bold text-slate-950">
            {CONTACT_SOCIAL_TITLE}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {CONTACT_SOCIAL_BODY}
          </p>
        </div>
        <SocialLinks />
      </section>
    </PageShell>
  );
}