
import type { Metadata } from "next";
import Link from "next/link";

import {
  LuFileText,
  LuInfo,
  LuShieldCheck,
} from "react-icons/lu";

import {
  breadcrumbSchema,
  pageMetadata,
  pageSchema,
} from "@/lib/storefront-pages";

import {
  Terms_AND_Condition_POLICY_UPDATED,
  SUPPORT_EMAIL,
  Terms_AND_Condition_DESCRIPTION,
  Terms_AND_Condition_EYEBROW,
  Terms_AND_Condition_TITLE,
  Terms_AND_Condition_POLIICY_SECTION as policySections,
  Terms_AND_Condition_AT_A_GLANCE,
} from "@/lib/constants";

import {
  PageShell,
  PolicySection,
  SoftNote,
  StructuredData,
} from "@/components/storefront-pages/page-shell";

import {
  Terms_AND_Condition_METADATA,
  description,
} from "@/lib/seo/terms-and-condition";

// Static page metadata.
export const metadata: Metadata = pageMetadata(
  Terms_AND_Condition_METADATA
);

export default function TermsPage() {
  return (
    <PageShell
      path="/terms-and-conditions"
      eyebrow={Terms_AND_Condition_EYEBROW}
      title={Terms_AND_Condition_TITLE}
      description={Terms_AND_Condition_DESCRIPTION}
      icon={<LuFileText className="h-3.5 w-3.5" />}
      related={[
        "/shipping-and-return-policy",
        "/contact",
      ]}
    >
      {/* SEO structured data */}
      <StructuredData
        data={[
          breadcrumbSchema("/terms-and-conditions"),
          pageSchema("/terms-and-conditions", description),
        ]}
      />

      {/* Last updated */}
      <p className="mb-5 text-xs font-medium text-slate-500">
        Last updated: {Terms_AND_Condition_POLICY_UPDATED}
      </p>

      {/* Terms and conditions content */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-4">
          {policySections.map((section, index) => (
            <PolicySection
              key={index}
              title={section.heading}
            >
              <p>{section.description}</p>
            </PolicySection>
          ))}
        </div>

        {/* Supporting information */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <LuShieldCheck className="h-7 w-7 text-indigo-700" />

            <h2 className="mt-4 text-base font-bold text-slate-950">
              At a glance
            </h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {Terms_AND_Condition_AT_A_GLANCE.map(
                (item, index) => (
                  <li key={index}>• {item}</li>
                )
              )}
            </ul>
          </div>

          {/* Help links: automatic prefetch disabled */}
          <SoftNote
            icon={<LuInfo className="h-5 w-5" />}
            title="Need assistance?"
          >
            Our{" "}
            <Link
              href="/faq"
              prefetch={false}
            >
              FAQs
            </Link>{" "}
            and{" "}
            <Link
              href="/contact"
              prefetch={false}
            >
              support team
            </Link>{" "}
            can help clarify any part of these terms.
          </SoftNote>
        </aside>
      </div>
    </PageShell>
  );
}
