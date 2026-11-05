"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { formatPrice, pricing, product, stats, type CurrencyCode } from "@/data/product";
import { BookMockup } from "@/components/ui/BookMockup";
import { BuyButton } from "@/components/ui/BuyButton";
import { Accent } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";

const included = [
  "The complete 142-page ebook (PDF), 2026 Edition",
  "141 AI prompts — including the 104-prompt library as a separate PDF",
  "20 templates as editable DOCX and XLSX files",
  "BUSINESS_CALCULATORS.xlsx with 7 calculator sheets",
  "24 original diagrams inside the book",
  "Business resource directory (PDF) and printable template collection",
];

export function Pricing() {
  // Only offer currencies that have a configured price; default to INR.
  const available = (Object.keys(pricing) as CurrencyCode[]).filter((c) => pricing[c].amount !== null);
  const [currency, setCurrency] = useState<CurrencyCode>(available[0] ?? "INR");
  const p = pricing[currency];
  const hasDiscount = p.amount !== null && p.compareAt !== null && p.compareAt > p.amount;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="border-t border-line bg-white py-24 lg:py-32">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Get the starter kit</p>
          <h2 id="pricing-title" className="mt-4 text-[2rem] leading-[1.08] font-bold text-ink sm:text-[2.6rem] lg:text-[3.1rem]">
            Everything in <Accent>one</Accent> purchase.
          </h2>
        </Reveal>

        <Reveal delay={80} className="mx-auto mt-14 grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-paper shadow-[0_40px_80px_-50px_rgb(23_23_23/0.5)] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative flex items-center justify-center bg-paper-2 px-10 py-10 lg:py-14">
            <div className="w-full max-w-[10.5rem] lg:max-w-[15rem]">
              <BookMockup float={false} sizes="240px" />
            </div>
          </div>

          <div className="p-8 sm:p-11">
            <p className="font-display text-sm font-semibold text-violet">{product.edition} · {product.editionNumber}</p>
            <h3 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">{product.name}</h3>
            <p className="mt-1 text-ink-2">{product.subtitle}</p>

            {available.length > 1 ? (
              <div role="group" aria-label="Currency" className="mt-7 inline-flex rounded-full border border-line bg-white p-1">
                {available.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={currency === c}
                    onClick={() => setCurrency(c)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${currency === c ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}
                  >
                    {c === "INR" ? "₹ INR" : "$ USD"}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-baseline gap-3" aria-live="polite">
              {p.amount !== null ? (
                <>
                  <span className="font-display text-5xl font-extrabold text-ink tabular-nums">{formatPrice(p.amount, p.currency)}</span>
                  {hasDiscount ? (
                    <span className="text-xl text-ink-2 line-through">
                      <span className="sr-only">Regular price </span>
                      {formatPrice(p.compareAt!, p.currency)}
                    </span>
                  ) : null}
                  {p.note ? <span className="w-full text-sm text-ink-2">{p.note}</span> : null}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-line-strong bg-white px-5 py-4">
                  <p className="font-display text-lg font-bold text-ink">Launch pricing coming soon</p>
                  <p className="mt-1 text-sm text-ink-2">The price and secure checkout will be published here. Nothing can be purchased yet.</p>
                </div>
              )}
            </div>

            <ul className="mt-8 space-y-3">
              {included.map((i) => (
                <li key={i} className="flex gap-3 text-[0.95rem] leading-snug text-ink">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-9">
              <BuyButton label="Get ZERO TO FIRST CLIENT" currency={currency} className="w-full sm:w-auto" />
            </div>

            <dl className="mt-9 grid grid-cols-5 gap-2 border-t border-line pt-6 text-center">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="text-[0.68rem] leading-tight text-ink-2">{s.label}</dt>
                  <dd className="font-display text-lg font-bold text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
