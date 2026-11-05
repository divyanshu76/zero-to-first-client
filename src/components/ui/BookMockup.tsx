import Image from "next/image";

type Props = { preload?: boolean; className?: string; sizes?: string; float?: boolean };

/** CSS-3D mockup that uses the actual PDF cover (rendered from page 1). */
export function BookMockup({ preload = false, className = "", sizes = "(min-width: 1024px) 420px, 70vw", float = true }: Props) {
  return (
    <div className={`relative ${float ? "motion-safe:animate-float" : ""} ${className}`}>
      <div className="book">
        <div className="book-shadow" aria-hidden />
        <div className="book-cover bg-white">
          <Image
            src="/images/cover.webp"
            alt="Cover of ZERO TO FIRST CLIENT: The AI-Powered Business Starter Kit, 2026 Edition, by DEADCODE LABS"
            width={1200}
            height={1699}
            preload={preload}
            fetchPriority={preload ? "high" : undefined}
            sizes={sizes}
            className="block h-auto w-full"
          />
        </div>
        <div className="book-pages" aria-hidden />
      </div>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-[0.82rem] font-extrabold tracking-[0.14em] text-ink ${className}`}>
      <span aria-hidden className="size-2.5 rounded-[3px] bg-violet" />
      DEADCODE LABS
    </span>
  );
}
