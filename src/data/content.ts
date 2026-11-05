/**
 * Structural, language-neutral page data. All copy lives in src/i18n/dictionaries;
 * entries here line up by index with the matching dictionary arrays.
 */

export const navTargets = ["#inside", "#preview", "#how-it-works", "#pricing", "#faq"] as const;
export const navKeys = ["inside", "preview", "howItWorks", "pricing", "faq"] as const;

/** Real pages rendered from the PDF, in the order of `preview.items` in the dictionaries. */
export const previewPages = [
  { src: "/images/pages/contents.webp", page: "p. ix" },
  { src: "/images/pages/roadmap.webp", page: "p. viii" },
  { src: "/images/pages/chapter-01.webp", page: "p. 1" },
  { src: "/images/pages/prompt-framework.webp", page: "p. 13" },
  { src: "/images/pages/packages.webp", page: "p. 22" },
  { src: "/images/pages/market-research.webp", page: "p. 30" },
  { src: "/images/pages/pricing.webp", page: "p. 47" },
  { src: "/images/pages/prompt-library.webp", page: "p. 90" },
  { src: "/images/pages/templates.webp", page: "p. 106" },
  { src: "/images/pages/calculators.webp", page: "p. 120" },
  { src: "/images/pages/thirty-days.webp", page: "p. 83" },
] as const;

/** Book chapter references for the six use cases (helps.applications). */
export const applicationChapters = ["Ch. 1 & 3", "Ch. 5 & 8", "Ch. 3", "Ch. 2 & 3", "Ch. 6 & 8", "Ch. 10"] as const;

/** Locale-neutral policy paths; labels come from `policyNames` in the dictionaries. */
export const policyPaths = [
  { path: "/privacy", key: "privacy" },
  { path: "/terms", key: "terms" },
  { path: "/refund", key: "refund" },
  { path: "/delivery", key: "delivery" },
  { path: "/disclaimer", key: "disclaimer" },
  { path: "/copyright", key: "copyright" },
] as const;

export const contactPath = "/contact";
