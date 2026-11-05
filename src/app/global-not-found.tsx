import type { Metadata } from "next";
import { Inter, Manrope, Noto_Sans_Devanagari } from "next/font/google";
import Link from "next/link";
import { product } from "@/data/product";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["700", "800"], display: "swap" });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(product.siteUrl),
  title: "Page not found — Zero to First Client",
  description: "This page doesn't exist. The ebook, its preview pages and pricing are on the home page.",
  robots: { index: false },
};

/** Unmatched URLs can be in either language, so the 404 is bilingual. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${devanagari.variable} antialiased`}>
      <body className="min-h-dvh bg-paper">
        <main className="container-page flex min-h-dvh flex-col items-start justify-center py-20">
          <p className="font-display text-[0.95rem] font-extrabold tracking-[0.04em] text-ink">CRAFT &amp; CODE</p>
          <p className="mt-8 font-display text-6xl font-extrabold text-violet">404</p>
          <h1 className="mt-3 text-3xl font-bold text-ink">This page doesn&apos;t exist</h1>
          <p className="mt-2 max-w-md text-ink-2">The link may be mistyped or out of date. The ebook, its preview pages and pricing are all on the home page.</p>
          <p lang="hi" className="mt-4 max-w-md text-ink-2">यह पेज मौजूद नहीं है। Ebook, उसकी झलक और pricing होम पेज पर हैं।</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="press inline-flex h-12 items-center rounded-full bg-ink px-6 font-display font-semibold text-white hover:bg-violet">Go to the home page</Link>
            <Link href="/hi" lang="hi" className="press inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-display font-semibold text-ink hover:border-ink">होम पेज (हिन्दी)</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
