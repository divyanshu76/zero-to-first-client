"use client";

import { useState } from "react";
import { Plus, Target, Wrench, Flag } from "lucide-react";
import { chapters, stages } from "@/data/chapters";

export function ChapterList() {
  const [open, setOpen] = useState<number[]>([]);
  const allOpen = open.length === chapters.length;
  const toggle = (n: number) => setOpen((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-ink sm:text-2xl">All ten chapters</h3>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? [] : chapters.map((c) => c.number))}
          className="press shrink-0 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink hover:border-ink hover:bg-white"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-8">
        {stages.map((stage) => (
          <div key={stage.id}>
            <div className="mb-1 flex items-baseline gap-3 border-b border-ink pb-2.5">
              <span className="font-display text-[0.8rem] font-bold text-violet">{stage.label}</span>
              <h4 className="font-display text-base font-bold text-ink">{stage.title}</h4>
            </div>
            <ul className="divide-y divide-line">
              {chapters
                .filter((c) => c.stage === stage.id)
                .map((c) => {
                  const isOpen = open.includes(c.number);
                  const panelId = `chapter-panel-${c.number}`;
                  const btnId = `chapter-btn-${c.number}`;
                  return (
                    <li key={c.number}>
                      <h5>
                        <button
                          id={btnId}
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggle(c.number)}
                          className="group grid w-full grid-cols-[3.25rem_1fr_auto] items-start gap-4 py-4 text-left sm:grid-cols-[4.5rem_1fr_auto] sm:gap-6"
                        >
                          <span className={`font-display text-3xl leading-none font-extrabold tabular-nums transition-colors sm:text-[2.2rem] ${isOpen ? "text-violet" : "text-[#8a857c] group-hover:text-ink-2"}`}>
                            {String(c.number).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-display text-lg font-bold text-ink sm:text-xl">{c.title}</span>
                            <span className="mt-1.5 block text-[0.95rem] leading-snug text-ink-2">{c.hook}</span>
                          </span>
                          <span
                            aria-hidden
                            className={`mt-1 inline-flex size-9 items-center justify-center rounded-full border transition-all duration-300 ${
                              isOpen ? "rotate-45 border-violet bg-violet text-white" : "border-line-strong text-ink group-hover:border-ink"
                            }`}
                          >
                            <Plus className="size-4" />
                          </span>
                        </button>
                      </h5>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={btnId}
                        className={`grid transition-[grid-template-rows] duration-500 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className="overflow-hidden" inert={!isOpen}>
                          <div className="grid gap-8 pb-7 sm:pl-[6rem] lg:grid-cols-[1.25fr_1fr] lg:gap-12">
                            <div>
                              <p className="text-[1.02rem] leading-relaxed text-ink">{c.summary}</p>
                              <p className="mt-6 font-display text-sm font-bold text-ink">What you&apos;ll learn</p>
                              <ul className="mt-3 space-y-2.5">
                                {c.learn.map((l) => (
                                  <li key={l} className="flex gap-3 text-[0.95rem] leading-snug text-ink-2">
                                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-violet" />
                                    {l}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-4">
                              <div className="rounded-2xl bg-paper-2 p-5">
                                <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                                  <Wrench aria-hidden className="size-4 text-violet" /> In practice <span className="font-normal text-ink-2">(hypothetical)</span>
                                </p>
                                <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">{c.application}</p>
                              </div>
                              <div className="rounded-2xl border border-violet/25 bg-violet-soft/60 p-5">
                                <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                                  <Target aria-hidden className="size-4 text-violet" /> What you work towards
                                </p>
                                <p className="mt-2 text-[0.92rem] leading-relaxed text-ink">{c.outcome}</p>
                              </div>
                              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-ink-2">
                                <Flag aria-hidden className="size-3.5 text-violet" />
                                <span>Starts p. {c.page}</span>
                                <span aria-hidden>·</span>
                                <span>{c.prompts}</span>
                                <span aria-hidden>·</span>
                                <span>{c.figures.length === 1 ? `Figure ${c.figures[0]}` : `Figures ${c.figures[0]}–${c.figures[c.figures.length - 1]}`}</span>
                              </p>
                              <details className="group/d text-[0.85rem]">
                                <summary className="cursor-pointer list-none font-semibold text-violet [&::-webkit-details-marker]:hidden">
                                  <span className="group-open/d:hidden">Show all {c.sections.length} sections</span>
                                  <span className="hidden group-open/d:inline">Hide sections</span>
                                </summary>
                                <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink-2">
                                  {c.sections.map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ol>
                              </details>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
