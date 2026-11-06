import { after } from "next/server";
import { razorpayKeys } from "@/lib/commerce/config";
import { ensureDelivered, issueAccessToken } from "@/lib/commerce/fulfil";
import { badRequest, crossSite, fail, json, readJson, sameOrigin, str } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { fetchRazorpayPayment, paymentMatchesOrder, verifyPaymentSignature } from "@/lib/commerce/razorpay";
import { getStore, type OrderStatus } from "@/lib/commerce/store";

/**
 * POST /api/checkout/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * 1. Verifies the checkout signature (HMAC-SHA256, constant-time compare).
 * 2. Confirms the payment with Razorpay's API: same order, ₹599, INR, captured.
 * Only then is the order paid. The browser's word alone never grants access.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`verify:${clientIp(request)}`, 20, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { keySecret } = razorpayKeys();
  if (!keySecret) return fail(503, "checkout_closed", "Checkout is not configured.");

  const body = await readJson(request);
  const orderId = str(body?.razorpay_order_id, 40);
  const paymentId = str(body?.razorpay_payment_id, 40);
  const signature = str(body?.razorpay_signature, 128);
  if (!/^order_[A-Za-z0-9]{6,32}$/.test(orderId) || !/^pay_[A-Za-z0-9]{6,32}$/.test(paymentId) || !signature) return badRequest();

  if (!verifyPaymentSignature(orderId, paymentId, signature, keySecret)) {
    console.warn(`[commerce] invalid checkout signature for ${orderId}`);
    return fail(400, "invalid_signature", "We couldn't verify this payment.");
  }

  const store = getStore();
  try {
    const order = await store.getByRazorpayOrderId(orderId);
    if (!order) return fail(404, "unknown_order", "We couldn't find this order.");
    if (order.status === "refunded") return fail(409, "refunded", "This order was refunded.");

    let status: OrderStatus = order.status;
    if (status !== "paid") {
      let payment = null;
      try {
        payment = await fetchRazorpayPayment(paymentId);
      } catch (e) {
        // Razorpay unreachable: the signature is valid, so wait for the webhook / later reconciliation.
        console.warn(`[commerce] payment lookup failed for ${order.id}: ${(e as Error).message}`);
      }
      if (payment && !paymentMatchesOrder(payment, orderId)) {
        console.error(`[commerce] payment ${paymentId} does not match order ${order.id}`);
        return fail(400, "payment_mismatch", "This payment doesn't match the order.");
      }
      if (payment?.status === "captured") {
        const res = await store.markPaid(orderId, paymentId);
        status = res.order?.status ?? status;
      } else if (payment?.status === "failed") {
        status = (await store.markFailed(orderId, paymentId))?.status ?? "failed";
      } else {
        status = (await store.markProcessing(orderId, paymentId))?.status ?? status;
      }
    }

    if (status === "failed") return fail(402, "payment_failed", "The payment didn't go through. You haven't been charged for the ebook.");
    if (status === "paid") after(() => ensureDelivered(order.id).then(() => undefined));
    const token = await issueAccessToken(order.id);
    return json({ status: status === "paid" ? "paid" : "processing", orderId: order.id, token });
  } catch (e) {
    console.error(`[commerce] verify failed for ${orderId}: ${(e as Error).message}`);
    return fail(503, "temporarily_unavailable", "Your payment is safe. We couldn't confirm it just now; please refresh in a minute or check your email.");
  }
}
