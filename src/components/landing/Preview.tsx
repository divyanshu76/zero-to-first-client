"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { previews } from "@/data/content";
import { Accent, SectionHeader } from "@/components/ui/SectionHeader";

export function Preview() {
  const [index, setIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const show = useCallback((i: number) => {
    setLoaded(false);
    setFailed(false);
    setIndex((i + previews.length) % previews.length);
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, show]);

  const close = () => {
    setIndex(null);
    lastTrigger.current?.focus();
  };

  const current = index !== null ? previews[index] : null;

  return (
    <section aria-labelledby="preview-title" className="overflow-hidden border-t border-line bg-paper-2 py-24 lg:py-32">
      <div className="container-page">
        <SectionHeader
          id="preview-title"
          eyebrow="Inside the ebook"
          title={<>Look inside <Accent>before</Accent> you decide.</>}
          intro={`${previews.length} real pages from the 142-page PDF — enough to judge the format and depth without giving the whole book away. Tap any page to enlarge it.`}
        />
      </div>

      <div className="mt-14">
        <ul
          className="container-page flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 [scrollbar-width:thin] sm:gap-6"
          aria-label="Ebook page previews"
        >
          {previews.map((p, i) => (
            <li key={p.src} className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[22%]">
              <button
                type="button"
                onClick={(e) => {
                  lastTrigger.current = e.currentTarget;
                  show(i);
                }}
                className="group block w-full text-left"
              >
                <span className="relative block aspect-[595/842] overflow-hidden rounded-lg border border-line bg-white shadow-[0_18px_40px_-24px_rgb(23_23_23/0.45)] transition-transform duration-300 group-hover:-translate-y-1">
                  <Image src={p.src} alt="" fill sizes="(min-width: 1024px) 280px, (min-width: 640px) 40vw, 68vw" className="object-cover" />
                  <span className="absolute right-3 bottom-3 inline-flex size-8 items-center justify-center rounded-full bg-ink/80 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Expand aria-hidden className="size-3.5" />
                  </span>
                </span>
                <span className="sr-only">Enlarge preview: </span>
                <span className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-display text-[0.95rem] font-semibold text-ink">{p.title}</span>
                  <span className="text-xs text-ink-2">{p.page}</span>
                </span>
                <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-2">{p.caption}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        aria-label={current ? `${current.title} preview` : "Preview"}
        className="m-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/85 backdrop:backdrop-blur-sm"
      >
        {current ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 sm:p-8" onClick={(e) => e.target === e.currentTarget && close()}>
            <div className="flex w-full max-w-3xl items-center justify-between text-white">
              <p className="font-display text-sm font-semibold">
                {current.title} <span className="font-normal text-white/60">· {current.page} · {index! + 1}/{previews.length}</span>
              </p>
              <button type="button" onClick={close} className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close preview">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="relative min-h-0 w-full max-w-3xl flex-1">
              {!loaded && !failed ? (
                <div className="absolute inset-0 flex items-center justify-center" role="status">
                  <span className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="sr-only">Loading page</span>
                </div>
              ) : null}
              {failed ? (
                <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-white/80" role="alert">
                  This preview couldn&apos;t load. Check your connection and try again.
                </div>
              ) : null}
              <Image
                key={current.src}
                src={current.src}
                alt={`Page from ZERO TO FIRST CLIENT: ${current.title}. ${current.caption}`}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className={`object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => show(index! - 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous page">
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <p className="max-w-xs text-center text-xs text-white/70 sm:max-w-md sm:text-sm">{current.caption}</p>
              <button type="button" onClick={() => show(index! + 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next page">
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
