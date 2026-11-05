import { BookMarked, CircleSlash, Check, Compass, Layers, Search, Send, Sparkles, Target } from "lucide-react";
import { applicationChapters } from "@/data/content";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { ChapterList } from "./Chapters";

/** Problem → transformation → concrete use cases → why the format works. */
export function HowItHelps({ t }: { t: Dictionary["helps"] }) {
  return (
    <section id="benefits" aria-labelledby="helps-title" className="border-t border-line bg-white py-16 lg:py-20">
      <div className="container-page">
        <SectionHeader id="helps-title" title={t.title} intro={t.intro} />

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <Reveal>
            <h3 className="font-display text-sm font-semibold text-ink-2">{t.soundFamiliar}</h3>
            <ul className="mt-3 space-y-2">
              {t.painPoints.map((p) => (
                <li key={p} className="rounded-xl bg-paper px-4 py-3 text-[0.94rem] leading-snug text-ink">“{p}”</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={80}>
            <h3 className="font-display text-sm font-semibold text-ink-2">{t.changesTitle}</h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              <div className="hidden grid-cols-2 bg-paper px-5 py-2.5 text-[0.75rem] font-semibold text-ink-2 sm:grid">
                <span>{t.before}</span>
                <span>{t.after}</span>
              </div>
              <ul className="divide-y divide-line">
                {t.rows.map((r) => (
                  <li key={r.before} className="grid gap-1.5 px-5 py-3.5 text-[0.92rem] leading-snug sm:grid-cols-2 sm:gap-6">
                    <span className="text-ink-2"><span className="font-semibold sm:hidden">{t.beforePrefix}</span>{r.before}</span>
                    <span className="flex gap-2 text-ink"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />{r.after}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-[0.82rem] text-ink-2">{t.note}</p>
          </Reveal>
        </div>

        <div className="mt-14">
          <Reveal>
            <h3 className="text-xl font-bold text-ink sm:text-2xl">{t.createTitle}</h3>
            <p className="mt-1.5 text-[0.95rem] text-ink-2">{t.createIntro}</p>
          </Reveal>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.applications.map((a, i) => (
              <Reveal as="li" key={a.title} delay={(i % 3) * 50} className="lift rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.78rem] font-semibold text-violet">{a.tag}</span>
                  <span className="text-[0.72rem] text-ink-2">{applicationChapters[i]}</span>
                </div>
                <h4 className="mt-1.5 font-display text-[1.05rem] font-bold text-ink">{a.title}</h4>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-2">{a.output}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <ul className="mt-14 grid gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {t.differentiators.map((d) => (
            <li key={d.title}>
              <h3 className="font-display text-[1rem] font-bold text-ink">{d.title}</h3>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-2">{d.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Audience({ t }: { t: Dictionary["audience"] }) {
  return (
    <section aria-labelledby="audience-title" className="py-16 lg:py-20">
      <div className="container-page grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div className="min-w-0">
          <SectionHeader id="audience-title" title={t.title} intro={t.intro} />
          <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {t.items.map((a) => (
              <li key={a.title} className="border-t border-line-strong pt-4">
                <p className="flex items-center gap-2 font-display font-bold text-ink">
                  <Check aria-hidden className="size-4 text-violet" />
                  {a.title}
                </p>
                <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-2">{a.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <Reveal delay={80} className="self-start rounded-3xl border border-line-strong bg-paper-2/60 p-6 sm:p-8 lg:mt-12">
          <h3 className="text-xl font-bold text-ink">{t.notForTitle}</h3>
          <ul className="mt-4 space-y-3">
            {t.notFor.map((n) => (
              <li key={n} className="flex gap-3 text-[0.93rem] leading-snug text-ink">
                <CircleSlash aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-2" />
                {n}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

const STEP_ICONS = [Sparkles, Compass, Layers, BookMarked, Search, Send] as const;

/**
 * The book's actual progression in six steps, each tied to its source chapters, the kit
 * resources it uses and the concrete output, followed by every chapter in an accordion.
 */
export function HowItWorks({ t, chapters }: { t: Dictionary["roadmap"]; chapters: Dictionary["chapters"] }) {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-t border-line bg-white py-16 lg:py-20">
      <div className="container-page">
        <SectionHeader id="how-title" title={t.title} intro={t.intro} />

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Reveal as="li" key={s.title} delay={(i % 3) * 60} className="lift relative flex flex-col rounded-2xl border border-line bg-paper p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-violet text-white">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="font-display text-[0.78rem] font-bold text-violet tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 font-display text-lg leading-snug font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">{s.body}</p>
                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.82rem] leading-snug">
                  <div>
                    <dt className="font-semibold text-ink">{t.chaptersLabel}</dt>
                    <dd className="text-ink-2">{s.chapters}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">{t.usesLabel}</dt>
                    <dd className="text-ink-2">{s.uses}</dd>
                  </div>
                  <div className="rounded-xl bg-violet-soft/60 px-3 py-2">
                    <dt className="flex items-center gap-1.5 font-semibold text-ink">
                      <Target aria-hidden className="size-3.5 shrink-0 text-violet" />
                      {t.outcomeLabel}
                    </dt>
                    <dd className="text-ink">{s.outcome}</dd>
                  </div>
                </dl>
              </Reveal>
            );
          })}
        </ol>

        <div id="chapters" className="mt-14 scroll-mt-20">
          <ChapterList t={chapters} />
        </div>
      </div>
    </section>
  );
}
