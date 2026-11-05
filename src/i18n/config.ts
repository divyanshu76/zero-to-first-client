/**
 * Locale configuration. English is served at "/" (unchanged URLs) and Hindi at "/hi".
 * Each locale has its own root layout (route groups), so <html lang> and metadata are
 * correct in the prerendered HTML: no client-side language flash, no hydration mismatch.
 */
export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const htmlLang: Record<Locale, string> = { en: "en", hi: "hi" };
export const ogLocale: Record<Locale, string> = { en: "en_IN", hi: "hi_IN" };
export const localeLabel: Record<Locale, string> = { en: "English", hi: "हिन्दी" };
export const localeShort: Record<Locale, string> = { en: "EN", hi: "हिन्दी" };

/** Storage key for the visitor's explicit language choice. */
export const LOCALE_STORAGE_KEY = "ztfc-locale";

/** Path of a page in a locale: localePath("hi", "/refund") → "/hi/refund", localePath("en", "/") → "/". */
export function localePath(locale: Locale, path = "/") {
  const clean = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** The locale-neutral path of any URL pathname: "/hi/refund" → "/refund", "/hi" → "/". */
export function stripLocale(pathname: string) {
  for (const l of locales) {
    if (l === defaultLocale) continue;
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
  }
  return pathname || "/";
}

export function localeFromPath(pathname: string): Locale {
  return locales.find((l) => l !== defaultLocale && (pathname === `/${l}` || pathname.startsWith(`/${l}/`))) ?? defaultLocale;
}

/** hreflang alternates for a locale-neutral path, for Next metadata. */
export function languageAlternates(path: string) {
  return { en: localePath("en", path), hi: localePath("hi", path), "x-default": localePath("en", path) };
}

/** Fill {placeholders} in a dictionary string. */
export function fmt(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}
