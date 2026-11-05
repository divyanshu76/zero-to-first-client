import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Manrope, Instrument_Serif, Noto_Sans_Devanagari } from "next/font/google";
import { brand, product } from "@/data/product";
import { getDictionary, htmlLang, languageAlternates, localePath, ogLocale, type Locale } from "@/i18n";
import { LocalePreference } from "./LanguageSwitcher";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });
const serif = Instrument_Serif({ variable: "--font-serif-accent", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });
// The ebook itself is set in Noto Sans Devanagari; loaded only on Hindi pages.
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], display: "swap", preload: true });

/** Social preview image (1200×630): the real cover with the product facts. */
export const OG_IMAGE = { url: "/images/og.png", width: 1200, height: 630, alt: "ZERO TO FIRST CLIENT — The AI-Powered Business Starter Kit, 2026 Edition" };

export function rootMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale).meta;
  return {
    metadataBase: new URL(product.siteUrl),
    title: { default: t.title, template: `%s — ${product.displayName}` },
    description: t.description,
    applicationName: product.displayName,
    authors: [{ name: brand.publisher, url: brand.publisherUrl }],
    publisher: brand.seller,
    creator: brand.publisher,
    keywords: [
      "AI business starter kit",
      "how to start freelancing with AI",
      "first freelance client guide",
      "AI-powered services",
      "beginner freelancing guide",
      "start a service business",
      "freelancing with AI in India",
      ...(locale === "hi" ? ["AI से freelancing", "पहला client कैसे पाएँ", "Hindi business ebook"] : []),
    ],
    alternates: { canonical: localePath(locale, "/"), languages: languageAlternates("/") },
    openGraph: { type: "website", url: localePath(locale, "/"), siteName: t.siteName, title: t.title, description: t.description, locale: ogLocale[locale], images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: [OG_IMAGE.url] },
    robots: { index: true, follow: true },
  };
}

export const rootViewport: Viewport = { themeColor: "#FAF9F6", colorScheme: "light" };

/** <html>/<body> for a locale's root layout. Each locale is its own root, so `lang` is right in the prerendered HTML. */
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const fonts = `${inter.variable} ${manrope.variable} ${serif.variable} ${locale === "hi" ? devanagari.variable : ""}`;
  return (
    <html lang={htmlLang[locale]} suppressHydrationWarning className={`${fonts} antialiased`}>
      <body className="min-h-dvh">
        {/* Opt in to scroll-reveal styles only when JS runs (first thing in <body>, before any content paints). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <LocalePreference locale={locale} />
        {children}
      </body>
    </html>
  );
}
