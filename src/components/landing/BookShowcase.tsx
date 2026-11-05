"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, BookText } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * The real ZERO TO FIRST CLIENT book, rendered by the vendored ThreeUI Community
 * `BestsellerBooks` component (MIT; see public/3d-assets/books/THREEUI-NOTICE.md) with the
 * `ztfc` edition. Every location uses this component, so the hero, pricing and final-CTA books
 * are the same construction, cover, pages and animation.
 *
 * Performance: the book is CSS 3D (no WebGL, so no GPU contexts to share or leak). The
 * ThreeUI host mounts its iframe only while it's within 80px of the viewport and unmounts it
 * when it scrolls away, and the viewer stops its rAF loop when hidden. Off-screen books cost
 * nothing, and at most the visible ones run.
 *
 * Until the iframe reports ready, a render of the same book (captured from this scene) is
 * shown as the poster, so there's no blank box or layout shift. Errors, or no ready signal
 * within the timeout, keep the poster permanently.
 */
const BestsellerBooks = dynamic(
  () => import("@/components/threeui/bestseller-books/BestsellerBooks").then((m) => m.BestsellerBooks),
  { ssr: false, loading: () => null },
);

export type BookVariant = "hero" | "pricing" | "footer";

type VariantConfig = {
  /** Stage size and aspect. */
  stage: string;
  /** Poster width as a share of the stage, matched to the closed book's on-screen size. */
  poster: string;
  posterSizes: string;
  /** Open the cover automatically after the scene appears (skipped with reduced motion). */
  autoOpenMs: number | null;
  showToggle: boolean;
  backdrop: boolean;
};

const VARIANTS: Record<BookVariant, VariantConfig> = {
  hero: {
    stage: "aspect-[5/6] max-w-[18rem] sm:max-w-[24rem] lg:aspect-[9/10] lg:max-w-[31rem]",
    poster: "w-[62%]",
    posterSizes: "(min-width: 1024px) 320px, (min-width: 640px) 260px, 190px",
    autoOpenMs: 1400,
    showToggle: true,
    backdrop: true,
  },
  pricing: {
    stage: "aspect-[5/6] max-w-[16rem] sm:max-w-[19rem] lg:max-w-[22rem]",
    poster: "w-[62%]",
    posterSizes: "(min-width: 1024px) 230px, 180px",
    autoOpenMs: 900,
    showToggle: true,
    backdrop: false,
  },
  footer: {
    stage: "aspect-[5/6] max-w-[13rem] sm:max-w-[15rem] lg:max-w-[17rem]",
    poster: "w-[62%]",
    posterSizes: "180px",
    autoOpenMs: null,
    showToggle: false,
    backdrop: false,
  },
};

type HostState = "idle" | "loading" | "ready" | "fallback";
const READY_TIMEOUT_MS = 9000;

