"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 1400;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts a verified static number up from 0 the first time it enters the viewport.
 * - Server HTML contains the final value (SEO, no-JS, screen readers).
 * - An invisible copy of the final value reserves the width, so nothing shifts while counting.
 * - Screen readers get the final value only; the animated digits are aria-hidden.
 * - Updates one text node per frame instead of React state: no re-renders.
 * - Runs once per element. Reduced motion shows the final value immediately.
 * - CSS (globals.css) keeps the digits hidden until counting starts, with a 3 s fallback
 *   that reveals the final value if JavaScript never runs.
 */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const digits = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const out = digits.current;
    if (!el || !out) return;
    const done = () => {
      out.textContent = String(value);
      el.dataset.state = "done";
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      done();
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        out.textContent = "0";
        el.dataset.state = "counting";
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION_MS);
          out.textContent = String(Math.round(value * easeOutCubic(p)));
          if (p < 1) raf = requestAnimationFrame(tick);
          else done();
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={root} data-countup="" className={`relative inline-block tabular-nums ${className}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="invisible">{value}</span>
      <span ref={digits} aria-hidden className="countup-digits absolute inset-0">{value}</span>
    </span>
  );
}
