import { ArrowDown, Languages } from "lucide-react";
import { stats } from "@/data/product";
import { BookMockup } from "@/components/ui/BookMockup";
import { BuyButton } from "@/components/ui/BuyButton";
import { Counter } from "@/components/ui/Counter";

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden className="paper-grain absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="container-page relative grid items-center gap-10 pt-10 pb-20 sm:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pt-20 lg:pb-28">
        <div>
          <p className="eyebrow">The 2026 AI-Powered Business Starter Kit</p>
          <h1 id="hero-title" className="mt-5 text-[2.9rem] leading-[0.98] font-extrabold text-ink sm:text-[4rem] lg:text-[4.6rem] xl:text-[5.1rem]">
            Go From Zero to <span className="font-serif font-normal tracking-normal text-violet italic">Your First</span> Client.
          </h1>
          <p className="mt-6 font-display text-xl font-semibold text-ink sm:text-2xl">
            Learn AI. Build Your Service. Find Your First Paying Client.
          </p>
          <p className="mt-4 max-w-xl text-[1.06rem] leading-relaxed text-ink-2 sm:text-lg">
            A practical, step-by-step guide to understanding AI-powered services, building an offer, creating professional
            deliverables, and learning how to approach potential clients.
          </p>

          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <BuyButton label="Get Instant Access" />
            <a
              href="#inside"
              className="group inline-flex h-14 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-7 font-display font-semibold text-ink transition-colors hover:border-ink hover:bg-white"
            >
              Explore What&apos;s Inside
              <ArrowDown aria-hidden className="size-4 transition-transform group-hover:translate-y-0.5" />
            </a>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-sm text-ink-2">
            <Languages aria-hidden className="size-4 text-violet" />
            A practical business handbook in Hindi and English · Digital PDF
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-x-4 gap-y-6 border-t border-line pt-8 sm:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <Counter value={s.value} className="block font-display text-3xl font-extrabold text-ink tabular-nums sm:text-[2.1rem]" />
                  <span className="mt-1 block text-[0.8rem] leading-tight font-medium text-ink-2">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative order-first mx-auto w-full max-w-[13.5rem] sm:max-w-[22rem] lg:order-none lg:max-w-[27rem]">
          <div aria-hidden className="absolute -inset-x-10 top-[8%] bottom-[2%] -z-0 rounded-[2.5rem] bg-paper-2" />
          <div aria-hidden className="absolute top-[14%] -left-6 hidden h-[72%] w-px bg-line-strong sm:block" />
          <div className="relative px-4 pt-4 pb-8 sm:px-8 sm:pt-6 sm:pb-10">
            <BookMockup preload sizes="(min-width: 1024px) 400px, (min-width: 640px) 360px, 80vw" />
          </div>
          <p className="relative mt-2 hidden text-center sm:block text-[0.78rem] text-ink-2">
            2026 Edition · Edition 1.0 · 142 pages
          </p>
        </div>
      </div>
    </section>
  );
}
