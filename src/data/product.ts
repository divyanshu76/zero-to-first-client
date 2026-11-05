/**
 * Central product, brand and pricing configuration: the single source of truth.
 *
 * Product facts are checked against reference/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf
 * (Edition 1.0, 142 pages). Business details that haven't been supplied stay `null`, and
 * the UI and policy pages then say so plainly instead of inventing them.
 * docs/LAUNCH_CHECKLIST.md lists everything that still needs confirmation.
 */

export type CurrencyCode = "INR" | "USD";

export type PriceConfig = {
  currency: CurrencyCode;
  /** Price the buyer pays, in major units (599 = ₹599). `null` = not offered in this currency. */
  amount: number | null;
  /** Regular/reference price, shown struck through. Must be a genuine price (see LAUNCH_CHECKLIST). */
  compareAt: number | null;
  /** Hosted checkout URL. The amount charged there must equal `amount`. */
  checkoutUrl: string | null;
  /** Short line under the price, e.g. "Inclusive of all taxes" — only once confirmed. */
  note: string | null;
};

const env = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : null);
const num = (v: string | undefined, fallback: number | null = null) => {
  const s = env(v);
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Brand architecture: CRAFT & CODE sells it, DEADCODE LABS publishes it; both are brands of one business. */
export const brand = {
  seller: "CRAFT & CODE",
  sellerUrl: "https://craftandcode.tech",
  publisher: "DEADCODE LABS",
  publisherUrl: "https://deadcode.space/",
  /** Legal name of the business that operates both brands. Not supplied yet. */
  legalEntity: env(process.env.NEXT_PUBLIC_LEGAL_ENTITY) as string | null,
  /** City / state for governing law and jurisdiction. Not supplied yet. */
  jurisdiction: env(process.env.NEXT_PUBLIC_JURISDICTION) as string | null,
} as const;

/** Customer support. Nothing is invented; unset values render as "not published yet". */
export const support = {
  email: env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) as string | null,
  /** Grievance officer (Consumer Protection (E-Commerce) Rules, 2020). Name + email required before launch. */
  grievanceOfficer: env(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER) as string | null,
  grievanceEmail: env(process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL) as string | null,
  /** Response time the business commits to. Unset until the business confirms it. */
  responseTime: env(process.env.NEXT_PUBLIC_SUPPORT_RESPONSE_TIME) as string | null,
  fallbackUrl: brand.publisherUrl,
} as const;

export const product = {
  name: "ZERO TO FIRST CLIENT",
  displayName: "Zero to First Client",
  subtitle: "The AI-Powered Business Starter Kit",
  tagline: "Learn AI. Build Your Service. Find Your First Paying Client.",
  edition: "2026 Edition",
  editionNumber: "Edition 1.0",
  publisher: brand.publisher,
  publisherUrl: brand.publisherUrl,
  seller: brand.seller,
  resourcesUrl: "https://ztfc-resources.vercel.app/",
  /** The resource hub is public (direct file links). Keep hidden until delivery is gated. */
  showResourceHubPublicly: env(process.env.NEXT_PUBLIC_SHOW_RESOURCE_HUB) === "true",
  pages: 142,
  researchCutoff: "5 November 2026",
  language: "Hindi explanations with English business terms; prompts and message scripts in English or Roman Hinglish",
  format: "Digital download (PDF, DOCX, XLSX)",
  siteUrl: env(process.env.NEXT_PUBLIC_SITE_URL) ?? brand.sellerUrl,
  contactUrl: "/contact",
} as const;

/** Verified product facts, used by the facts strip, pricing, the OG image and JSON-LD. */
export const stats = [
  { value: 142, label: "Pages" },
  { value: 10, label: "Chapters" },
  { value: 141, label: "AI prompts" },
  { value: 20, label: "Templates" },
  { value: 7, label: "Calculator sheets" },
  { value: 24, label: "Diagrams" },
] as const;

/**
 * Launch pricing. ₹599 launch price, ₹999 regular price. Env vars can override both
 * without a code change. USD stays off until a USD price is confirmed.
 */
export const pricing: Record<CurrencyCode, PriceConfig> = {
  INR: {
    currency: "INR",
    amount: num(process.env.NEXT_PUBLIC_PRICE_INR, 599),
    compareAt: num(process.env.NEXT_PUBLIC_COMPARE_AT_INR, 999),
    checkoutUrl: env(process.env.NEXT_PUBLIC_CHECKOUT_URL_INR),
    note: env(process.env.NEXT_PUBLIC_PRICE_NOTE_INR),
  },
  USD: {
    currency: "USD",
    amount: num(process.env.NEXT_PUBLIC_PRICE_USD),
    compareAt: num(process.env.NEXT_PUBLIC_COMPARE_AT_USD),
    checkoutUrl: env(process.env.NEXT_PUBLIC_CHECKOUT_URL_USD),
    note: env(process.env.NEXT_PUBLIC_PRICE_NOTE_USD),
  },
};

/** Labels for the launch offer. No dates or quantity limits are configured, so none are shown. */
export const offer = {
  label: "Launch offer",
  regularLabel: "Regular price",
} as const;

/** Policies the business hasn't confirmed yet. `null` renders a clear notice. */
export const policies = {
  updates: env(process.env.NEXT_PUBLIC_UPDATES_POLICY) as string | null,
};

/** True only when buyers can actually pay: a price and a real checkout URL. */
export function isPurchasable(p: PriceConfig) {
  return p.amount !== null && p.checkoutUrl !== null;
}

/** Delivery is live only once checkout is live and the webhook delivery is implemented. */
export const deliveryLive = env(process.env.NEXT_PUBLIC_DELIVERY_LIVE) === "true";

export function formatPrice(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function discountPercent(p: PriceConfig) {
  if (p.amount === null || p.compareAt === null || p.compareAt <= p.amount) return null;
  return Math.round((1 - p.amount / p.compareAt) * 100);
}
