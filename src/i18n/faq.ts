import { deliveryLive, policies } from "@/data/product";
import type { Dictionary } from "./dictionaries/en";

/** FAQ entries with the two answers that depend on live configuration filled in. */
export function faqItems(t: Dictionary["faq"]) {
  return t.items.map((item, i) => {
    if (i === 6) return { q: item.q, a: deliveryLive ? t.deliveryLive : t.deliveryPending };
    if (i === 11) return { q: item.q, a: policies.updates ?? t.updatesPending };
    return item;
  });
}
