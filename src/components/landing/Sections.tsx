import { CircleSlash, Check } from "lucide-react";
import { applications, audience, beforeAfter, differentiators, journey, notFor, painPoints } from "@/data/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { ChapterList } from "./Chapters";

/** Problem → transformation → concrete use cases → why the format works. Formerly four sections. */
export function HowItHelps() {
  return (
    <section id="benefits" aria-labelledby="helps-title" className="border-t border-line bg-white py-16 lg:py-20">
      <div className="container-page">
        <SectionHeader
          id="helps-title"
          title="Knowing AI isn't the same as selling a service with it"
          intro="Most beginners don't get stuck on skill. They get stuck on turning it into an offer, finding the right business, writing the first message and setting a price. The book works through each of those steps."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <Reveal>
            <h3 className="font-display text-sm font-semibold text-ink-2">Sound familiar?</h3>
            <ul className="mt-3 space-y-2">
              {painPoints.map((p) => (
                <li key={p} className="rounded-xl bg-paper px-4 py-3 text-[0.94rem] leading-snug text-ink">
                  “{p}”
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={80}>
            <h3 className="font-display text-sm font-semibold text-ink-2">What changes as you work through it</h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              <div className="hidden grid-cols-2 bg-paper px-5 py-2.5 text-[0.75rem] font-semibold text-ink-2 sm:grid">
                <span>Before</span>
                <span>After applying the guide</span>
              </div>
              <ul className="divide-y divide-line">
                {beforeAfter.map((r) => (
                  <li key={r.before} className="grid gap-1.5 px-5 py-3.5 text-[0.92rem] leading-snug sm:grid-cols-2 sm:gap-6">
                    <span className="text-ink-2"><span className="font-semibold sm:hidden">Before: </span>{r.before}</span>
                    <span className="flex gap-2 text-ink"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />{r.after}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-[0.82rem] text-ink-2">A learning process, not a promised result: the book doesn&apos;t guarantee clients or income.</p>
          </Reveal>
        </div>

        <div className="mt-14">
          <Reveal>
            <h3 className="text-xl font-bold text-ink sm:text-2xl">What you could create with it</h3>
            <p className="mt-1.5 text-[0.95rem] text-ink-2">Based on the book&apos;s own hypothetical scenarios.</p>
          </Reveal>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {applications.map((a, i) => (
              <Reveal as="li" key={a.title} delay={(i % 3) * 50} className="lift rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.78rem] font-semibold text-violet">{a.tag}</span>
                  <span className="text-[0.72rem] text-ink-2">{a.chapters}</span>
                </div>
                <h4 className="mt-1.5 font-display text-[1.05rem] font-bold text-ink">{a.title}</h4>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-2">{a.output}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <ul className="mt-14 grid gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map((d) => (
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

export function Audience() {
  return (
    <section aria-labelledby="audience-title" className="py-16 lg:py-20">
      <div className="container-page grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div className="min-w-0">
          <SectionHeader id="audience-title" title="Who it's for" intro="Written for people starting from zero: no service, no portfolio, no clients yet." />
          <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {audience.map((a) => (
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
          <h3 className="text-xl font-bold text-ink">Who it isn&apos;t for</h3>
          <ul className="mt-4 space-y-3">
            {notFor.map((n) => (
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

/** The six-step roadmap, then every chapter in an accordion. Formerly two sections. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="border-t border-line bg-white py-16 lg:py-20">
      <div className="container-page">
        <SectionHeader
          id="how-title"
          title="How it works"
          intro="Ten chapters in four stages. Read them in order the first time: each chapter's output feeds the next."
        />
        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-6">
          {journey.map((j, i) => (
            <li key={j.step} className="bg-white p-5">
              <span className="inline-flex size-7 items-center justify-center rounded-full border border-violet font-display text-xs font-bold text-violet">{i + 1}</span>
              <h3 className="mt-3 font-display text-base font-bold text-ink">{j.step}</h3>
              <p className="text-[0.72rem] font-semibold text-violet">{j.chapters}</p>
              <p className="mt-1.5 text-[0.86rem] leading-snug text-ink-2">{j.body}</p>
            </li>
          ))}
        </ol>

        <div id="chapters" className="mt-12 scroll-mt-20">
          <ChapterList />
        </div>
      </div>
    </section>
  );
}
