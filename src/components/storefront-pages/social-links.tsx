import { LuArrowUpRight } from "react-icons/lu";
import { footer_social_links } from "@/lib/constants";
import { SOCIAL_ICONS as SOCIAL } from "@/lib/constants";
/** Do not send customers to starter/example accounts. Replace placeholders in src/lib/constants.ts. */
function isConfiguredSocialUrl(link: string) {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && !/your-store|example|placeholder/i.test(url.pathname);
  } catch { return false; }
}

export function SocialLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {footer_social_links.map((social) => {
        const definition = SOCIAL[social.name.toLowerCase()];
        if (!definition) return null;
        const { Icon, style } = definition;
        const configured = isConfiguredSocialUrl(social.link);
        const inner = (
          <>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${style}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold text-slate-800">{social.name}</span>
              <span className="block text-[11px] text-slate-500">{configured ? "Follow us" : "Link coming soon"}</span>
            </span>
            {configured && <LuArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-400" />}
          </>
        );
        const sharedClass = "flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_20px_rgba(15,23,42,.025)] transition";
        return configured ? (
          <a key={social.name} href={social.link} target="_blank" rel="noopener noreferrer" aria-label={`Visit Anoosha Store on ${social.name}`} className={`${sharedClass} hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md`}>
            {inner}
          </a>
        ) : (
          <div key={social.name} className={sharedClass} title="Official account link has not been configured yet">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
