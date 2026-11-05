import type { MetadataRoute } from "next";
import { product } from "@/data/product";
import { locales, localePath } from "@/i18n/config";
import { policySlugs } from "@/i18n/policies/types";

/** Every page in every locale, each with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = product.siteUrl.replace(/\/$/, "");
  const url = (path: string) => `${base}${path === "/" ? "/" : path}`;
  const paths = ["/", ...policySlugs.map((s) => `/${s}`)];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: url(localePath(locale, path)),
      changeFrequency: path === "/" ? ("monthly" as const) : ("yearly" as const),
      priority: path === "/" ? 1 : 0.3,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, url(localePath(l, path))])) },
    })),
  );
}
