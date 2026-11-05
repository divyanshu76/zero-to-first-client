"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { product } from "@/data/product";
import { BookMockup, Wordmark } from "@/components/ui/BookMockup";
import { BuyButton } from "@/components/ui/BuyButton";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink text-white sm:rounded-[2.5rem]">
        <div aria-hidden className="absolute -top-40 -right-40 size-[36rem] rounded-full bg-violet/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-56 -left-32 size-[30rem] rounded-full bg-violet-deep/20 blur-3xl" />
        <div className="container-page relative grid items-center gap-14 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
          <Reveal>
            <p className="eyebrow !text-[#c4b0f5]">Your next step</p>
            <h2 id="final-title" className="mt-5 text-[2.3rem] leading-[1.03] font-extrabold sm:text-[3.3rem] lg:text-[4rem]">
              Your first client journey starts with your <span className="font-serif font-normal tracking-normal text-[#c4b0f5] italic">next step.</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg text-white/70">Learn the process. Build a practical offer. Start taking action.</p>
            <div className="mt-10">
              <BuyButton label="Get the 2026 Starter Kit" variant="light" />
            </div>
          </Reveal>
          <div className="mx-auto w-full max-w-[17rem] sm:max-w-[19rem]">
            <BookMockup sizes="300px" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const links = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms and Conditions" },
    { href: "/refund", label: "Refund Policy" },
  ];
  return (
    <footer className="pt-16 pb-28 sm:pb-12">
      <div className="container-page">
        <div className="grid gap-10 border-b border-line pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 font-display text-lg font-bold text-ink">{product.name}</p>
            <p className="text-sm text-ink-2">{product.subtitle} · {product.edition}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-ink-2 uppercase">Publisher</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href={product.publisherUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink hover:text-violet">
                  deadcode.space <ArrowUpRight aria-hidden className="size-3.5" />
                </a>
              </li>
              <li>
                <a href={product.contactUrl} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-violet">Contact</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-ink-2 uppercase">Legal</p>
            <ul className="mt-4 space-y-2 text-sm">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-ink hover:text-violet">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-8 text-xs leading-relaxed text-ink-2 md:flex-row md:justify-between">
          <p>© 2026 {product.publisher}. All rights reserved. {product.edition}, {product.editionNumber}.</p>
          <p className="max-w-xl md:text-right">
            Educational content only — not legal, tax or investment advice. No guarantee of clients, income or results.
            Product names mentioned in the book belong to their owners; no endorsement is implied.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Compact purchase bar on phones, shown after the hero and hidden near the pricing section. */
export function MobileStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const pricing = document.getElementById("pricing");
    let pastHero = false;
    let nearPricing = false;
    const update = () => setVisible(pastHero && !nearPricing);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting;
        if (e.target === pricing) nearPricing = e.isIntersecting;
      }
      update();
    });
    if (hero) io.observe(hero);
    if (pricing) io.observe(pricing);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-ink">Zero to First Client</p>
          <p className="text-xs text-ink-2">2026 Edition · 10 chapters</p>
        </div>
        <a href="#pricing" className="inline-flex h-11 shrink-0 items-center rounded-full bg-violet px-5 font-display text-sm font-semibold text-white">
          Get the Ebook
        </a>
      </div>
    </div>
  );
}
