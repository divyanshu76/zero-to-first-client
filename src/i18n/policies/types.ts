import type { ReactNode } from "react";
import type { Locale } from "../config";
import type { PolicyHelpers } from "@/components/landing/LegalPage";

/** One policy page in one language. `body` receives locale-bound link/placeholder helpers. */
export type PolicyLocaleContent = {
  title: string;
  description: string;
  summary: (h: PolicyHelpers) => ReactNode;
  body: (h: PolicyHelpers) => ReactNode;
  /** Overrides the shared "Last updated" date when only this policy changed. */
  updated?: string;
};

/** Every policy must exist in every locale; a missing language is a type error. */
export type PolicyContent = Record<Locale, PolicyLocaleContent>;

export const policySlugs = ["privacy", "terms", "refund", "delivery", "disclaimer", "copyright", "contact"] as const;
export type PolicySlug = (typeof policySlugs)[number];
