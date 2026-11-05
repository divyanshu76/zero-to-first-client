import type { Metadata } from "next";
import { policies, type PolicySlug } from "@/i18n/policies";
import { languageAlternates, localePath, ogLocale, type Locale } from "@/i18n/config";
import { LegalPage, policyHelpers } from "./LegalPage";
import { OG_IMAGE } from "./RootShell";

/** One policy page, rendered from src/i18n/policies/<slug>.tsx in the given locale. */
export function PolicyPage({ slug, locale }: { slug: PolicySlug; locale: Locale }) {
  const c = policies[slug][locale];
  const h = policyHelpers(locale);
  return (
    <LegalPage locale={locale} title={c.title} summary={c.summary(h)}>
      {c.body(h)}
    </LegalPage>
  );
}

export function policyMetadata(slug: PolicySlug, locale: Locale): Metadata {
  const c = policies[slug][locale];
  const path = `/${slug}`;
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: localePath(locale, path), languages: languageAlternates(path) },
    openGraph: { title: c.title, description: c.description, url: localePath(locale, path), locale: ogLocale[locale], images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: c.title, description: c.description, images: [OG_IMAGE.url] },
  };
}
