"use client";

import { useState } from "react";
import { Check, ChevronDown, ShieldCheck, Store } from "lucide-react";
import { deliveryLive, discountPercent, formatPrice, isPurchasable, pricing, product, type CurrencyCode } from "@/data/product";
import { deliverableFiles } from "@/data/resources";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fmt, localePath, type Locale } from "@/i18n/config";
import { BuyButton, type BuyStrings } from "@/components/ui/BuyButton";
import { Reveal } from "@/components/ui/Reveal";
import { BookShowcase } from "./BookShowcase";

export function Pricing({ t, buy, book, locale }: { t: Dictionary["pricing"]; buy: BuyStrings; book: Dictionary["book"]; locale: Locale }) {
  const available = (Object.keys(pricing) as CurrencyCode[]).filter((c) => pricing[c].amount !== null);
  const [currency, setCurrency] = useState<CurrencyCode>(available[0] ?? "INR");
  const p = pricing[currency];
  const off = discountPercent(p);
  const live = isPurchasable(p);
  const href = (path: string) => localePath(locale, path);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16 border-t border-line bg-white py-16 lg:py-20">
      <div className="container-page">
        <Reveal className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-paper shadow-[0_40px_80px_-56px_rgb(17_17_19/0.55)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative flex items-center justify-center bg-paper-2 px-4 py-6 lg:py-8">
            <BookShowcase variant="pricing" labels={book} />
          </div>

          <div className="min-w-0 p-6 sm:p-10">
            <h2 id="pricing-title" className="text-[clamp(1.6rem,3vw,2.1rem)] leading-tight font-extrabold text-ink">{product.name}</h2>
            <p className="mt-1 text-ink-2">{t.subtitle}</p>

            {available.length > 1 ? (
              <div role="group" aria-label={t.currencyLabel} className="mt-5 inline-flex rounded-full border border-line bg-white p-1">
                {available.map((c) => (
                  <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}
                    className={`press rounded-full px-4 py-1.5 text-sm font-semibold ${currency === c ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}>
                    {c === "INR" ? "₹ INR" : "$ USD"}
                  </button>
                ))}
              </div>
            ) : null}

            {p.amount !== null ? (
              <div className="mt-6" aria-live="polite">
                <p className="inline-flex items-center rounded-full bg-violet-soft px-3 py-1 text-[0.8rem] font-semibold text-violet">
                  {t.offerLabel}
                  {off ? ` · ${fmt(t.off, { n: off })}` : ""}
                </p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-5xl font-extrabold text-ink tabular-nums">{formatPrice(p.amount, p.currency)}</span>
                  {p.compareAt && p.compareAt > p.amount ? (
                    <span className="text-ink-2">
                      {t.regular} <s className="text-lg">{formatPrice(p.compareAt, p.currency)}</s>
                    </span>
                  ) : null}
                </p>
                {p.note ? <p className="mt-1 text-sm text-ink-2">{p.note}</p> : null}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-4 font-display font-bold text-ink">{t.soon}</p>
            )}

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {t.included.map((i) => (
                <li key={i} className="flex gap-2.5 text-[0.93rem] leading-snug text-ink">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <BuyButton label={t.cta} notice={buy.notice} redirecting={buy.redirecting} checkout={buy.checkout} currency={currency} className="w-full sm:w-auto" />
            </div>

            {/* One grid for both rows: icons share a column, texts share one left edge, icons align to the first line. */}
            <div className="mt-5 grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2.5 gap-y-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-[0.85rem] leading-relaxed">
              <ShieldCheck aria-hidden className="mt-[0.2rem] size-4 text-violet" />
              <p className="text-ink">
                {live && deliveryLive ? t.checkoutLiveDelivered : live ? t.checkoutLive : t.checkoutClosed}
              </p>
              <Store aria-hidden className="mt-[0.2rem] size-4 text-ink-2" />
              <p className="text-ink-2">
                <span className="block">{t.attribution}</span>
                <span className="block">
                  {t.policiesBefore}
                  <a href={href("/delivery")} className="link-underline font-semibold text-ink">{t.policiesDelivery}</a>
                  {t.policiesComma}
                  <a href={href("/refund")} className="link-underline font-semibold text-ink">{t.policiesRefund}</a>
                  {t.policiesAnd}
                  <a href={href("/terms")} className="link-underline font-semibold text-ink">{t.policiesTerms}</a>
                  {t.policiesAfter}
                </span>
              </p>
            </div>

            <details className="group mt-6 border-t border-line pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-[0.95rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {t.filesTitle}
                <ChevronDown aria-hidden className="size-4 text-ink-2 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-3 divide-y divide-line">
                {t.files.map((d, i) => (
                  <li key={d.title} className="py-2.5">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9rem]">
                      <span className="font-semibold text-ink">{d.title}</span>
                      <span className="text-[0.75rem] text-ink-2">{d.format}</span>
                    </p>
                    <p lang="en" className="mt-0.5 font-mono text-[0.72rem] break-all text-ink-2">{deliverableFiles[i]}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.78rem] text-ink-2">{t.license}</p>
            </details>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
