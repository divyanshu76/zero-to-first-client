import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { product } from "@/data/product";
import { Wordmark } from "@/components/ui/BookMockup";

export function LegalPage({ title, status, children }: { title: string; status?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="Back to the ZERO TO FIRST CLIENT home page"><Wordmark /></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" /> Back to the ebook
          </Link>
        </div>
      </header>
      <main className="container-page max-w-3xl py-16 lg:py-24">
        <p className="eyebrow">{product.name}</p>
        <h1 className="mt-4 text-4xl font-extrabold text-ink sm:text-5xl">{title}</h1>
        {status ? (
          <p role="note" className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-4 text-sm text-ink-2">
            {status}
          </p>
        ) : null}
        <div className="mt-10 space-y-5 text-[1.02rem] leading-relaxed text-ink-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_a]:font-semibold [&_a]:text-violet">
          {children}
        </div>
        <p className="mt-14 text-xs text-ink-2">© 2026 {product.publisher}</p>
      </main>
    </div>
  );
}
