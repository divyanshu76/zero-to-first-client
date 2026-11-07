import { randomBytes } from "node:crypto";
import { PRODUCT, checkoutStatus, isTestAllowed } from "@/lib/commerce/config";
import { badRequest, cleanEmail, cleanLocale, cleanName, cleanPhone, crossSite, fail, json, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { createRazorpayOrder } from "@/lib/commerce/razorpay";
import { CONSENT_VERSION, resolveResumeToken } from "@/lib/commerce/recovery";
import { getStore } from "@/lib/commerce/store";

/**
 * Optional reminder opt-ins (both unticked by default; only an explicit `true` counts) and, for a
 * "Continue checkout" link, which earlier checkout this one resumes. Recorded after the order exists
 * and never allowed to break checkout: if it fails, the order simply has no consent (= no reminders).
 */
/**
 * The checkout form is unverified: anyone can type someone else's address. To keep the reminder
 * opt-in from being used to send mail to strangers, one network address may record reminder
 * consent for at most 3 checkouts per hour; beyond that the order is created normally but without
 * consent (= no reminders). Other limits apply too: 3 reminder emails per address in 30 days.
 */
const CONSENT_PER_IP = 3;
const CONSENT_WINDOW_MS = 60 * 60_000;

async function recordConsent(orderId: string, email: string, body: Record<string, unknown>, ip: string) {
  const at = new Date().toISOString();
  const wantsReminders = body.remindEmail === true || body.remindWhatsapp === true;
  const allowed = !wantsReminders || rateLimit(`consent:${ip}`, CONSENT_PER_IP, CONSENT_WINDOW_MS).ok;
  if (!allowed) console.warn(`[commerce] reminder consent not recorded for ${orderId}: per-IP opt-in limit reached`);
  const emailAt = allowed && body.remindEmail === true ? at : null;
  const whatsappAt = allowed && body.remindWhatsapp === true ? at : null;
  let recoveredFromOrderId: string | null = null;
  try {
    // Attributed only when the link belongs to the same email address.
    const prev = body.resumeToken ? await resolveResumeToken(body.resumeToken) : null;
    if (prev && prev.customerEmail === email && prev.id !== orderId) recoveredFromOrderId = prev.id;
  } catch {}
  if (!emailAt && !whatsappAt && !recoveredFromOrderId) return;
  try {
    await getStore().setConsent(orderId, { emailAt, whatsappAt, version: CONSENT_VERSION, recoveredFromOrderId });
  } catch (e) {
    console.error(`[commerce] consent not recorded for ${orderId}: ${(e as Error).message}`);
  }
}

/**
 * POST /api/checkout/create-order  { name, email, phone, locale }
 * Creates a Razorpay order for the server-defined price (₹599 = 59900 paise). Any amount,
 * currency or product sent by the browser is ignored.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();

  const status = checkoutStatus();
  if (!status.enabled) return fail(503, "checkout_closed", "Checkout is not open yet.");

  const ip = clientIp(request);
  const rl = rateLimit(`create:${ip}`, 10, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const body = await readJson(request);
  if (!body) return badRequest();
  if (typeof body.website === "string" && body.website) return badRequest(); // honeypot
  const name = cleanName(body.name);
  const email = cleanEmail(body.email);
  const phone = cleanPhone(body.phone);
  const locale = cleanLocale(body.locale);
  if (!name) return fail(422, "invalid_name", "Please enter your name (2–100 characters).");
  if (!email) return fail(422, "invalid_email", "Please enter a valid email address.");
  // Razorpay needs the buyer's contact number; collecting it here means its window doesn't ask again.
  if (!phone) return fail(422, "invalid_phone", "Please enter a valid 10-digit Indian mobile number.");

  const rle = rateLimit(`create-email:${email}`, 5, 10 * 60_000);
  if (!rle.ok) return tooMany(rle.retryAfter);

  // While the merchant account is under review, Test Mode checkout is limited to the owner's test addresses.
  if (status.mode === "test" && !isTestAllowed(email)) {
    // Server-side gate: in Test Mode only CHECKOUT_TEST_EMAILS may create orders (never decided by the browser).
    return fail(403, "checkout_restricted", "Checkout is in Test Mode and isn't open to customers yet: only the store's registered test email can pay right now.");
  }

  const store = getStore();
  try {
    // No "already purchased" check here: answering differently for existing buyers would reveal
    // who has bought. Buyers who lost their link use /api/purchase/resend (identical replies).
    const id = `ord_${randomBytes(12).toString("hex")}`;
    // Test Mode orders carry a ":test" product suffix so the dashboard can label and exclude them from revenue.
    const rzp = await createRazorpayOrder(id, { internal_order_id: id, product: PRODUCT.id });
    if (rzp.amount !== PRODUCT.amount || rzp.currency !== PRODUCT.currency) throw new Error("Razorpay order amount mismatch");
    await store.createOrder({ id, productId: status.mode === "test" ? `${PRODUCT.id}:test` : PRODUCT.id, customerName: name, customerEmail: email, customerPhone: phone, locale, amount: PRODUCT.amount, currency: PRODUCT.currency, razorpayOrderId: rzp.id });
    await recordConsent(id, email, body, ip);

    return json({ orderId: id, razorpayOrderId: rzp.id, contact: phone, ownerTest: status.mode === "test", amount: PRODUCT.amount, currency: PRODUCT.currency, mode: status.mode }, 201);
  } catch (e) {
    console.error(`[commerce] create-order failed: ${(e as Error).message}`);
    return fail(502, "order_failed", "We couldn't start the payment. Please try again in a moment.");
  }
}
