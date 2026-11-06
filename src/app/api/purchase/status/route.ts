import { reconcile, resolveToken } from "@/lib/commerce/fulfil";
import { badRequest, crossSite, fail, json, maskEmail, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";

/** POST /api/purchase/status { token } — what the success page shows. Reconciles a pending payment with Razorpay. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`status:${clientIp(request)}`, 60, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await readJson(request);
  if (!body) return badRequest();

  try {
    let ent = await resolveToken(body.token);
    if (!ent.ok && ent.reason === "not_paid" && ent.order && (ent.order.status === "processing" || ent.order.status === "pending")) {
      // Delayed webhook: ask Razorpay directly.
      await reconcile(ent.order).catch((e) => console.warn(`[commerce] reconcile failed: ${(e as Error).message}`));
      ent = await resolveToken(body.token);
    }
    if (ent.ok) {
      const o = ent.order;
      return json({ status: "paid", orderId: o.id, name: o.customerName, email: maskEmail(o.customerEmail), emailStatus: o.emailStatus, paidAt: o.paidAt, amount: o.amount, currency: o.currency });
    }
    if (ent.reason === "invalid") return fail(404, "invalid_link", "This link isn't valid.");
    if (ent.reason === "expired") return fail(410, "link_expired", "This link has expired.");
    return json({ status: ent.order!.status, orderId: ent.order!.id });
  } catch (e) {
    console.error(`[commerce] status failed: ${(e as Error).message}`);
    return fail(503, "temporarily_unavailable", "We couldn't check your order just now. Please try again in a minute.");
  }
}
