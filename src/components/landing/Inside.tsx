import Image from "next/image";
import { FileSpreadsheet, FileText } from "lucide-react";
import { calculators, directoryCategories, promptBreakdown, promptCategories, templates } from "@/data/resources";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";

const figures = [
  { n: 1, src: "/images/figures/figure-01.webp", label: "The full journey", alt: "Figure 1 from the book: a staircase from Idea (Chapter 1) to 30 days (Chapter 10) across four stages" },
  { n: 5, src: "/images/figures/figure-05.webp", label: "RCTFV prompt framework", alt: "Figure 5 from the book: the five-part prompt framework Role, Context, Task, Format, Verify" },
  { n: 8, src: "/images/figures/figure-08.webp", label: "Research decision rule", alt: "Figure 8 from the book: five research steps leading to a Go, Refine or Drop decision" },
  { n: 19, src: "/images/figures/figure-19.webp", label: "Outreach sequence", alt: "Figure 19 from the book: an outreach timeline with a first message on day 0 and follow-ups on days 3, 7 and 14" },
];

function Card({ count, title, body, children, className = "", delay = 0 }: {
  count: string; title: string; body: string; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <Reveal delay={delay} className={`flex min-w-0 flex-col rounded-3xl border border-line bg-white p-6 sm:p-7 ${className}`}>
      <p className="font-display text-[2.4rem] leading-none font-extrabold text-violet tabular-nums">{count}</p>
      <h3 className="mt-3 text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[0.94rem] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-5 flex-1">{children}</div>
    </Reveal>
  );
}

export function Inside() {
  const totalPrompts = promptBreakdown.reduce((n, p) => n + p.count, 0);
  return (
    <section id="inside" aria-labelledby="inside-title" className="scroll-mt-16 py-16 lg:py-20">
      <div className="container-page">
        <SectionHeader
          id="inside-title"
          title="What's inside the toolkit"
          intro="The 142-page ebook plus the working files that go with it. Each one is tied to a chapter, so you use it when you need it."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-6">
          <Card count={String(totalPrompts)} title="AI prompts with a verify step" body="Fill in the [brackets] and paste. Each prompt states its purpose, the expected output and what to check before you trust it." className="lg:col-span-3">
            <div className="space-y-2.5">
              {promptBreakdown.map((p) => (
                <div key={p.label} className="flex flex-col-reverse gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="h-2.5 shrink-0 rounded-full bg-violet/90 sm:h-8 sm:rounded-lg" style={{ width: `${Math.max(12, (p.count / totalPrompts) * 100)}%` }} aria-hidden />
                  <p className="min-w-0 text-[0.85rem] leading-tight text-ink">
                    <span className="font-display font-bold">{p.count}</span> {p.label}
                    <span className="block text-ink-2">{p.detail}</span>
                  </p>
                </div>
              ))}
            </div>
            <ul className="mt-5 hidden flex-wrap gap-1.5 sm:flex" aria-label="Prompt library categories">
              {promptCategories.map((c) => (
                <li key={c} className="rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-ink-2">{c}</li>
              ))}
            </ul>
          </Card>

          <Card count="20" title="Editable templates" body="Printable in the book, and supplied as Word and Excel files: from the idea worksheet to proposals, invoices and a client CRM." className="lg:col-span-3" delay={60}>
            <ul className="grid grid-cols-2 gap-x-4 sm:gap-x-6">
              {templates.map((t) => (
                <li key={t.n} className="flex items-center gap-2 border-b border-line py-2 text-[0.8rem] sm:gap-2.5 sm:text-[0.86rem]">
                  <span className="hidden w-5 font-display text-[0.7rem] font-bold text-ink-2 tabular-nums sm:inline">{String(t.n).padStart(2, "0")}</span>
                  {t.format === "XLSX" ? (
                    <FileSpreadsheet aria-hidden className="size-4 shrink-0 text-emerald-700" />
                  ) : (
                    <FileText aria-hidden className="size-4 shrink-0 text-violet-deep" />
                  )}
                  <span className="min-w-0 flex-1 leading-snug text-ink">{t.name}</span>
                  <span className="hidden text-[0.66rem] font-semibold text-ink-2 sm:inline">{t.format}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card count="7" title="Calculator sheets" body="One Excel workbook: your numbers go in the yellow cells and the formulas do the rest." className="lg:col-span-2">
            <ul className="space-y-1.5">
              {calculators.map((c) => (
                <li key={c.name} className="flex items-baseline justify-between gap-3 rounded-xl bg-paper px-3 py-2">
                  <span className="font-display text-[0.88rem] font-semibold text-ink">{c.name}</span>
                  <span className="text-right text-[0.7rem] text-ink-2">{c.when}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card count="24" title="Original diagrams" body="Workflows you can see: the journey, prompt framework, research decision rule, outreach sequence and more." className="lg:col-span-2" delay={60}>
            <div className="grid grid-cols-2 gap-2">
              {figures.map((f) => (
                <figure key={f.src} className="overflow-hidden rounded-xl border border-line bg-paper">
                  <div className="relative aspect-[16/9]">
                    <Image src={f.src} alt={f.alt} fill sizes="(min-width: 1024px) 180px, 45vw" className="object-contain p-1.5" />
                  </div>
                  <figcaption className="border-t border-line bg-white px-2 py-1.5 text-[0.68rem] leading-tight text-ink-2">
                    Fig. {f.n}: {f.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card>

          <Card count="11" title="Resource directory categories" body="Tools, platforms, payment providers and official Indian and international business links, checked on 5 November 2026. Plus a sources appendix and a glossary." className="lg:col-span-2" delay={120}>
            <ul className="flex flex-wrap gap-1.5">
              {directoryCategories.map((c) => (
                <li key={c} className="rounded-full bg-paper px-2.5 py-1 text-[0.74rem] text-ink">{c}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
