"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/data/content";
import { Wordmark } from "@/components/ui/BookMockup";

export function AnnouncementBar() {
  return (
    <div className="bg-ink text-white">
      <p className="container-page py-2.5 text-center font-display text-[0.68rem] font-semibold tracking-[0.16em] sm:text-[0.72rem]">
        <span className="text-[#c4b0f5]">THE 2026 EDITION</span>
        <span className="mx-2 text-white/40" aria-hidden>—</span>
        <span className="hidden sm:inline">A PRACTICAL STARTER KIT FOR YOUR FIRST CLIENT JOURNEY</span>
        <span className="sm:hidden">FIRST-CLIENT STARTER KIT</span>
      </p>
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section currently in view.
  useEffect(() => {
    const ids: string[] = navLinks.map((l) => l.href.slice(1));
    // Observe every top-level section so the highlight clears in sections without a nav link.
    const els = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible[0]) setActive(ids.includes(visible[0].target.id) ? visible[0].target.id : "");
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Mobile menu: Escape closes, focus returns to the toggle, body scroll locked.
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
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled || open ? "border-b border-line bg-paper/90 backdrop-blur-md" : "border-b border-transparent bg-paper"
      }`}
    >
      <nav aria-label="Main" className="container-page flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
        <a href="#top" className="shrink-0 rounded-md" aria-label="DEADCODE LABS — back to top">
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
                  className={`relative rounded-full px-4 py-2 text-[0.9rem] font-medium transition-colors ${
                    isActive ? "text-violet" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {l.label}
                  <span
                    aria-hidden
                    className={`absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-violet transition-transform duration-300 ${isActive ? "scale-x-100" : "scale-x-0"}`}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#pricing"
            className="hidden h-10 items-center rounded-full bg-ink px-5 font-display text-[0.88rem] font-semibold text-white transition-colors hover:bg-violet sm:inline-flex"
          >
            Get the Ebook
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-paper-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        ref={menuRef}
        hidden={!open}
        className="border-t border-line bg-paper lg:hidden"
      >
        <ul className="container-page flex flex-col py-3">
          {navLinks.map((l, i) => (
            <li key={l.href} className="motion-safe:animate-[menu-in_0.35s_both]" style={{ animationDelay: `${i * 40}ms` }}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line py-4 font-display text-lg font-semibold text-ink"
              >
                {l.label}
                <span className="text-sm font-normal text-ink-2">0{i + 1}</span>
              </a>
            </li>
          ))}
          <li className="pt-5 pb-3">
            <a
              href="#pricing"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center rounded-full bg-violet font-display font-semibold text-white"
            >
              Get the Ebook
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