export function BookShowcase({ variant, labels, preload = false, dark = false }: { variant: BookVariant; labels: Dictionary["book"]; preload?: boolean; dark?: boolean }) {
  const cfg = VARIANTS[variant];
  const wrap = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HostState>("idle");
  const [open, setOpen] = useState(false);

  const frameWindow = useCallback(() => wrap.current?.querySelector("iframe")?.contentWindow ?? null, []);
  const send = useCallback(
    (command: "open" | "close" | "toggle" | "rest") => frameWindow()?.postMessage({ type: "book-asset-command", command }, "*"),
    [frameWindow],
  );

  // Follow the ThreeUI host's own lifecycle (data-state: paused | loading | ready | error).
  useEffect(() => {
    const root = wrap.current;
    if (!root) return;
    const read = () => {
      const el = root.querySelector<HTMLElement>(".book-asset");
      const s = el?.dataset.state;
      setHost((prev) => {
        if (prev === "fallback") return prev;
        if (s === "ready") return "ready";
        if (s === "loading") return "loading";
        if (s === "error") return "fallback";
        return "idle";
      });
      if (s !== "ready") setOpen(false);
    };
    const mo = new MutationObserver(read);
    mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] });
    const first = requestAnimationFrame(read);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(first);
    };
  }, []);

  // An iframe that never reports ready keeps the poster for good.
  useEffect(() => {
    if (host !== "loading") return;
    const t = window.setTimeout(() => setHost((s) => (s === "loading" ? "fallback" : s)), READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [host]);

  // Open state reported by the scene (bridge in preview.html).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.source || e.source !== frameWindow()) return;
      const data = e.data as { type?: string; kind?: string; open?: boolean } | null;
      if (data?.type === "book-asset-open" && data.kind === "bestsellers" && typeof data.open === "boolean") setOpen(data.open);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameWindow]);

  // Each time a scene becomes ready (first view, or after scrolling back), run the variant's opening.
  useEffect(() => {
    if (host !== "ready" || cfg.autoOpenMs === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => send("open"), cfg.autoOpenMs);
    return () => window.clearTimeout(t);
  }, [host, cfg.autoOpenMs, send]);

  // Hover-tilt reset when the pointer is back over the parent page (the iframe doesn't
  // reliably get pointerleave). Throttled, plus a trailing reset that wins over late iframe events.
  useEffect(() => {
    if (host !== "ready") return;
    let last = 0;
    let trailing = 0;
    const onMove = () => {
      window.clearTimeout(trailing);
      trailing = window.setTimeout(() => send("rest"), 160);
      const now = performance.now();
      if (now - last < 450) return;
      last = now;
      send("rest");
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      window.clearTimeout(trailing);
    };
  }, [host, send]);

  const ready = host === "ready";

  return (
    <figure className="relative mx-auto w-full" aria-label={labels.figure} data-book-variant={variant}>
      <div ref={wrap} className={`ztfc-book-stage relative mx-auto w-full ${cfg.stage}`} data-host-state={host}>
        {cfg.backdrop ? <div aria-hidden className="absolute inset-x-[4%] top-[6%] bottom-[4%] rounded-[2.5rem] bg-paper-2" /> : null}
        <div aria-hidden className={`absolute top-[22%] left-1/2 size-[62%] -translate-x-1/2 rounded-full blur-3xl ${dark ? "bg-violet/30" : "bg-violet/15"}`} />

        {/* Poster: a render of this same book, visible until the scene is ready, and the fallback. */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`} aria-hidden={ready}>
          <Image
            src="/images/book/book-3d-closed.webp"
            alt=""
            width={988}
            height={1354}
            sizes={cfg.posterSizes}
            preload={preload}
            fetchPriority={preload ? "high" : undefined}
            className={`h-auto ${cfg.poster}`}
          />
        </div>

        {host !== "fallback" ? (
          <div className={`ztfc-book-scene absolute inset-0 ${ready ? "is-ready" : ""}`}>
            <div className="ztfc-book-float absolute inset-0">
              <BestsellerBooks edition="ztfc" controls={false} background="transparent" className="ztfc-book-host" style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        ) : null}

        {host === "loading" ? <span role="status" className="sr-only">{labels.loading}</span> : null}
      </div>

      <figcaption className={`flex justify-center ${cfg.showToggle ? "mt-3" : ""}`}>
        <span className="sr-only">{labels.srCaption}</span>
        {cfg.showToggle ? (
          ready ? (
            <button
              type="button"
              onClick={() => send("toggle")}
              aria-pressed={open}
              className="press inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white/70 px-5 font-display text-[0.85rem] font-semibold text-ink backdrop-blur hover:border-ink hover:bg-white"
            >
              {open ? <BookText aria-hidden className="size-4 text-violet" /> : <BookOpen aria-hidden className="size-4 text-violet" />}
              {open ? labels.close : labels.open}
            </button>
          ) : (
            <span aria-hidden className="h-10" />
          )
        ) : null}
      </figcaption>
    </figure>
  );
}
