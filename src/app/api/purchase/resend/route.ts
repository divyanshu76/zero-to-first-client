import { sendEmail } from "@/lib/commerce/email";
import { accessUrl, issueAccessToken } from "@/lib/commerce/fulfil";
import { badRequest, cleanEmail, cleanLocale, crossSite, json, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { getStore } from "@/lib/commerce/store";

/**
 * POST /api/purchase/resend { email, locale } — emails a fresh access link to a buyer.
 * The response is the same whether or not the email has a purchase (no account probing).
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`resend:${clientIp(request)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await readJson(request);
  const email = cleanEmail(body?.email);
  if (!email) return badRequest("Please enter a valid email address.");
  const locale = cleanLocale(body?.locale);
  const generic = json({ ok: true, message: "If that email has a purchase, a fresh download link is on its way." });

  if (!rateLimit(`relink:${email}`, 3, 60 * 60_000).ok) return generic;
  try {
    const [order] = await getStore().paidOrdersByEmail(email);
    if (order) {
      const token = await issueAccessToken(order.id);
      await sendEmail({ to: order.customerEmail, name: order.customerName, locale, accessUrl: accessUrl(token, locale), orderId: order.id, kind: "relink" }, `relink-${order.id}-${Math.floor(Date.now() / 60_000)}`);
    }
  } catch (e) {
    console.error(`[commerce] resend failed: ${(e as Error).message}`);
    return json({ error: "temporarily_unavailable", message: "We couldn't send the email just now. Please try again in a few minutes." }, 503);
  }
  return generic;
}
