import { badRequest, crossSite, fail, json, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { resolveResumeToken } from "@/lib/commerce/recovery";

/**
 * POST /api/recovery/resume { token } — "Continue checkout" from a reminder email.
 * Returns the customer's own details for prefilling the checkout form, only while the link is
 * valid (7 days) and nothing has been bought with that email. A fresh order is always created
 * on payment; old Razorpay orders are never reused.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`resume:${clientIp(request)}`, 10, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await readJson(request);
  if (!body || typeof body.token !== "string") return badRequest();
  try {
    const order = await resolveResumeToken(body.token);
    if (!order) return fail(404, "link_expired", "This checkout link has expired or is no longer valid.");
    return json({ name: order.customerName, email: order.customerEmail, phone: order.customerPhone?.replace(/^\+91/, "") ?? "" });
  } catch {
    return fail(503, "temporarily_unavailable", "Please try again in a moment.");
  }
}
