import Image from "next/image";
import { FileSpreadsheet, FileText } from "lucide-react";
import { stages } from "@/data/chapters";
import { calculators, directoryCategories, promptBreakdown, promptCategories, templates } from "@/data/resources";
import { Accent, SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";

const figures = [
  { n: 1, src: "/images/figures/figure-01.webp", label: "The full journey", alt: "Figure 1 from the book: a staircase from Idea (Chapter 1) to 30 days (Chapter 10) across four stages" },
  { n: 5, src: "/images/figures/figure-05.webp", label: "RCTFV prompt framework", alt: "Figure 5 from the book: the five-part prompt framework Role, Context, Task, Format, Verify" },
  { n: 8, src: "/images/figures/figure-08.webp", label: "Research decision rule", alt: "Figure 8 from the book: five research steps leading to a Go, Refine or Drop decision" },
  { n: 19, src: "/images/figures/figure-19.webp", label: "Outreach sequence", alt: "Figure 19 from the book: an outreach timeline with a first message on day 0 and follow-ups on days 3, 7 and 14" },
];

function Card({ letter, kicker, title, body, children, className = "", delay = 0 }: {
  letter: string; kicker: string; title: string; body: string; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <Reveal delay={delay} className={`flex flex-col rounded-[1.75rem] border border-line bg-white p-7 sm:p-8 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-violet-soft font-display text-xs font-bold text-violet">{letter}</span>
        <span className="text-xs font-semibold tracking-[0.12em] text-ink-2 uppercase">{kicker}</span>
      </div>
      <h3 className="mt-5 text-2xl font-bold text-ink sm:text-[1.7rem]">{title}</h3>
      <p className="mt-3 text-[0.97rem] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-7 flex-1">{children}</div>
    </Reveal>
  );
}

export function Inside() {
  const totalPrompts = promptBreakdown.reduce((n, p) => n + p.count, 0);
  return (
    <section id="inside" aria-labelledby="inside-title" className="py-24 lg:py-32">
      <div className="container-page">
        <SectionHeader
          id="inside-title"
          eyebrow="What exactly is inside"
          title={<>One handbook. <Accent>Everything</Accent> you need to build with it.</>}
          intro="A 142-page ebook plus the working files that go with it. Each piece is tied to a chapter, so you use it at the moment you need it."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-6">
          {/* A — Chapters */}
          <Card letter="A" kicker="10 practical chapters" title="A complete learning journey" body="Four stages take you from “no service, no proof” to a 30-day plan with real data. Every chapter ends with exercises, a checklist and a next-step assignment." className="lg:col-span-3">
            <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {stages.map((s) => (
                <li key={s.id} className="flex items-start gap-4 bg-paper px-4 py-3.5">
                  <span className="font-display text-xs font-bold text-violet">{s.label.replace("Stage ", "")}</span>
                  <div className="min-w-0">
                    <p className="font-display text-[0.95rem] font-semibold text-ink">{s.title}</p>
                    <p className="text-[0.82rem] text-ink-2">Ch. {s.chapters.join(", ")} — {s.builds}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* B — Prompts */}
          <Card letter="B" kicker={`${totalPrompts} practical prompts`} title="Prompts with a verify step" body="Fill in the [brackets] and paste. Every prompt states its purpose, the output to expect and what to check before you trust it — so you work with AI systematically, not randomly." className="lg:col-span-3" delay={80}>
            <div className="space-y-2.5">
              {promptBreakdown.map((p) => (
                <div key={p.label} className="flex flex-col-reverse gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="h-2.5 shrink-0 rounded-full bg-violet/90 sm:h-9 sm:rounded-lg" style={{ width: `${Math.max(12, (p.count / totalPrompts) * 100)}%` }} aria-hidden />
                  <p className="min-w-0 text-[0.85rem] leading-tight text-ink">
                    <span className="font-display font-bold">{p.count}</span> {p.label}
                    <span className="block text-ink-2">{p.detail}</span>
                  </p>
                </div>
              ))}
            </div>
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Prompt library categories">
              {promptCategories.map((c) => (
                <li key={c} className="rounded-full border border-line px-2.5 py-1 text-[0.74rem] text-ink-2">{c}</li>
              ))}
            </ul>
          </Card>

          {/* C — Templates */}
          <Card letter="C" kicker="20 ready-to-use templates" title="Templates for every step, editable" body="Printable in the book and supplied as editable Word and Excel files — from your first idea worksheet to proposals, invoices and a client CRM." className="lg:col-span-4">
            <ul className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
              {templates.map((t) => (
                <li key={t.n} className="flex items-center gap-3 border-b border-line py-2.5 text-[0.88rem]">
                  <span className="w-6 font-display text-xs font-bold text-ink-2 tabular-nums">{String(t.n).padStart(2, "0")}</span>
                  {t.format === "XLSX" ? (
                    <FileSpreadsheet aria-hidden className="size-4 shrink-0 text-emerald-700" />
                  ) : (
                    <FileText aria-hidden className="size-4 shrink-0 text-violet-deep" />
                  )}
                  <span className="min-w-0 flex-1 leading-snug text-ink">{t.name}</span>
                  <span className="text-[0.68rem] font-semibold tracking-wide text-ink-2">{t.format}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* D — Calculators */}
          <Card letter="D" kicker="7 calculator sheets" title="Numbers you can defend" body="One Excel workbook. Enter your numbers in the yellow cells; the formulas do the rest." className="lg:col-span-2" delay={80}>
            <ul className="space-y-2">
              {calculators.map((c, i) => (
                <li key={c.name} className="flex items-baseline justify-between gap-3 rounded-xl bg-paper px-3.5 py-2.5">
                  <span className="font-display text-[0.9rem] font-semibold text-ink">
                    <span className="mr-2 text-xs text-violet">{i + 1}</span>
                    {c.name}
                  </span>
                  <span className="text-right text-[0.72rem] text-ink-2">{c.when}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* E — Diagrams */}
          <Card letter="E" kicker="24 educational diagrams" title="See the workflow, not just read it" body="Original figures drawn for the book: the full journey, the RCTFV prompt framework, package tiers, the research decision rule, pricing floor-to-ceiling, outreach sequences, a discovery-call map, onboarding and retention loops." className="lg:col-span-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {figures.map((f) => (
                <figure key={f.src} className="overflow-hidden rounded-xl border border-line bg-[#faf9f6]">
                  <div className="relative aspect-[16/7]">
                    <Image src={f.src} alt={f.alt} fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw" className="object-contain p-2" />
                  </div>
                  <figcaption className="border-t border-line bg-white px-3 py-2 text-[0.75rem] text-ink-2">
                    <span className="font-semibold text-ink">Fig. {f.n}</span> · {f.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card>

          {/* F — Supplementary */}
          <Card letter="F" kicker="Supplementary resources" title="Directory, sources and glossary" body="Bonus D is a resource directory across 11 categories with official links and status as checked on 5 November 2026. An appendix lists sources — and what could not be fully verified." className="lg:col-span-3" delay={80}>
            <ul className="flex flex-wrap gap-1.5">
              {directoryCategories.map((c) => (
                <li key={c} className="rounded-full bg-paper px-3 py-1.5 text-[0.78rem] text-ink">{c}</li>
              ))}
            </ul>
            <p className="mt-5 text-[0.85rem] text-ink-2">
              Also included as standalone PDFs: the prompt library, the printable templates and the resource directory.{" "}
              <a href="#deliverables" className="font-semibold text-violet underline-offset-4 hover:underline">See all files</a>
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
