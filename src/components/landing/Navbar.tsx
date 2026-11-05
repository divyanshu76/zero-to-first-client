"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { navLinks, tickerItems } from "@/data/content";
import { Wordmark } from "@/components/ui/BookMockup";

function TickerTrack() {
  return (
    <div className="flex shrink-0 items-center">
      {tickerItems.map((t) => (
        <span key={t} className="flex items-center whitespace-nowrap">
          <span className="px-6 sm:px-8">{t}</span>
          <svg aria-hidden viewBox="0 0 10 10" className="size-2 fill-[#b9a2f2]">
            <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/**
 * Seamless ticker. Two identical tracks sit side by side, and translating the
 * pair by -50% lands exactly where the second track started, so the loop never jumps.
 * Screen readers get one plain sentence; the moving copies are aria-hidden and not focusable.
 */
export function Ticker() {
  return (
    <div className="ticker relative overflow-hidden bg-ink text-white">
      <p className="sr-only">The 2026 Edition — a practical starter kit for your first client journey.</p>
      <div aria-hidden className="ticker-track flex w-max py-2.5 font-display text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
        <TickerTrack />
        <TickerTrack />
      </div>
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the nav item for the section in view; clears in sections without a nav item.
  useEffect(() => {
    const ids: string[] = navLinks.map((l) => l.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(ids.includes(visible.target.id) ? visible.target.id : "");
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    document.querySelectorAll<HTMLElement>("main > section").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Mobile menu: Escape closes and returns focus; background scroll is locked while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color] duration-300 ${
        scrolled || open ? "border-b border-line bg-paper/92 backdrop-blur-md" : "border-b border-transparent bg-paper"
      }`}
    >
      <nav aria-label="Main" className="container-page flex h-16 items-center justify-between gap-6">
        <a href="#top" className="shrink-0 rounded-md" aria-label="ZERO TO FIRST CLIENT by CRAFT & CODE — back to top">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`rounded-full px-3.5 py-2 text-[0.88rem] font-medium transition-colors ${isActive ? "text-violet" : "text-ink-2 hover:text-ink"}`}
                >
                  <span className={`link-underline pb-0.5 ${isActive ? "[background-size:100%_1px]" : ""}`}>{l.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#pricing" className="press hidden h-10 items-center rounded-full bg-ink px-5 font-display text-[0.86rem] font-semibold text-white hover:bg-violet sm:inline-flex">
            Get the ebook
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="press inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-paper-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <div id="mobile-menu" ref={menuRef} hidden={!open} className="border-t border-line bg-paper lg:hidden">
        <ul className="container-page flex flex-col py-2">
          {navLinks.map((l, i) => (
            <li key={l.href} className="motion-safe:animate-[menu-in_0.3s_both]" style={{ animationDelay: `${i * 35}ms` }}>
              <a href={l.href} onClick={() => setOpen(false)} className="flex items-center border-b border-line py-3.5 font-display text-lg font-semibold text-ink">
                {l.label}
              </a>
            </li>
          ))}
          <li className="pt-4 pb-3">
            <a href="#pricing" onClick={() => setOpen(false)} className="press flex h-12 items-center justify-center rounded-full bg-violet font-display font-semibold text-white">
              Get the ebook
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
