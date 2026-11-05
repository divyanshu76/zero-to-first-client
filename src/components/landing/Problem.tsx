import { ArrowRight, Check, Minus } from "lucide-react";
import { beforeAfter, painPoints } from "@/data/content";
import { Accent, SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";

export function Problem() {
  return (
    <section id="overview" aria-labelledby="overview-title" className="border-t border-line bg-white py-24 lg:py-32">
      <div className="container-page">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <SectionHeader
            id="overview-title"
            eyebrow="The gap"
            title={
              <>
                Knowing about AI is not the same as <Accent>building a business</Accent> with it.
              </>
            }
            intro="AI tools are within reach of far more people today. But using a tool and selling a paid service are different things. Most people don't get stuck on skill — they get stuck on turning that skill into an offer, finding the right business, writing the first message, setting a price, and knowing what to say when they hear “that's too expensive”."
          />
          <Reveal delay={120}>
            <p className="font-display text-sm font-semibold text-ink">Sound familiar?</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {painPoints.map((p) => (
                <li key={p} className="rounded-2xl border border-line bg-paper px-5 py-4 text-[0.95rem] leading-snug text-ink">
                  <span aria-hidden className="mr-1 font-serif text-xl leading-none text-violet">“</span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h3 className="text-2xl font-bold text-ink sm:text-3xl">A learning journey, not a shortcut</h3>
            <p className="max-w-md text-sm text-ink-2">
              The book teaches a process. It doesn&apos;t promise clients, income or a timeline — it focuses on the parts you control.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <Reveal className="rounded-3xl border border-line bg-paper p-7 sm:p-9">
              <p className="eyebrow !text-ink-2">Before</p>
              <ul className="mt-6 space-y-5">
                {beforeAfter.before.map((b) => (
                  <li key={b.title} className="flex gap-4">
                    <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-2">
                      <Minus className="size-3.5" />
                    </span>
                    <div>
                      <p className="font-display font-semibold text-ink">{b.title}</p>
                      <p className="mt-1 text-[0.93rem] leading-relaxed text-ink-2">{b.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <div aria-hidden className="hidden items-center justify-center lg:flex">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-violet text-white shadow-lg shadow-violet/30">
                <ArrowRight className="size-5" />
              </span>
            </div>

            <Reveal delay={120} className="rounded-3xl bg-ink p-7 text-white sm:p-9">
              <p className="eyebrow !text-[#c4b0f5]">After learning and applying the guide</p>
              <ul className="mt-6 space-y-5">
                {beforeAfter.after.map((b) => (
                  <li key={b.title} className="flex gap-4">
                    <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-violet text-white">
                      <Check className="size-3.5" />
                    </span>
                    <div>
                      <p className="font-display font-semibold">{b.title}</p>
                      <p className="mt-1 text-[0.93rem] leading-relaxed text-white/70">{b.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
