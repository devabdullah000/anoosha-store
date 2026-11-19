import type { Metadata } from "next";
import Link from "next/link";
import { LuLockKeyhole, LuMail, LuShieldCheck } from "react-icons/lu";
import { breadcrumbSchema, pageMetadata, pageSchema } from "@/lib/storefront-pages";
import { PageShell, PolicySection, SoftNote, StructuredData } from "@/components/storefront-pages/page-shell";
import { PRIVACY_POLICY_SEO_PARAMS } from "../../lib/seo/privacy-policy";
import { SUPPORT_EMAIL,PRIVACY_POLICY_UPDATED as POLICY_UPDATED } from "../../lib/constants";
import {
  PRIVACY_POLICY_PILLARS,
  PRIVACY_POLICY_RELATED_ROUTES,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_SEO_DESCRIPTION,
  PRIVACY_POLICY_SHELL_DESCRIPTION,
  PRIVACY_POLICY_SHELL_EYEBROW,
  PRIVACY_POLICY_SHELL_PATH,
  PRIVACY_POLICY_SHELL_TITLE,
  PRIVACY_POLICY_SOFT_NOTE_BODY,
  PRIVACY_POLICY_SOFT_NOTE_TITLE,
  PRIVACY_POLICY_UPDATED_LABEL,
} from "../../lib/constants";

export const metadata: Metadata = pageMetadata(PRIVACY_POLICY_SEO_PARAMS);

const PILLAR_ICONS = {
  purpose: <LuShieldCheck className="h-6 w-6 text-indigo-700" />,
  security: <LuLockKeyhole className="h-6 w-6 text-indigo-700" />,
  questions: <LuMail className="h-6 w-6 text-indigo-700" />,
} as const;

export default function PrivacyPage() {
  return (
    <PageShell
      path={PRIVACY_POLICY_SHELL_PATH}
      eyebrow={PRIVACY_POLICY_SHELL_EYEBROW}
      title={PRIVACY_POLICY_SHELL_TITLE}
      description={PRIVACY_POLICY_SHELL_DESCRIPTION}
      icon={<LuLockKeyhole className="h-3.5 w-3.5" />}
      related={PRIVACY_POLICY_RELATED_ROUTES}
    >
      <StructuredData
        data={[
          breadcrumbSchema(PRIVACY_POLICY_SHELL_PATH),
          pageSchema(PRIVACY_POLICY_SHELL_PATH, PRIVACY_POLICY_SEO_DESCRIPTION),
        ]}
      />
      <p className="mb-5 text-xs font-medium text-slate-500">
        {PRIVACY_POLICY_UPDATED_LABEL} {POLICY_UPDATED}
      </p>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {PRIVACY_POLICY_PILLARS.map((pillar) => (
            <div key={pillar.key} className="rounded-2xl border border-indigo-100 bg-white p-5">
              {PILLAR_ICONS[pillar.key]}
              <h2 className="mt-3 text-sm font-bold text-slate-900">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{pillar.body}</p>
            </div>
          ))}
        </div>

        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <PolicySection key={section.key} title={section.title}>
            {section.paragraphs.map((text, idx) => (
              <p key={idx}>{text}</p>
            ))}
            {section.bullets.length > 0 && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.key === "rights" && (
              <p>
                Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for privacy or data requests.
              </p>
            )}
            {section.key === "children" && (
              <p>
                Reach our team via the <Link href="/contact">contact page</Link> if needed.
              </p>
            )}
            {section.key === "changes" && (
              <p>
                Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or review{" "}
                <Link href="/terms-and-conditions">Terms & Conditions</Link>.
              </p>
            )}
          </PolicySection>
        ))}
      </div>

      <div className="mt-5">
        <SoftNote icon={<LuShieldCheck className="h-5 w-5" />} title={PRIVACY_POLICY_SOFT_NOTE_TITLE}>
          {PRIVACY_POLICY_SOFT_NOTE_BODY}
        </SoftNote>
      </div>
    </PageShell>
  );
}