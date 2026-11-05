import Link from "next/link";
import { Wordmark } from "@/components/ui/BookMockup";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" aria-label="ZERO TO FIRST CLIENT home"><Wordmark /></Link>
        </div>
      </header>
      <main className="container-page flex flex-1 flex-col items-start justify-center py-20">
        <p className="font-display text-6xl font-extrabold text-violet">404</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">This page doesn&apos;t exist</h1>
        <p className="mt-2 max-w-md text-ink-2">The link may be mistyped or out of date. The ebook, its preview pages and pricing are all on the home page.</p>
        <Link href="/" className="press mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 font-display font-semibold text-white hover:bg-violet">
          Go to the home page
        </Link>
      </main>
    </div>
  );
}
