import type { Metadata } from "next";
import Link from "next/link";
import { support } from "@/data/product";
import { contactPath } from "@/data/content";
import { getDictionary, localePath, type Locale } from "@/i18n";
import { Wordmark } from "@/components/ui/BookMockup";
import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher";
import { PurchaseStatus } from "./PurchaseStatus";

/** /purchase/success and /hi/purchase/success. Never indexed; contents depend on the backend's answer. */
export function PurchasePage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.purchase;
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link href={localePath(locale, "/")} aria-label={dict.a11y.home}><Wordmark /></Link>
          <LanguageSwitcher locale={locale} label={dict.language.label} />
        </div>
      </header>
      <main className="container-page max-w-2xl py-12 lg:py-16">
        <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold text-ink">{t.title}</h1>
        <div className="mt-8">
          <PurchaseStatus t={t} locale={locale} supportHref={support.email ? `mailto:${support.email}` : localePath(locale, contactPath)} />
        </div>
      </main>
    </div>
  );
}

export function purchaseMetadata(locale: Locale): Metadata {
  return { title: getDictionary(locale).purchase.metaTitle, robots: { index: false, follow: false } };
}
