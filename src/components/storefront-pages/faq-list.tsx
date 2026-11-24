import Link from "next/link";
import { LuPlus } from "react-icons/lu";
import { FAQ_GROUPS, SUPPORT_EMAIL } from "../../lib/constants";
import styles from "./storefront-pages.module.css";

function Answer({ value }: { value: string }) {
  // Static content only; no untrusted HTML rendering.
  return <p>{value}</p>;
}

export function FaqList() {
  return (
    <div className="space-y-7">
      {FAQ_GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2 className="mb-4 px-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {group.title}
          </h2>
          <div className="space-y-3">
            {group.items.map((item) => (
              <details
                key={item.q}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(37,55,91,.035)] open:border-indigo-200 open:shadow-[0_14px_38px_rgba(99,102,241,.08)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-[19px] text-sm font-semibold text-slate-900 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:px-6 sm:text-base [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                    <LuPlus
                      className={`${styles.faqIcon} h-4 w-4`}
                      aria-hidden="true"
                    />
                  </span>
                </summary>
                <div className={styles.faqContent}>
                  <div className={styles.faqInner}>
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-7 text-slate-600 sm:px-6">
                      <Answer value={item.a} />
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
      <div className="rounded-2xl bg-indigo-50 px-5 py-5 text-sm leading-7 text-slate-700 sm:px-7">
        Still have questions?{" "}
        <Link
          href="/contact"
          className="font-bold text-indigo-700 hover:underline"
          prefetch={false}
        >
          Send us a message
        </Link>{" "}
        or email{" "}
        <a
          className="font-bold text-indigo-700 hover:underline"
          href={`mailto:${SUPPORT_EMAIL}`}
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
