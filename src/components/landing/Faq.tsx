"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { faqs } from "@/data/faq";
import { Accent, SectionHeader } from "@/components/ui/SectionHeader";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 lg:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            id="faq-title"
            eyebrow="FAQ"
            title={<>Questions, <Accent>answered</Accent> straight.</>}
            intro="Answers come from the book itself. Where something hasn't been decided yet — like pricing or refunds — we say so."
          />
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q}>
                <h3>
                  <button
                    type="button"
                    id={`faq-btn-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-start justify-between gap-6 py-5 text-left"
                  >
                    <span className={`font-display text-[1.05rem] font-semibold transition-colors sm:text-lg ${isOpen ? "text-violet" : "text-ink"}`}>{f.q}</span>
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isOpen ? "rotate-45 border-violet bg-violet text-white" : "border-line-strong text-ink group-hover:border-ink"
                      }`}
                    >
                      <Plus className="size-3.5" />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  className={`grid transition-[grid-template-rows] duration-400 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden" inert={!isOpen}>
                    <p className="max-w-2xl pb-6 text-[0.97rem] leading-relaxed text-ink-2">{f.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
