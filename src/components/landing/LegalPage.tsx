import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { brand, support } from "@/data/product";
import { contactPath, policyPaths } from "@/data/content";
import { getDictionary, fmt, localePath, type Locale } from "@/i18n";
import { Wordmark } from "@/components/ui/BookMockup";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Set once a qualified Indian legal professional has reviewed the policy text. */
const legalReviewed = process.env.NEXT_PUBLIC_LEGAL_REVIEWED === "true";
export const POLICY_UPDATED: Record<Locale, string> = { en: "6 November 2026", hi: "6 नवंबर 2026" };

/** Locale-bound helpers handed to each policy's content. */
export type PolicyHelpers = {
  locale: Locale;
  /** Locale-aware internal link. */
  L: (props: { to: string; children: ReactNode }) => ReactNode;
  /** A business detail that hasn't been supplied; never replaced with invented data. */
  Pending: (props: { children: ReactNode }) => ReactNode;
  SellerIdentity: () => ReactNode;
  SupportContact: () => ReactNode;
};

export function policyHelpers(locale: Locale): PolicyHelpers {
  const t = getDictionary(locale).legal;
  const L: PolicyHelpers["L"] = ({ to, children }) => <Link href={localePath(locale, to)}>{children}</Link>;
  const Pending: PolicyHelpers["Pending"] = ({ children }) => (
    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.92em] font-medium text-amber-900">
      {children}
      {t.pendingSuffix}
    </span>
  );
  const SellerIdentity = () => (
    <>
      {t.sellerIdentity}
      {brand.legalEntity ?? <Pending>{t.legalNamePending}</Pending>}.
    </>
  );
  const SupportContact = () =>
    support.email ? (
      <a href={`mailto:${support.email}`}>{support.email}</a>
    ) : (
      <>
        <Pending>{t.supportEmailPending}</Pending>
        {t.supportFallbackBefore}
        <L to={contactPath}>{t.supportFallbackLink}</L>
        {t.supportFallbackAfter}
      </>
    );
  return { locale, L, Pending, SellerIdentity, SupportContact };
}

export function LegalPage({ locale, title, summary, children, updated }: { locale: Locale; title: string; summary: ReactNode; children: ReactNode; updated?: string }) {
  const dict = getDictionary(locale);
  const t = dict.legal;
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link href={localePath(locale, "/")} aria-label={dict.a11y.home}><Wordmark /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} label={dict.language.label} />
            <Link href={localePath(locale, "/")} className="link-underline hidden items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink sm:inline-flex">
              <ArrowLeft aria-hidden className="size-4" /> {t.back}
            </Link>
          </div>
        </div>
      </header>
      <main className="container-page max-w-3xl py-12 lg:py-16">
        <h1 className="text-[clamp(2rem,4vw,2.9rem)] font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-2">{fmt(t.updated, { date: updated ?? POLICY_UPDATED[locale] })}</p>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-ink">{summary}</p>
        {!legalReviewed ? (
          <p role="note" className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-4 text-sm leading-relaxed text-ink-2">{t.draft}</p>
        ) : null}
        <div className="legal-prose mt-8 space-y-4 text-[1rem] leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-violet [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
        <nav aria-label={t.other} className="mt-14 border-t border-line pt-6">
          <p className="text-sm font-semibold text-ink">{t.other}</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[...policyPaths, { path: contactPath, key: "contact" as const }].map((l) => (
              <li key={l.path}><Link href={localePath(locale, l.path)} className="link-underline text-ink-2 hover:text-ink">{dict.policyNames[l.key]}</Link></li>
            ))}
          </ul>
        </nav>
        <p className="mt-10 text-xs text-ink-2">{t.copyrightLine}</p>
      </main>
    </div>
  );
}
