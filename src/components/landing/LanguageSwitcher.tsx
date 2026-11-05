"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LOCALE_STORAGE_KEY, locales, localePath, localeShort, localeLabel, stripLocale, type Locale } from "@/i18n/config";

function readStored(): Locale | null {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    return v === "en" || v === "hi" ? v : null;
  } catch {
    return null;
  }
}

function store(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode or blocked storage: the URL still carries the language */
  }
}

/**
 * EN | हिन्दी. Each option is a real link to the same page in the other language
 * (/refund ↔ /hi/refund) and keeps the current section (#hash). The choice is stored,
 * so opening an English URL later returns a Hindi-preferring visitor to Hindi.
 */
export function LanguageSwitcher({ locale, label, className = "" }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname() || "/";
  const neutral = stripLocale(pathname);

  return (
    <div role="group" aria-label={label} className={`inline-flex items-center rounded-full border border-line-strong bg-white/70 p-0.5 ${className}`}>
      {locales.map((l) => {
        const active = l === locale;
        const href = localePath(l, neutral);
        return (
          <a
            key={l}
            href={href}
            hrefLang={l}
            lang={l}
            aria-current={active ? "true" : undefined}
            aria-label={localeLabel[l]}
            onClick={(e) => {
              store(l);
              if (active) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              window.location.assign(href + window.location.hash);
            }}
            className={`press inline-flex h-8 min-w-10 items-center justify-center rounded-full px-2.5 text-[0.8rem] font-semibold ${
              active ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {localeShort[l]}
          </a>
        );
      })}
    </div>
  );
}

/**
 * Returns a visitor who explicitly chose Hindi to the Hindi page when they open an
 * English URL. Visitors who never chose (and crawlers) are left on English.
 */
export function LocalePreference({ locale }: { locale: Locale }) {
  const pathname = usePathname() || "/";
  useEffect(() => {
    // Only English → Hindi: a shared /hi link opened by an English-preferring visitor is a deliberate choice.
    if (locale === "en" && readStored() === "hi") {
      window.location.replace(localePath("hi", stripLocale(pathname)) + window.location.hash);
    }
  }, [locale, pathname]);
  return null;
}
