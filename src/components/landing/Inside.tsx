import Image from "next/image";
import { FileSpreadsheet, FileText } from "lucide-react";
import { calculatorSheets, diagramFigures, promptCounts, templates } from "@/data/resources";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";

function Card({ count, title, body, children, className = "", delay = 0 }: {
  count: string; title: string; body: string; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <Reveal delay={delay} className={`lift flex min-w-0 flex-col rounded-3xl border border-line bg-white p-6 sm:p-7 ${className}`}>
      <p className="font-display text-[2.4rem] leading-none font-extrabold text-violet tabular-nums">{count}</p>
      <h3 className="mt-3 text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[0.94rem] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-5 flex-1">{children}</div>
    </Reveal>
  );
}

export function Inside({ t }: { t: Dictionary["inside"] }) {
  const totalPrompts = promptCounts.reduce<number>((n, c) => n + c, 0);
  return (
    <section id="inside" aria-labelledby="inside-title" className="scroll-mt-16 py-16 lg:py-20">
      <div className="container-page">
        <SectionHeader id="inside-title" title={t.title} intro={t.intro} />

        <div className="mt-10 grid gap-4 lg:grid-cols-6">
          <Card count={String(totalPrompts)} title={t.prompts.title} body={t.prompts.body} className="lg:col-span-3">
            <div className="space-y-2.5">
              {t.prompts.breakdown.map((p, i) => (
                <div key={p.label} className="flex flex-col-reverse gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="h-2.5 shrink-0 rounded-full bg-violet/90 sm:h-8 sm:rounded-lg" style={{ width: `${Math.max(12, (promptCounts[i] / totalPrompts) * 100)}%` }} aria-hidden />
                  <p className="min-w-0 text-[0.85rem] leading-tight text-ink">
                    <span className="font-display font-bold">{promptCounts[i]}</span> {p.label}
                    <span className="block text-ink-2">{p.detail}</span>
                  </p>
                </div>
              ))}
            </div>
            <ul className="mt-5 hidden flex-wrap gap-1.5 sm:flex" aria-label={t.prompts.categoriesLabel}>
              {t.prompts.categories.map((c) => (
                <li key={c} className="rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-ink-2">{c}</li>
              ))}
            </ul>
          </Card>

          <Card count="20" title={t.templates.title} body={t.templates.body} className="lg:col-span-3" delay={60}>
            <ul className="grid grid-cols-2 gap-x-4 sm:gap-x-6">
              {templates.map((tp) => (
                <li key={tp.n} className="flex items-center gap-2 border-b border-line py-2 text-[0.8rem] sm:gap-2.5 sm:text-[0.86rem]">
                  <span className="hidden w-5 font-display text-[0.7rem] font-bold text-ink-2 tabular-nums sm:inline">{String(tp.n).padStart(2, "0")}</span>
                  {tp.format === "XLSX" ? (
                    <FileSpreadsheet aria-hidden className="size-4 shrink-0 text-emerald-700" />
                  ) : (
                    <FileText aria-hidden className="size-4 shrink-0 text-violet-deep" />
                  )}
                  <span lang="en" className="min-w-0 flex-1 leading-snug text-ink">{tp.name}</span>
                  <span className="hidden text-[0.66rem] font-semibold text-ink-2 sm:inline">{tp.format}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card count="7" title={t.calculators.title} body={t.calculators.body} className="lg:col-span-2">
            <ul className="space-y-1.5">
              {calculatorSheets.map((name, i) => (
                <li key={name} className="flex items-baseline justify-between gap-3 rounded-xl bg-paper px-3 py-2">
                  <span lang="en" className="font-display text-[0.88rem] font-semibold text-ink">{name}</span>
                  <span className="text-right text-[0.7rem] text-ink-2">{t.calculators.when[i]}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card count="24" title={t.diagrams.title} body={t.diagrams.body} className="lg:col-span-2" delay={60}>
            <div className="grid grid-cols-2 gap-2">
              {diagramFigures.map((f, i) => (
                <figure key={f.src} className="overflow-hidden rounded-xl border border-line bg-paper">
                  <div className="relative aspect-[16/9]">
                    <Image src={f.src} alt={t.diagrams.figures[i].alt} fill sizes="(min-width: 1024px) 180px, 45vw" className="object-contain p-1.5" />
                  </div>
                  <figcaption className="border-t border-line bg-white px-2 py-1.5 text-[0.68rem] leading-tight text-ink-2">
                    {t.diagrams.figPrefix} {f.n}: {t.diagrams.figures[i].label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card>

          <Card count="11" title={t.directory.title} body={t.directory.body} className="lg:col-span-2" delay={120}>
            <ul className="flex flex-wrap gap-1.5">
              {t.directory.categories.map((c) => (
                <li key={c} className="rounded-full bg-paper px-2.5 py-1 text-[0.74rem] text-ink">{c}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
