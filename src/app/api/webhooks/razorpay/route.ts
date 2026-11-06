import { createHash } from "node:crypto";
import { razorpayKeys } from "@/lib/commerce/config";
import { ensureDelivered } from "@/lib/commerce/fulfil";
import { json } from "@/lib/commerce/http";
import { paymentMatchesOrder, verifyWebhookSignature, type RazorpayPayment } from "@/lib/commerce/razorpay";
import { getStore } from "@/lib/commerce/store";

/**
 * Razorpay webhook (Dashboard → Webhooks). Subscribe to: order.paid, payment.failed,
 * and optionally payment.captured, payment.authorized, refund.processed.
 *
 * - The signature is an HMAC-SHA256 of the RAW body with RAZORPAY_WEBHOOK_SECRET.
 * - Each event id is processed once (x-razorpay-event-id is stored with a unique key).
 * - If processing fails (database or email down), the event is forgotten and a 5xx is
 *   returned so Razorpay retries it later.
 */
type Event = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPayment & { amount_refunded?: number } };
    order?: { entity?: { id: string; amount: number; currency: string; status: string } };
  };
};

export async function POST(request: Request) {
  const { webhookSecret } = razorpayKeys();
  if (!webhookSecret) return json({ error: "Payments are not configured." }, 503);

  const raw = await request.text();
  if (raw.length > 1_000_000) return json({ error: "Payload too large." }, 413);
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"), webhookSecret)) {
    return json({ error: "Invalid signature." }, 401);
  }

  let event: Event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Malformed payload." }, 400);
  }
  const type = typeof event.event === "string" ? event.event : "unknown";
  const eventId = request.headers.get("x-razorpay-event-id")?.slice(0, 100) || `sha256:${createHash("sha256").update(raw).digest("hex")}`;

  const store = getStore();
  let fresh: boolean;
  try {
    fresh = await store.recordWebhookEvent(eventId, type);
  } catch (e) {
    console.error(`[commerce] webhook ${type}: event store unavailable: ${(e as Error).message}`);
    return json({ error: "Temporarily unavailable." }, 503);
  }
  if (!fresh) return json({ received: true, duplicate: true });

  try {
    const result = await handle(type, event);
    return json({ received: true, result });
  } catch (e) {
    await store.forgetWebhookEvent(eventId).catch(() => {});
    console.error(`[commerce] webhook ${type} failed, Razorpay will retry: ${(e as Error).message}`);
    return json({ error: "Processing failed; please retry." }, 500);
  }
}

async function handle(type: string, event: Event): Promise<string> {
  const store = getStore();
  const p = event.payload?.payment?.entity;
  if (!p?.order_id) return "ignored";
  const order = await store.getByRazorpayOrderId(p.order_id);
  if (!order) return "ignored:unknown-order"; // another product on the same Razorpay account

  switch (type) {
    case "order.paid":
    case "payment.captured": {
      if (p.status !== "captured" || !paymentMatchesOrder(p, order.razorpayOrderId)) {
        console.error(`[commerce] webhook ${type}: payment ${p.id} does not match order ${order.id}`);
        return "ignored:mismatch";
      }
      const { order: paid } = await store.markPaid(order.razorpayOrderId, p.id);
      if (paid?.status !== "paid") return `ignored:${paid?.status ?? "missing"}`;
      const delivery = await ensureDelivered(paid.id);
      if (delivery === "failed") throw new Error("delivery email failed");
      return `paid:${delivery}`;
    }
    case "payment.authorized":
      await store.markProcessing(order.razorpayOrderId, p.id);
      return "processing";
    case "payment.failed": {
      const updated = await store.markFailed(order.razorpayOrderId, p.id);
      return `failed:${updated?.status}`; // a paid order stays paid
    }
    case "refund.processed": {
      if ((p.amount_refunded ?? 0) >= order.amount) {
        await store.markRefunded(order.razorpayOrderId);
        return "refunded";
      }
      return "partial-refund";
    }
    default:
      return "ignored:event";
  }
}
