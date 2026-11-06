import { badRequest, crossSite, json, readJson, sameOrigin, str } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { getStore } from "@/lib/commerce/store";

/**
 * POST /api/checkout/cancel { orderId, razorpayOrderId } — the buyer closed the payment window.
 * Only a still-pending order is marked cancelled; a payment that completes later still wins.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`cancel:${clientIp(request)}`, 20, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await readJson(request);
  const orderId = str(body?.orderId, 40);
  const rzp = str(body?.razorpayOrderId, 40);
  if (!/^ord_[a-f0-9]{24}$/.test(orderId) || !rzp) return badRequest();
  try {
    const store = getStore();
    const order = await store.getOrder(orderId);
    if (!order || order.razorpayOrderId !== rzp) return badRequest();
    const updated = await store.markCancelled(orderId);
    return json({ status: updated?.status ?? order.status });
  } catch {
    return json({ status: "unknown" }, 503);
  }
}
