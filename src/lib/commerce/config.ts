import "server-only";

/**
 * Server-only commerce configuration. Secrets are read from process.env here and never
 * leave the server. Nothing in this file is imported by client components.
 */

const env = (name: string) => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
};

/** The product, priced on the server. The browser never chooses the amount. */
export const PRODUCT = {
  id: "ztfc-2026",
  name: "ZERO TO FIRST CLIENT — The AI-Powered Business Starter Kit (2026 Edition)",
  shortName: "Zero to First Client",
  amount: 59900, // paise = ₹599 launch price
  currency: "INR" as const,
};

export type CheckoutMode = "test" | "live";

export function razorpayKeys() {
  const keyId = env("RAZORPAY_KEY_ID");
  const keySecret = env("RAZORPAY_KEY_SECRET");
  const webhookSecret = env("RAZORPAY_WEBHOOK_SECRET");
  // Only Razorpay's own prefixes count; anything else is "unknown" and keeps checkout closed.
  const mode: CheckoutMode | "unknown" | null = keyId ? (keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : "unknown") : null;
  return { keyId, keySecret, webhookSecret, mode };
}

/** Names (never values) of required variables that aren't set. */
export function missingEnv(): string[] {
  const required = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"];
  if (storeDriver() === "supabase" || storageDriver() === "supabase") required.push("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  if (storageDriver() === "supabase") required.push("EBOOK_STORAGE_PATH");
  if (emailDriver() === "resend") required.push("RESEND_API_KEY", "EMAIL_FROM", "SUPPORT_EMAIL", "OWNER_EMAIL");
  return required.filter((n) => !env(n));
}

export const storeDriver = () => (env("COMMERCE_STORE") ?? "memory") as "memory" | "supabase";
export const storageDriver = () => (env("COMMERCE_STORAGE") ?? "local") as "local" | "supabase";
export const emailDriver = () => (env("COMMERCE_EMAIL") ?? "outbox") as "outbox" | "resend";

export const razorpayApiBase = () => env("RAZORPAY_API_BASE") ?? "https://api.razorpay.com";
export const resendApiBase = () => env("RESEND_API_BASE") ?? "https://api.resend.com";

/** Public origin used in email links (no trailing slash). */
export const appOrigin = () => (env("APP_ORIGIN") ?? env("NEXT_PUBLIC_SITE_URL") ?? "https://craftandcode.tech").replace(/\/$/, "");

/** Signed download URLs expire after 15 minutes; the access link itself lasts 30 days. */
export const SIGNED_URL_TTL_SECONDS = 15 * 60;
export const ACCESS_TOKEN_TTL_DAYS = 30;

/**
 * Checkout is OFF unless CHECKOUT_ENABLED=true. In Test Mode it additionally requires an
 * email allowlist (CHECKOUT_TEST_EMAILS), so a test card on the public site can't be used
 * to obtain the real ebook. Live Mode is refused unless CHECKOUT_LIVE_APPROVED=true.
 */
export function checkoutStatus(): { enabled: boolean; mode: CheckoutMode | "unknown" | null; reason?: string } {
  const { keyId, keySecret, mode } = razorpayKeys();
  if (mode === "unknown") return { enabled: false, mode, reason: "unrecognised-key" };
  if (env("CHECKOUT_ENABLED") !== "true") return { enabled: false, mode, reason: "disabled" };
  if (!keyId || !keySecret) return { enabled: false, mode, reason: "missing-keys" };
  if (mode === "live" && env("CHECKOUT_LIVE_APPROVED") !== "true") return { enabled: false, mode, reason: "live-not-approved" };
  if (mode === "test" && testAllowlist().length === 0) return { enabled: false, mode, reason: "test-allowlist-empty" };
  return { enabled: true, mode };
}

export function testAllowlist(): string[] {
  return (env("CHECKOUT_TEST_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Exact addresses, or "@domain" entries for a whole test domain. */
export function isTestAllowed(email: string) {
  return testAllowlist().some((a) => (a.startsWith("@") ? email.endsWith(a) : email === a));
}

export function ebookStoragePath() {
  return env("EBOOK_STORAGE_PATH") ?? "ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf";
}
export function ebookBucket() {
  return env("SUPABASE_BUCKET") ?? "ebooks";
}
export function supabaseConfig() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}
export function resendConfig() {
  const key = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  return key && from ? { key, from } : null;
}
/** Support address shown in emails and receipts: SUPPORT_EMAIL, else the public NEXT_PUBLIC_SUPPORT_EMAIL. */
export const supportEmail = () => env("SUPPORT_EMAIL") ?? env("NEXT_PUBLIC_SUPPORT_EMAIL");

/** Owner / admin notification address for new verified purchase alerts. */
export const ownerEmail = () => env("OWNER_EMAIL");
/** The secure link is the primary delivery. The ebook PDF is also attached only when EMAIL_ATTACH_EBOOK=true. */
export const attachEbookToEmail = () => env("EMAIL_ATTACH_EBOOK") === "true";

/** Local file driver (development/tests only): an HMAC key for its signed URLs. Refused on Vercel. */
export function localStorageSecret() {
  if (process.env.VERCEL) return null;
  return env("LOCAL_STORAGE_SECRET") ?? env("RAZORPAY_WEBHOOK_SECRET");
}

/**
 * Checkout recovery. RECOVERY_CRON_SECRET is a dedicated random value (also kept in Supabase Vault)
 * used only to verify the scheduler's HMAC signature; it is never the Supabase service-role key.
 * CRON_SECRET is the bearer token Vercel Cron sends to the daily watchdog.
 * Both fail closed: when unset (or shorter than 32 characters) the endpoints refuse every call.
 */
export const recoveryCronSecret = () => {
  const v = env("RECOVERY_CRON_SECRET");
  return v && v.length >= 32 ? v : null;
};
export const vercelCronSecret = () => {
  const v = env("CRON_SECRET");
  return v && v.length >= 16 ? v : null;
};
/**
 * Tests only: lets the automated suite move the recovery clock forward. Refused on Vercel and
 * whenever live Razorpay keys are configured, so it can never affect the real store.
 */
export const recoveryClockOverrideAllowed = () => !process.env.VERCEL && env("RECOVERY_TEST_CLOCK") === "true" && razorpayKeys().mode !== "live";

export const ADMIN_PASSWORD_MIN = 9;
export const ADMIN_PASSWORD_MAX = 10;

export function adminCredentials() {
  const user = env("ADMIN_USER");
  const pass = env("ADMIN_PASSWORD");
  // Owner's choice: 9–10 characters. Brute force is limited by the per-IP rate limit on failed logins.
  return user && pass && pass.length >= ADMIN_PASSWORD_MIN && pass.length <= ADMIN_PASSWORD_MAX ? { user, pass } : null;
}
