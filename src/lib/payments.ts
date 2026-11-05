import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-side payment helpers. Never import from a Client Component.
 * Secrets come from environment variables only (see .env.example).
 */

export function verifyRazorpayWebhook(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type VerifiedPayment = {
  provider: "razorpay";
  paymentId: string;
  orderId: string | null;
  email: string | null;
  amount: number; // minor units (paise / cents)
  currency: string;
};

/**
 * Integration point for buyer-only delivery. Called ONLY after a signed webhook
 * has been verified. Not implemented yet — see docs/PAYMENTS_AND_DELIVERY.md.
 *
 * A real implementation should: (1) record the payment idempotently by paymentId,
 * (2) create a time-limited, signed download link for private storage,
 * (3) email it to the buyer.
 */
export async function fulfillOrder(payment: VerifiedPayment): Promise<{ delivered: boolean }> {
  console.warn(`[payments] Verified payment ${payment.paymentId} received, but delivery is not configured yet.`);
  return { delivered: false };
}
