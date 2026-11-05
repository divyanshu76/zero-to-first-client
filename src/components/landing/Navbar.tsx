"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { navKeys, navTargets } from "@/data/content";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import { Wordmark } from "@/components/ui/BookMockup";
import { LanguageSwitcher } from "./LanguageSwitcher";

function TickerTrack({ items }: { items: string[] }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((t) => (
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
 * Seamless ticker: two identical tracks, translated by -50%, land exactly where the second
 * track started, so the loop never jumps. Screen readers get one plain sentence; the moving
 * copies are aria-hidden and not focusable.
 */
export function Ticker({ t }: { t: Dictionary["ticker"] }) {
  return (
    <div className="ticker relative overflow-hidden bg-ink text-white">
      <p className="sr-only">{t.sr}</p>
      <div aria-hidden className="ticker-track flex w-max py-2.5 font-display text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
        <TickerTrack items={t.items} />
        <TickerTrack items={t.items} />
      </div>
    </div>
  );
}

export function Navbar({ t, a11y, language, locale }: { t: Dictionary["nav"]; a11y: Dictionary["a11y"]; language: Dictionary["language"]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const links = navTargets.map((href, i) => ({ href, label: t[navKeys[i]] }));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the nav item for the section in view; clears in sections without a nav item.
  useEffect(() => {
    const ids: string[] = navTargets.map((h) => h.slice(1));
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
      <nav aria-label={t.label} className="container-page flex h-16 items-center justify-between gap-4">
        <a href="#top" className="shrink-0 rounded-md" aria-label={a11y.backToTop}>
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`rounded-full px-3 py-2 text-[0.86rem] font-medium whitespace-nowrap transition-colors ${isActive ? "text-violet" : "text-ink-2 hover:text-ink"}`}
                >
                  <span className={`link-underline pb-0.5 ${isActive ? "[background-size:100%_1px]" : ""}`}>{l.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={language.label} />
          <a href="#pricing" className="press hidden h-10 items-center rounded-full bg-ink px-5 font-display text-[0.86rem] font-semibold whitespace-nowrap text-white hover:bg-violet md:inline-flex">
            {t.cta}
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="press inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-paper-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <div id="mobile-menu" ref={menuRef} hidden={!open} className="border-t border-line bg-paper lg:hidden">
        <ul className="container-page flex flex-col py-2">
          {links.map((l, i) => (
            <li key={l.href} className="motion-safe:animate-[menu-in_0.3s_both]" style={{ animationDelay: `${i * 35}ms` }}>
              <a href={l.href} onClick={() => setOpen(false)} className="flex items-center border-b border-line py-3.5 font-display text-lg font-semibold text-ink">
                {l.label}
              </a>
            </li>
          ))}
          <li className="pt-4 pb-3">
            <a href="#pricing" onClick={() => setOpen(false)} className="press flex h-12 items-center justify-center rounded-full bg-violet font-display font-semibold text-white">
              {t.cta}
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
