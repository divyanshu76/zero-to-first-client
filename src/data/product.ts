/**
 * Central product configuration.
 *
 * Every number below has been checked against
 * reference/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf (Edition 1.0, 142 pages).
 * Pricing, checkout and policy values are deliberately left unset until the
 * publisher supplies them — the UI renders an honest "not yet open" state.
 */

export type CurrencyCode = "INR" | "USD";

export type PriceConfig = {
  currency: CurrencyCode;
  /** Final price in major units (e.g. 499 for ₹499). `null` = not announced. */
  amount: number | null;
  /** Only set when a genuine, time-bound discount exists. */
  compareAt: number | null;
  /** Hosted checkout URL (Razorpay Payment Page, Lemon Squeezy, Gumroad...). */
  checkoutUrl: string | null;
  /** Short line under the price, e.g. "Incl. GST" — only once confirmed. */
  note: string | null;
};

const env = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : null);
const num = (v: string | undefined) => {
  const s = env(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const product = {
  name: "ZERO TO FIRST CLIENT",
  displayName: "Zero to First Client",
  subtitle: "The AI-Powered Business Starter Kit",
  tagline: "Learn AI. Build Your Service. Find Your First Paying Client.",
  edition: "2026 Edition",
  editionNumber: "Edition 1.0",
  publisher: "DEADCODE LABS",
  publisherUrl: "https://deadcode.space/",
  resourcesUrl: "https://ztfc-resources.vercel.app/",
  /**
   * The resource hub is currently public (direct file links, no login).
   * Linking it from a sales page hands every bonus file to every visitor,
   * so it is hidden from the public page until delivery is gated.
   * Flip to `true` only if you deliberately want the hub public.
   */
  showResourceHubPublicly: env(process.env.NEXT_PUBLIC_SHOW_RESOURCE_HUB) === "true",
  pages: 142,
  researchCutoff: "5 November 2026",
  language: "Hindi explanations with English business terms; prompts and message scripts in English or Roman Hinglish",
  format: "Digital PDF",
  siteUrl: env(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000",
  contactUrl: env(process.env.NEXT_PUBLIC_CONTACT_URL) ?? "https://deadcode.space/",
} as const;

/** Verified product facts — used by the hero counters, OG image and JSON-LD. */
export const stats = [
  { value: 10, label: "Chapters", detail: "Four stages, from idea to a 30-day plan" },
  { value: 141, label: "AI prompts", detail: "104 in the library + 37 inside chapters" },
  { value: 20, label: "Templates", detail: "Editable DOCX and XLSX files" },
  { value: 7, label: "Calculator sheets", detail: "One Excel workbook" },
  { value: 24, label: "Diagrams", detail: "Original figures drawn for the book" },
] as const;

export const pricing: Record<CurrencyCode, PriceConfig> = {
  INR: {
    currency: "INR",
    amount: num(process.env.NEXT_PUBLIC_PRICE_INR),
    compareAt: num(process.env.NEXT_PUBLIC_COMPARE_AT_INR),
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

/** Policies the publisher has not yet supplied. `null` renders a clear notice. */
export const policies = {
  refund: env(process.env.NEXT_PUBLIC_REFUND_POLICY) as string | null,
  updates: env(process.env.NEXT_PUBLIC_UPDATES_POLICY) as string | null,
  delivery: env(process.env.NEXT_PUBLIC_DELIVERY_NOTE) as string | null,
};

export function isPurchasable(p: PriceConfig) {
  return p.amount !== null && p.checkoutUrl !== null;
}

export function formatPrice(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
