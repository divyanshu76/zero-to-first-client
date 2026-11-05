import { fulfillOrder, verifyRazorpayWebhook } from "@/lib/payments";

/**
 * Razorpay webhook endpoint (configure in Razorpay Dashboard → Webhooks,
 * events: payment.captured). Payment success is trusted only after the
 * X-Razorpay-Signature HMAC is verified against RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const raw = await request.text();
  if (!verifyRazorpayWebhook(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id: string; order_id: string | null; email: string | null; amount: number; currency: string; status: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Malformed payload." }, { status: 400 });
  }

  const p = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && p && p.status === "captured") {
    await fulfillOrder({ provider: "razorpay", paymentId: p.id, orderId: p.order_id, email: p.email, amount: p.amount, currency: p.currency });
  }

  // Acknowledge every verified event so Razorpay does not retry.
  return Response.json({ received: true });
}
