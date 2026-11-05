import "server-only";
import { en, type Dictionary } from "./dictionaries/en";
import { hi } from "./dictionaries/hi";
import type { Locale } from "./config";

export type { Dictionary } from "./dictionaries/en";
export * from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, hi };

/** Dictionaries are static modules, so this is synchronous and fully prerenderable. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
