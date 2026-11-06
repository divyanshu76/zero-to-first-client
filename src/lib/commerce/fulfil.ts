import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ACCESS_TOKEN_TTL_DAYS, appOrigin, attachEbookToEmail, ownerEmail, supportEmail } from "./config";
import { sendEmail, sendOwnerNotification, type Attachment } from "./email";
import { buildReceiptPdf, receiptNumber } from "./receipt";
import { DOWNLOAD_FILENAME, ebookForAttachment } from "./storage";
import { fetchRazorpayPayment, paymentMatchesOrder } from "./razorpay";
import { getStore, type Order } from "./store";

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Issues a new random access token for an order. Only its hash is stored. */
export async function issueAccessToken(orderId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_DAYS * 86_400_000).toISOString();
  await getStore().addAccessToken(orderId, hashToken(token), expiresAt);
  return token;
}

export type Entitlement =
  | { ok: true; order: Order }
  | { ok: false; reason: "invalid" | "expired" | "not_paid"; order?: Order };

/** Server-side entitlement: a valid, unexpired token for an order that is paid (not refunded). */
export async function resolveToken(token: unknown): Promise<Entitlement> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return { ok: false, reason: "invalid" };
  const store = getStore();
  const t = await store.findAccessToken(hashToken(token));
  if (!t) return { ok: false, reason: "invalid" };
  if (new Date(t.expiresAt).getTime() < Date.now()) return { ok: false, reason: "expired" };
  const order = await store.getOrder(t.orderId);
  if (!order) return { ok: false, reason: "invalid" };
  return order.status === "paid" ? { ok: true, order } : { ok: false, reason: "not_paid", order };
}

export const accessUrl = (token: string, locale: "en" | "hi") => `${appOrigin()}${locale === "hi" ? "/hi" : ""}/purchase/success#t=${token}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETRY_DELAYS = process.env.NODE_ENV === "test" || process.env.COMMERCE_FAST_RETRY === "true" ? [50, 100] : [500, 1500];

/**
 * Sends the delivery email and owner notification (atomic claim per recipient workflow),
 * retrying transient failures. Customer and owner workflows are independent and idempotent.
 * Safe to call from verify, webhook and admin.
 */
export async function ensureDelivered(orderId: string): Promise<"sent" | "failed" | "skipped"> {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status !== "paid") return "skipped";

  // ── 1. Customer purchase confirmation email ──
  let customerStatus: "sent" | "failed" | "skipped" = "skipped";
  let ebookAttached = false;
  let receiptGenerated = false;
  const customerClaimed = await store.claimEmail(orderId);

  if (customerClaimed) {
    const current = (await store.getOrder(orderId)) ?? order;
    const token = await issueAccessToken(current.id);
    const attachments: Attachment[] = [];
    try {
      const receiptContent = buildReceiptPdf({ ...current, supportEmail: supportEmail() });
      attachments.push({ filename: `Payment-Receipt-${receiptNumber(current)}.pdf`, content: receiptContent });
      receiptGenerated = true;
    } catch (err) {
      console.error(`[commerce] receipt generation failed for ${orderId}: ${(err as Error).message}`);
    }

    const ebook = attachEbookToEmail() ? await ebookForAttachment() : { bytes: null, reason: "link_only" as const };
    if (ebook.bytes) {
      attachments.push({ filename: DOWNLOAD_FILENAME, content: ebook.bytes });
      ebookAttached = true;
    } else {
      if (ebook.reason !== "link_only") console.warn(`[commerce] ebook not attached for ${orderId} (${ebook.reason}); the email carries the secure link`);
    }

    let lastError = "unknown";
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        // Same key for every retry of this claim, so the provider never sends duplicates.
        await sendEmail(
          {
            to: current.customerEmail,
            name: current.customerName,
            locale: current.locale,
            accessUrl: accessUrl(token, current.locale),
            orderId: current.id,
            kind: "delivery",
            payment: { paymentId: current.razorpayPaymentId, amount: current.amount, currency: current.currency, paidAt: current.paidAt },
            ebookAttached,
            attachments,
          },
          `delivery-${current.id}-${current.emailAttempts}`,
        );
        await store.recordEmailResult(current.id, true);
        customerStatus = "sent";
        break;
      } catch (e) {
        lastError = (e as Error).message;
        if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
      }
    }
    if (customerStatus !== "sent") {
      await store.recordEmailResult(current.id, false, lastError);
      console.error(`[commerce] delivery email failed for ${orderId}: ${lastError}`);
      customerStatus = "failed";
    }
  } else {
    customerStatus = "skipped";
  }

  // ── 2. Owner/Admin new purchase notification email (independent workflow) ──
  const targetOwner = ownerEmail();
  if (targetOwner) {
    const ownerClaimed = await store.claimOwnerEmail(orderId);
    if (ownerClaimed) {
      const current = (await store.getOrder(orderId)) ?? order;
      // Report what actually happened to the customer's delivery (this run, or an earlier one).
      const customerEmailStatus = current.emailStatus === "sent" ? "sent" : current.emailStatus === "failed" ? "failed" : "pending";
      let lastOwnerError = "unknown";
      let ownerSuccess = false;
      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
        try {
          await sendOwnerNotification(
            {
              to: targetOwner,
              orderId: current.id,
              razorpayPaymentId: current.razorpayPaymentId,
              customerName: current.customerName,
              customerEmail: current.customerEmail,
              customerPhone: current.customerPhone,
              amount: current.amount,
              currency: current.currency,
              paymentStatus: current.status,
              paidAt: current.paidAt,
              locale: current.locale,
              customerEmailStatus,
              ebookDeliveryStatus: ebookAttached ? "attached" : "link_only",
              // The receipt is generated per send; it reached the customer only if their email was sent.
              receiptStatus: customerClaimed && !receiptGenerated ? "failed" : customerEmailStatus === "sent" ? "attached" : "generated",
            },
            `owner-notification-${current.id}-${current.ownerEmailAttempts}`,
          );
          await store.recordOwnerEmailResult(current.id, true);
          ownerSuccess = true;
          break;
        } catch (e) {
          lastOwnerError = (e as Error).message;
          if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
        }
      }
      if (!ownerSuccess) {
        await store.recordOwnerEmailResult(current.id, false, lastOwnerError);
        console.error(`[commerce] owner notification failed for ${orderId}: ${lastOwnerError}`);
      }
    }
  }

  return customerStatus;
}

/**
 * Reconciles an order with Razorpay when our record is behind (e.g. a delayed or missed
 * webhook). Only Razorpay's own payment record can move an order to paid.
 */
export async function reconcile(order: Order): Promise<Order> {
  if (order.status === "paid" || order.status === "refunded" || !order.razorpayPaymentId) return order;
  const payment = await fetchRazorpayPayment(order.razorpayPaymentId);
  if (!paymentMatchesOrder(payment, order.razorpayOrderId)) return order;
  const store = getStore();
  if (payment.status === "captured") {
    const { order: paid } = await store.markPaid(order.razorpayOrderId, payment.id);
    if (paid?.status === "paid") await ensureDelivered(paid.id);
    return (await store.getOrder(order.id)) ?? order;
  }
  if (payment.status === "failed") return (await store.markFailed(order.razorpayOrderId, payment.id)) ?? order;
  return order;
}
