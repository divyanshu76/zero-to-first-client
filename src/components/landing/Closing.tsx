"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { brand, formatPrice, pricing, product } from "@/data/product";
import { contactPath, policyPaths } from "@/data/content";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { localePath, type Locale } from "@/i18n/config";
import { Wordmark } from "@/components/ui/BookMockup";
import { BuyButton, type BuyStrings } from "@/components/ui/BuyButton";
import { Reveal } from "@/components/ui/Reveal";
import { BookShowcase } from "./BookShowcase";

export function FinalCta({ t, buy, book }: { t: Dictionary["final"]; buy: BuyStrings; book: Dictionary["book"] }) {
  return (
    <section aria-labelledby="final-title" className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink text-white sm:rounded-[2.5rem]">
        <div aria-hidden className="absolute -top-40 -right-40 size-[34rem] rounded-full bg-violet/25 blur-3xl" />
        <div className="container-page relative grid items-center gap-8 py-12 lg:grid-cols-[1.3fr_0.7fr] lg:py-14">
          <Reveal>
            <h2 id="final-title" className="text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.04] font-extrabold">{t.title}</h2>
            <p className="mt-4 max-w-lg text-lg text-white/70">{t.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <BuyButton label={t.cta} notice={buy.notice} redirecting={buy.redirecting} checkout={buy.checkout} variant="light" />
              {pricing.INR.amount !== null ? (
                <p className="text-sm text-white/70">
                  <span className="font-semibold text-white">{formatPrice(pricing.INR.amount, "INR")}</span> {t.launchPrice}
                </p>
              ) : null}
            </div>
          </Reveal>
          <BookShowcase variant="footer" labels={book} dark />
        </div>
      </div>
    </section>
  );
}

export function Footer({ t, names, locale }: { t: Dictionary["footer"]; names: Dictionary["policyNames"]; locale: Locale }) {
  const href = (path: string) => localePath(locale, path);
  return (
    <footer className="pt-12 pb-28 sm:pb-10">
      <div className="container-page">
        <div className="grid gap-8 border-b border-line pb-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-3 text-[0.92rem] text-ink">
              <span className="font-display font-bold">{product.name}</span> — {t.productLine}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {t.soldBy}
              <a href={brand.publisherUrl} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex items-center gap-0.5 text-ink">
                {brand.publisher} <ArrowUpRight aria-hidden className="size-3" />
              </a>
            </p>
          </div>
          <nav aria-label={t.support}>
            <p className="text-sm font-semibold text-ink">{t.support}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href={href(contactPath)} className="link-underline text-ink-2 hover:text-ink">{t.contact}</Link></li>
              <li><a href="#faq" className="link-underline text-ink-2 hover:text-ink">{t.faq}</a></li>
              <li><a href="#pricing" className="link-underline text-ink-2 hover:text-ink">{t.pricing}</a></li>
            </ul>
          </nav>
          <nav aria-label={t.policies}>
            <p className="text-sm font-semibold text-ink">{t.policies}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {policyPaths.map((l) => (
                <li key={l.path}><Link href={href(l.path)} className="link-underline text-ink-2 hover:text-ink">{names[l.key]}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-2 pt-6 text-xs leading-relaxed text-ink-2 md:flex-row md:justify-between">
          <p>© 2026 {brand.publisher}. {t.rights}</p>
          <p className="max-w-xl md:text-right">{t.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}

/** Compact purchase bar on phones: shown after the hero, hidden near pricing. */
export function MobileStickyCta({ t }: { t: Dictionary["sticky"] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const pricingEl = document.getElementById("pricing");
    let pastHero = false;
    let nearPricing = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting;
        if (e.target === pricingEl) nearPricing = e.isIntersecting;
      }
      setVisible(pastHero && !nearPricing);
    });
    if (hero) io.observe(hero);
    if (pricingEl) io.observe(pricingEl);
    return () => io.disconnect();
  }, []);

  const inr = pricing.INR;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${visible ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-ink">{t.title}</p>
          {inr.amount !== null ? (
            <p className="text-xs text-ink-2">
              <span className="font-semibold text-ink">{formatPrice(inr.amount, "INR")}</span>
              {inr.compareAt && inr.compareAt > inr.amount ? <> · <s>{formatPrice(inr.compareAt, "INR")}</s></> : null}
            </p>
          ) : null}
        </div>
        <a href="#pricing" className="press inline-flex h-11 shrink-0 items-center rounded-full bg-violet px-5 font-display text-sm font-semibold text-white">
          {t.cta}
        </a>
      </div>
    </div>
  );
}
