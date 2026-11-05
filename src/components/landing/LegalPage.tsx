import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { brand, support } from "@/data/product";
import { Wordmark } from "@/components/ui/BookMockup";
import { policyLinks } from "@/data/content";

/** Set once a qualified Indian legal professional has reviewed the policy text. */
const legalReviewed = process.env.NEXT_PUBLIC_LEGAL_REVIEWED === "true";
export const POLICY_UPDATED = "6 November 2026";

/** Marks a business detail that hasn't been supplied. Never replaced with invented data. */
export function Pending({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.92em] font-medium text-amber-900">
      {children} — to be published before checkout opens
    </span>
  );
}

export function SellerIdentity() {
  return (
    <>
      {brand.seller} (seller) and {brand.publisher} (publisher) are brands operated by{" "}
      {brand.legalEntity ?? <Pending>the operating business&apos;s legal name</Pending>}.
    </>
  );
}

export function LegalPage({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="ZERO TO FIRST CLIENT home"><Wordmark /></Link>
          <Link href="/" className="link-underline inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" /> Back to the ebook
          </Link>
        </div>
      </header>
      <main className="container-page max-w-3xl py-12 lg:py-16">
        <h1 className="text-[clamp(2rem,4vw,2.9rem)] font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-2">Last updated {POLICY_UPDATED}</p>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-ink">{summary}</p>
        {!legalReviewed ? (
          <p role="note" className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-4 text-sm leading-relaxed text-ink-2">
            This page is a working draft written in plain language. It is pending review by a qualified legal professional
            in India and confirmation of business details, and it is not legal advice. Nothing here limits any right you have
            under applicable law.
          </p>
        ) : null}
        <div className="legal-prose mt-8 space-y-4 text-[1rem] leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-violet [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
        <nav aria-label="Other policies" className="mt-14 border-t border-line pt-6">
          <p className="text-sm font-semibold text-ink">Other policies</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[...policyLinks, { href: "/contact", label: "Contact and support" }].map((l) => (
              <li key={l.href}><Link href={l.href} className="link-underline text-ink-2 hover:text-ink">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <p className="mt-10 text-xs text-ink-2">© 2026 {brand.publisher}. Sold by {brand.seller}.</p>
      </main>
    </div>
  );
}

/** The support channel: the configured email, or a clearly marked placeholder plus the contact page. */
export function SupportContact() {
  return support.email ? (
    <a href={`mailto:${support.email}`}>{support.email}</a>
  ) : (
    <>
      <Pending>Support email</Pending> (until then, use the <Link href="/contact">contact page</Link>)
    </>
  );
}
