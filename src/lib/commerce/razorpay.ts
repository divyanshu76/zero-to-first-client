import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PRODUCT, razorpayApiBase, razorpayKeys } from "./config";

/** Constant-time comparison of two hex HMAC digests. */
export function safeEqualHex(expected: string, received: string | null | undefined): boolean {
  if (!received || !/^[0-9a-f]+$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** Razorpay Standard Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string | null | undefined, keySecret: string) {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret), in X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string | null | undefined, webhookSecret: string) {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string; receipt?: string };
export type RazorpayPayment = { id: string; order_id: string | null; amount: number; currency: string; status: string; email?: string | null; error_description?: string | null };

class RazorpayError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { keyId, keySecret } = razorpayKeys();
  if (!keyId || !keySecret) throw new RazorpayError("Razorpay keys are not configured", 503);
  const res = await fetch(`${razorpayApiBase()}${path}`, {
    method,
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // Never echo Razorpay's raw response (it can include request details).
    throw new RazorpayError(`Razorpay ${method} ${path.split("?")[0]} failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/** Creates an order for the server-defined product amount. */
export function createRazorpayOrder(receipt: string, notes: Record<string, string>) {
  return call<RazorpayOrder>("POST", "/v1/orders", {
    amount: PRODUCT.amount,
    currency: PRODUCT.currency,
    receipt,
    notes,
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new RazorpayError("Invalid payment id", 400);
  return call<RazorpayPayment>("GET", `/v1/payments/${paymentId}`);
}

/**
 * Every payment attempt made against one Razorpay order (used before a checkout reminder, when we
 * may not know any payment id yet: a delayed or missed webhook must never lead to a reminder).
 */
export async function fetchRazorpayOrderPayments(razorpayOrderId: string) {
  if (!/^order_[A-Za-z0-9]+$/.test(razorpayOrderId)) throw new RazorpayError("Invalid order id", 400);
  const res = await call<{ items?: RazorpayPayment[] }>("GET", `/v1/orders/${razorpayOrderId}/payments`);
  if (!Array.isArray(res.items)) throw new RazorpayError("Unexpected Razorpay response", 502);
  return res.items;
}

/** A payment counts only if it belongs to our order, for the exact amount and currency. */
export function paymentMatchesOrder(p: RazorpayPayment, razorpayOrderId: string) {
  return p.order_id === razorpayOrderId && p.amount === PRODUCT.amount && p.currency === PRODUCT.currency;
}
