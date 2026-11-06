import { getDictionary, type Locale } from "@/i18n";
import { faqItems } from "@/i18n/faq";
import { Navbar, Ticker } from "./Navbar";
import { Hero } from "./Hero";
import { Inside } from "./Inside";
import { Preview } from "./Preview";
import { Audience, HowItHelps, HowItWorks } from "./Sections";
import { Pricing } from "./Pricing";
import { Faq } from "./Faq";
import { FinalCta, Footer, MobileStickyCta } from "./Closing";
import { JsonLd } from "./JsonLd";

/** The landing page, identical in every locale; only the dictionary changes. */
export function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const faqs = faqItems(t.faq);
  const buy = { ...t.buy, checkout: t.checkout };
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        {t.a11y.skip}
      </a>
      <Ticker t={t.ticker} />
      <Navbar t={t.nav} a11y={t.a11y} language={t.language} locale={locale} />
      <main id="main">
        <Hero t={t.hero} stat={t.stats} book={t.book} buy={buy} />
        <Inside t={t.inside} />
        <Preview t={t.preview} />
        <HowItHelps t={t.helps} />
        <Audience t={t.audience} />
        <HowItWorks t={t.roadmap} chapters={t.chapters} />
        <Pricing t={t.pricing} buy={buy} book={t.book} locale={locale} />
        <Faq t={t.faq} items={faqs} locale={locale} />
        <FinalCta t={t.final} buy={buy} book={t.book} />
      </main>
      <Footer t={t.footer} names={t.policyNames} locale={locale} />
      <MobileStickyCta t={t.sticky} />
      <JsonLd locale={locale} title={t.meta.title} description={t.meta.description} faqs={faqs} />
    </>
  );
}
