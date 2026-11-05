import { ArrowUpRight, Check, CircleSlash, Package } from "lucide-react";
import { applications, audience, differentiators, journey, notFor, outcomes } from "@/data/content";
import { deliverables } from "@/data/resources";
import { chapters } from "@/data/chapters";
import { product } from "@/data/product";
import { Accent, SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { ChapterList } from "./Chapters";

export function ChaptersSection() {
  return (
    <section id="chapters" aria-labelledby="chapters-title" className="border-t border-line bg-white py-24 lg:py-32">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHeader
            id="chapters-title"
            eyebrow="Chapter by chapter"
            title={<>Ten chapters. <Accent>One system</Accent> you build as you read.</>}
            intro="Read them in order the first time — each chapter's output feeds the next. Open any chapter to see what it covers and what you'll have made by the end of it."
          />
          <Reveal className="text-sm text-ink-2 lg:text-right">
            <p><span className="font-display text-2xl font-bold text-ink">{chapters.length}</span> chapters</p>
            <p>4 stages · 4 bonus sections</p>
          </Reveal>
        </div>
        <div className="mt-14">
          <ChapterList />
        </div>
      </div>
    </section>
  );
}

export function Applications() {
  return (
    <section id="benefits" aria-labelledby="apply-title" className="py-24 lg:py-32">
      <div className="container-page">
        <SectionHeader
          id="apply-title"
          eyebrow="Real-life applications"
          title={<>How can you <Accent>apply</Accent> what you learn?</>}
          intro="Scenarios built from the book's own examples. They show how the material turns into something concrete you could put in front of a potential client — not a promise that the client will say yes."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {applications.map((a, i) => (
            <Reveal key={a.title} delay={(i % 3) * 70} as="article" className="group flex flex-col rounded-[1.75rem] border border-line bg-white p-7 transition-shadow hover:shadow-[0_20px_50px_-30px_rgb(23_23_23/0.35)]">
              <span className="self-start rounded-full bg-paper-2 px-3 py-1 text-[0.72rem] font-semibold tracking-wide text-ink-2 uppercase">{a.tag}</span>
              <h3 className="mt-5 text-xl font-bold text-ink">{a.title}</h3>
              <dl className="mt-5 flex-1 space-y-4 text-[0.92rem] leading-relaxed">
                <div>
                  <dt className="font-display text-xs font-bold tracking-[0.12em] text-ink-2 uppercase">The problem</dt>
                  <dd className="mt-1 text-ink">{a.problem}</dd>
                </div>
                <div>
                  <dt className="font-display text-xs font-bold tracking-[0.12em] text-ink-2 uppercase">How you&apos;d apply the book</dt>
                  <dd className="mt-1 text-ink-2">{a.apply}</dd>
                </div>
                <div className="rounded-2xl bg-violet-soft/70 p-4">
                  <dt className="font-display text-xs font-bold tracking-[0.12em] text-violet uppercase">What you create</dt>
                  <dd className="mt-1 text-ink">{a.output}</dd>
                </div>
                <div>
                  <dt className="font-display text-xs font-bold tracking-[0.12em] text-ink-2 uppercase">Why it could help the client</dt>
                  <dd className="mt-1 text-ink-2">{a.why}</dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-2">All people, businesses and numbers in the book&apos;s examples are hypothetical unless a source is stated.</p>
      </div>
    </section>
  );
}

export function Audience() {
  return (
    <section aria-labelledby="audience-title" className="border-t border-line bg-paper-2 py-24 lg:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <SectionHeader id="audience-title" eyebrow="Who it's for" title={<>Written for people <Accent>starting from zero.</Accent></>} />
          <ul className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {audience.map((a, i) => (
              <Reveal as="li" key={a.title} delay={(i % 2) * 70} className="border-t border-line-strong pt-5">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <Check aria-hidden className="size-4 text-violet" />
                  {a.title}
                </p>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{a.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal delay={100} className="self-start rounded-[1.75rem] border border-line-strong bg-paper p-7 sm:p-9 lg:mt-24">
          <p className="eyebrow !text-ink-2">Honestly</p>
          <h3 className="mt-3 text-2xl font-bold text-ink">Who this is not for</h3>
          <ul className="mt-6 space-y-4">
            {notFor.map((n) => (
              <li key={n} className="flex gap-3 text-[0.95rem] leading-snug text-ink">
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

export function Different() {
  return (
    <section aria-labelledby="diff-title" className="bg-ink py-24 text-white lg:py-32">
      <div className="container-page">
        <Reveal className="max-w-3xl">
          <p className="eyebrow !text-[#c4b0f5]">What makes this different</p>
          <h2 id="diff-title" className="mt-4 text-[2rem] leading-[1.08] font-bold sm:text-[2.6rem] lg:text-[3.1rem]">
            Random information tells you <span className="font-serif font-normal tracking-normal text-[#c4b0f5] italic">what&apos;s possible.</span> A structured guide shows you what to do next.
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[1.75rem] bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {differentiators.map((d, i) => (
            <Reveal key={d.title} delay={(i % 3) * 70} className="bg-ink p-8">
              <span className="font-display text-sm font-bold text-[#c4b0f5]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-xl font-bold">{d.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-white/65">{d.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Journey() {
  return (
    <section aria-labelledby="journey-title" className="py-24 lg:py-32">
      <div className="container-page">
        <SectionHeader
          id="journey-title"
          eyebrow="The learning journey"
          align="center"
          title={<>Understand → Choose → Build → Present → Reach out → <Accent>Improve</Accent></>}
          intro="How the ten chapters guide a beginner through the process, stage by stage."
        />
        <div className="relative mt-16">
        <div aria-hidden className="absolute top-[1.4rem] right-[8%] left-[8%] hidden h-0.5 bg-gradient-to-r from-violet-soft via-violet to-violet-deep lg:block" />
        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-0">
          {journey.map((j, i) => (
            <Reveal as="li" key={j.step} delay={i * 80} className="relative rounded-2xl border border-line bg-white p-6 lg:border-0 lg:bg-transparent lg:px-4 lg:text-center">
              <span className="relative z-10 inline-flex size-11 items-center justify-center rounded-full border-2 border-violet bg-paper font-display text-sm font-bold text-violet lg:mx-auto">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{j.step}</h3>
              <p className="mt-1 text-xs font-semibold tracking-wide text-violet">{j.chapters}</p>
              <p className="mt-2 text-[0.9rem] leading-snug text-ink-2">{j.body}</p>
            </Reveal>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}

export function Outcomes() {
  return (
    <section aria-labelledby="outcomes-title" className="border-t border-line bg-white py-24 lg:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            id="outcomes-title"
            eyebrow="Practical outcomes"
            title={<>Move from information to <Accent>implementation.</Accent></>}
            intro="If you complete the exercises, you'll have real working materials in hand. Those outputs are in your control. A client's “yes” isn't entirely — the book focuses on making your work worthy of it."
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {outcomes.map((o, i) => (
            <Reveal as="li" key={o.title} delay={(i % 2) * 70} className="rounded-2xl border border-line bg-paper p-6">
              <span className="font-display text-xs font-bold text-violet">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-lg font-bold text-ink">{o.title}</h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">{o.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Deliverables() {
  return (
    <section id="deliverables" aria-labelledby="deliverables-title" className="py-24 lg:py-32">
      <div className="container-page">
        <SectionHeader
          id="deliverables-title"
          eyebrow="What you receive"
          title={<>Every file, <Accent>listed</Accent> plainly.</>}
          intro="The ebook and its companion files. Templates and calculators are yours to use and edit in your own business; they can't be resold as a separate product."
        />
        <ul className="mt-14 divide-y divide-line overflow-hidden rounded-[1.75rem] border border-line bg-white">
          {deliverables.map((d, i) => (
            <Reveal as="li" key={d.title} delay={Math.min(i, 3) * 50} className="grid gap-3 p-6 sm:grid-cols-[2.5rem_1fr_auto] sm:items-start sm:gap-6 sm:p-7">
              <Package aria-hidden className="size-5 text-violet sm:mt-1" />
              <div>
                <h3 className="font-display text-lg font-bold text-ink">{d.title}</h3>
                <p className="mt-1 font-mono text-[0.78rem] break-all text-ink-2">{d.file}</p>
                <p className="mt-2 max-w-2xl text-[0.93rem] leading-relaxed text-ink-2">{d.body}</p>
              </div>
              <span className="self-start rounded-full bg-paper-2 px-3 py-1 text-[0.75rem] font-semibold whitespace-nowrap text-ink">{d.format}</span>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-2">
          Bonus files are delivered to buyers after payment is confirmed.
          {product.showResourceHubPublicly ? (
            <>
              {" "}Resource hub:{" "}
              <a href={product.resourcesUrl} className="inline-flex items-center gap-1 font-semibold text-violet hover:underline" target="_blank" rel="noopener noreferrer">
                ztfc-resources.vercel.app <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}
