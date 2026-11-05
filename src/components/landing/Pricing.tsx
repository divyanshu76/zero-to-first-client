"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import { brand, deliveryLive, discountPercent, formatPrice, isPurchasable, offer, pricing, product, type CurrencyCode } from "@/data/product";
import { deliverables } from "@/data/resources";
import { BuyButton } from "@/components/ui/BuyButton";
import { Reveal } from "@/components/ui/Reveal";

const included = [
  "142-page practical ebook (PDF)",
  "141 AI prompts",
  "20 editable templates (14 Word, 6 Excel)",
  "7 calculator sheets",
  "24 diagrams",
];

export function Pricing() {
  const available = (Object.keys(pricing) as CurrencyCode[]).filter((c) => pricing[c].amount !== null);
  const [currency, setCurrency] = useState<CurrencyCode>(available[0] ?? "INR");
  const p = pricing[currency];
  const off = discountPercent(p);
  const live = isPurchasable(p);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16 border-t border-line bg-white py-16 lg:py-20">
      <div className="container-page">
        <Reveal className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-paper shadow-[0_40px_80px_-56px_rgb(17_17_19/0.55)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative flex items-center justify-center bg-paper-2 px-8 py-10 lg:py-12">
            <div aria-hidden className="absolute top-1/2 left-1/2 size-[70%] -translate-1/2 rounded-full bg-violet/12 blur-3xl" />
            <Image
              src="/images/book/book-3d-open.webp"
              alt="The ZERO TO FIRST CLIENT book open on its spine, showing the cover, the title page and the first interior pages"
              width={979}
              height={1440}
              sizes="(min-width: 1024px) 320px, 224px"
              className="relative h-auto w-full max-w-[14rem] lg:max-w-[20rem]"
            />
          </div>

          <div className="min-w-0 p-7 sm:p-10">
            <h2 id="pricing-title" className="text-[clamp(1.6rem,3vw,2.1rem)] leading-tight font-extrabold text-ink">{product.name}</h2>
            <p className="mt-1 text-ink-2">{product.subtitle} · {product.edition}</p>

            {available.length > 1 ? (
              <div role="group" aria-label="Currency" className="mt-5 inline-flex rounded-full border border-line bg-white p-1">
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
                  {offer.label}{off ? ` · ${off}% off the regular price` : ""}
                </p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-5xl font-extrabold text-ink tabular-nums">{formatPrice(p.amount, p.currency)}</span>
                  {p.compareAt && p.compareAt > p.amount ? (
                    <span className="text-ink-2">
                      {offer.regularLabel} <s className="text-lg">{formatPrice(p.compareAt, p.currency)}</s>
                    </span>
                  ) : null}
                </p>
                {p.note ? <p className="mt-1 text-sm text-ink-2">{p.note}</p> : null}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-4 font-display font-bold text-ink">Pricing coming soon</p>
            )}

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {included.map((i) => (
                <li key={i} className="flex gap-2.5 text-[0.93rem] leading-snug text-ink">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <BuyButton label="Get instant access" currency={currency} className="w-full sm:w-auto" />
            </div>

            <p className="mt-4 flex gap-2 text-[0.84rem] leading-snug text-ink-2">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />
              {live && deliveryLive
                ? "Digital product. Instant access after verified payment."
                : live
                  ? "Payment is processed by a secure payment provider. Files are released only after the payment is verified."
                  : "Checkout isn't open yet. When it opens, files are released only after the payment provider verifies your payment."}
            </p>
            <p className="mt-2 text-[0.8rem] text-ink-2">
              Sold by {brand.seller}, published by {brand.publisher}. Read the{" "}
              <a href="/delivery" className="link-underline font-semibold text-ink">delivery</a>,{" "}
              <a href="/refund" className="link-underline font-semibold text-ink">refund</a> and{" "}
              <a href="/terms" className="link-underline font-semibold text-ink">terms</a> policies before buying.
            </p>

            <details className="group mt-6 border-t border-line pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-[0.95rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                Every file you receive
                <ChevronDown aria-hidden className="size-4 text-ink-2 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-3 divide-y divide-line">
                {deliverables.map((d) => (
                  <li key={d.title} className="py-2.5">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9rem]">
                      <span className="font-semibold text-ink">{d.title}</span>
                      <span className="text-[0.75rem] text-ink-2">{d.format}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[0.72rem] break-all text-ink-2">{d.file}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.78rem] text-ink-2">Templates and calculators are licensed for use in your own business; they can&apos;t be resold.</p>
            </details>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
