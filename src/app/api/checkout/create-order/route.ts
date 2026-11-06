import { randomBytes } from "node:crypto";
import { PRODUCT, checkoutStatus, isTestAllowed } from "@/lib/commerce/config";
import { badRequest, cleanEmail, cleanLocale, cleanName, cleanPhone, crossSite, fail, json, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { createRazorpayOrder } from "@/lib/commerce/razorpay";
import { getStore } from "@/lib/commerce/store";

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
    return fail(403, "checkout_restricted", "Checkout is in test mode and isn't open to customers yet.");
  }

  const store = getStore();
  try {
    // No "already purchased" check here: answering differently for existing buyers would reveal
    // who has bought. Buyers who lost their link use /api/purchase/resend (identical replies).
    const id = `ord_${randomBytes(12).toString("hex")}`;
    const rzp = await createRazorpayOrder(id, { internal_order_id: id, product: PRODUCT.id });
    if (rzp.amount !== PRODUCT.amount || rzp.currency !== PRODUCT.currency) throw new Error("Razorpay order amount mismatch");
    await store.createOrder({ id, productId: PRODUCT.id, customerName: name, customerEmail: email, customerPhone: phone, locale, amount: PRODUCT.amount, currency: PRODUCT.currency, razorpayOrderId: rzp.id });

    return json({ orderId: id, razorpayOrderId: rzp.id, contact: phone, amount: PRODUCT.amount, currency: PRODUCT.currency, mode: status.mode }, 201);
  } catch (e) {
    console.error(`[commerce] create-order failed: ${(e as Error).message}`);
    return fail(502, "order_failed", "We couldn't start the payment. Please try again in a moment.");
  }
}
