import { discountPercent, formatPrice, pricing, stats } from "@/data/product";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fmt } from "@/i18n/config";
import { BookShowcase } from "./BookShowcase";
import { BuyButton } from "@/components/ui/BuyButton";
import { CountUp } from "@/components/ui/CountUp";

export function Hero({ t, stat, book, buy }: { t: Dictionary["hero"]; stat: Dictionary["stats"]; book: Dictionary["book"]; buy: Dictionary["buy"] }) {
  const inr = pricing.INR;
  const off = discountPercent(inr);
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden className="paper-grain absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      <div className="container-page relative grid items-center gap-8 pt-8 pb-12 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-10 lg:pb-14">
        <div className="min-w-0">
          <p className="text-[0.9rem] font-medium text-ink-2">{t.kicker}</p>
          <h1 id="hero-title" className="mt-3 text-[clamp(2.5rem,6vw,4.8rem)] leading-[0.98] font-extrabold text-ink">
            {t.titleBefore}
            <span className="font-serif font-normal tracking-normal text-violet italic">{t.titleAccent}</span>
            {t.titleAfter}
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-2 sm:text-lg">{t.description}</p>

          {inr.amount !== null ? (
            <div className="mt-6 inline-flex max-w-full items-stretch overflow-hidden rounded-2xl border border-violet/25 bg-white shadow-[0_14px_34px_-24px_rgb(109_40_217/0.55)]">
              <div className="px-4 py-3 sm:px-5">
                <p className="inline-flex rounded-full bg-violet-soft px-2.5 py-0.5 text-[0.72rem] font-semibold text-violet">{t.offerLabel}</p>
                <p className="mt-1 font-display text-[2.1rem] leading-none font-extrabold text-ink tabular-nums">{formatPrice(inr.amount, "INR")}</p>
              </div>
              {inr.compareAt && inr.compareAt > inr.amount ? (
                <div className="flex flex-col justify-center gap-0.5 border-l border-line bg-paper px-4 py-3 sm:px-5">
                  <p className="text-[0.75rem] text-ink-2">{t.regular}</p>
                  <p className="font-display text-lg font-bold text-ink-2 tabular-nums">
                    <s>{formatPrice(inr.compareAt, "INR")}</s>
                  </p>
                  {off ? <p className="text-[0.75rem] font-semibold text-violet">{fmt(t.off, { n: off })}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <BuyButton label={t.cta} notice={buy.notice} redirecting={buy.redirecting} />
            <a
              href="#preview"
              className="press inline-flex h-14 items-center rounded-full border border-line-strong px-7 font-display font-semibold whitespace-nowrap text-ink hover:border-ink hover:bg-white"
            >
              {t.secondary}
            </a>
          </div>

          <dl aria-label={t.statsLabel} className="mt-8 grid max-w-xl grid-cols-3 gap-x-4 gap-y-4 border-t border-line pt-6 sm:grid-cols-6">
            {stats.map((s) => (
              <div key={s.key} className="flex flex-col-reverse">
                <dt className="text-[0.75rem] leading-tight text-ink-2">{stat[s.key]}</dt>
                <dd className="font-display text-2xl font-extrabold text-ink">
                  <CountUp value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[0.82rem] text-ink-2">{t.attribution}</p>
        </div>

        <div className="relative w-full min-w-0">
          <BookShowcase variant="hero" labels={book} preload />
        </div>
      </div>
    </section>
  );
}
