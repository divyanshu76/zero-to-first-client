import { brand, formatPrice, pricing, stats } from "@/data/product";
import { ThreeDEbookShowcase } from "./ThreeDEbookShowcase";
import { BuyButton } from "@/components/ui/BuyButton";

export function Hero() {
  const inr = pricing.INR;
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden className="paper-grain absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      <div className="container-page relative grid items-center gap-8 pt-8 pb-12 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-10 lg:pb-14">
        <div className="min-w-0">
          <p className="text-[0.9rem] font-medium text-ink-2">
            The AI-Powered Business Starter Kit, 2026 Edition
          </p>
          <h1 id="hero-title" className="mt-3 text-[clamp(2.6rem,6.2vw,4.9rem)] leading-[0.98] font-extrabold text-ink">
            Go from zero to <span className="font-serif font-normal tracking-normal text-violet italic">your first</span> client.
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-2 sm:text-lg">
            A practical, step-by-step guide to choosing an AI-assisted service, building an offer, pricing it, and approaching
            your first potential clients. Learn AI. Build your service. Find your first paying client.
          </p>

          <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <BuyButton label="Get instant access" />
            <a
              href="#preview"
              className="press inline-flex h-14 items-center rounded-full border border-line-strong px-7 font-display font-semibold whitespace-nowrap text-ink hover:border-ink hover:bg-white"
            >
              Look inside the book
            </a>
          </div>

          {inr.amount !== null ? (
            <p className="mt-5 text-[0.95rem] text-ink">
              <span className="font-display font-bold">{formatPrice(inr.amount, "INR")}</span>{" "}
              <span className="text-ink-2">launch price</span>
              {inr.compareAt && inr.compareAt > inr.amount ? (
                <>
                  <span className="text-ink-2"> · regular </span>
                  <s className="text-ink-2">{formatPrice(inr.compareAt, "INR")}</s>
                </>
              ) : null}
            </p>
          ) : null}

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-x-4 gap-y-4 border-t border-line pt-6 sm:grid-cols-6">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="text-[0.75rem] leading-tight text-ink-2">{s.label}</dt>
                <dd className="font-display text-2xl font-extrabold text-ink tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[0.82rem] text-ink-2">
            Written in Hindi with English business terms. Published by {brand.publisher}, sold by {brand.seller}.
          </p>
        </div>

        <div className="relative w-full min-w-0">
          <ThreeDEbookShowcase />
        </div>
      </div>
    </section>
  );
}
