"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, BookText } from "lucide-react";
import { BookMockup } from "@/components/ui/BookMockup";

/**
 * Hero showcase for the ThreeUI Community `BestsellerBooks` component
 * (vendored, MIT: see public/3d-assets/books/THREEUI-NOTICE.md), configured with the
 * ZERO TO FIRST CLIENT edition. It renders in a sandboxed iframe, so it is loaded
 * client-side only.
 *
 * Until the iframe reports `ready`, the real cover is shown as a static poster, so
 * there is no blank box or layout shift. If the scene errors or doesn't report ready
 * within the timeout, the poster stays as the fallback. With reduced motion, the book
 * stays closed and still: the viewer itself disables its transitions and hover tilt.
 */
const BestsellerBooks = dynamic(
  () => import("@/components/threeui/bestseller-books/BestsellerBooks").then((m) => m.BestsellerBooks),
  { ssr: false, loading: () => null },
);

type SceneState = "loading" | "ready" | "fallback";
const READY_TIMEOUT_MS = 9000;
const AUTO_OPEN_DELAY_MS = 1400;

export function ThreeDEbookShowcase() {
  const wrap = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<SceneState>("loading");
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);

  const frameWindow = useCallback(() => wrap.current?.querySelector("iframe")?.contentWindow ?? null, []);

  const send = useCallback(
    (command: "open" | "close" | "toggle" | "rest") => {
      frameWindow()?.postMessage({ type: "book-asset-command", command }, "*");
    },
    [frameWindow],
  );

  // Listen only to messages from our own iframe.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.source || e.source !== frameWindow()) return;
      const data = e.data as { type?: string; kind?: string; state?: string; open?: boolean } | null;
      if (data?.kind !== "bestsellers") return;
      if (data.type === "book-asset") {
        if (data.state === "ready") setScene("ready");
        if (data.state === "error") setScene("fallback");
      }
      if (data.type === "book-asset-open" && typeof data.open === "boolean") setOpen(data.open);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameWindow]);

  // A scene that never reports ready keeps the static cover.
  useEffect(() => {
    if (scene !== "loading") return;
    const t = window.setTimeout(() => setScene((s) => (s === "loading" ? "fallback" : s)), READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [scene]);

  // Open the book once, gently, after it has faded in (skipped for reduced motion).
  useEffect(() => {
    if (scene !== "ready" || autoOpened.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      autoOpened.current = true;
      send("open");
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [scene, send]);

  // Hover tilt reset. The iframe doesn't reliably get `pointerleave` when the pointer
  // crosses into the parent document, but any parent `pointermove` means the pointer is
  // no longer over the book. That sends the viewer's own reset, throttled.
  useEffect(() => {
    if (scene !== "ready") return;
    let last = 0;
    let trailing = 0;
    const onMove = () => {
      // A trailing reset wins over any late, coalesced pointermove inside the iframe.
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
  }, [scene, send]);

  const ready = scene === "ready";

  return (
    <figure className="relative mx-auto w-full" aria-label="ZERO TO FIRST CLIENT — 3D ebook preview">
      <div ref={wrap} className="ztfc-book-stage relative mx-auto aspect-[5/6] w-full max-w-[19rem] sm:max-w-[26rem] lg:aspect-[9/10] lg:max-w-[32rem]">
        {/* Soft studio backdrop + violet ambient glow, outside the iframe so it can't block the scene. */}
        <div aria-hidden className="absolute inset-x-[4%] top-[6%] bottom-[4%] rounded-[2.5rem] bg-paper-2" />
        <div aria-hidden className="absolute top-[22%] left-1/2 size-[62%] -translate-x-1/2 rounded-full bg-violet/15 blur-3xl" />

        {/* Static poster: real cover, visible immediately; it remains the fallback. */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
          aria-hidden={ready}
        >
          <div className="w-[56%]">
            <BookMockup preload float={false} sizes="(min-width: 1024px) 290px, (min-width: 640px) 240px, 60vw" />
          </div>
        </div>

        {scene !== "fallback" ? (
          <div className={`ztfc-book-scene absolute inset-0 ${ready ? "is-ready" : ""}`}>
            <div className="ztfc-book-float absolute inset-0">
              <BestsellerBooks edition="ztfc" controls={false} background="transparent" className="ztfc-book-host" style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        ) : null}

        {scene === "loading" ? (
          <span role="status" className="sr-only">Loading the 3D book preview</span>
        ) : null}
      </div>

      <figcaption className="mt-4 flex flex-col items-center gap-3 text-center">
        <span className="font-display text-[0.68rem] font-bold tracking-[0.2em] text-violet uppercase">Your complete business starter kit</span>
        <span className="text-[0.82rem] font-medium text-ink-2">142 Pages · 10 Chapters · 141 AI Prompts</span>
        {ready ? (
          <button
            type="button"
            onClick={() => send("toggle")}
            aria-pressed={open}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white/70 px-5 font-display text-[0.85rem] font-semibold text-ink backdrop-blur transition-colors hover:border-ink hover:bg-white"
          >
            {open ? <BookText aria-hidden className="size-4 text-violet" /> : <BookOpen aria-hidden className="size-4 text-violet" />}
            {open ? "Close the book" : "Look inside"}
          </button>
        ) : (
          <span aria-hidden className="h-10" />
        )}
      </figcaption>
    </figure>
  );
}
