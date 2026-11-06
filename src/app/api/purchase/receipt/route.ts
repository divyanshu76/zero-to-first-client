import { supportEmail } from "@/lib/commerce/config";
import { resolveToken } from "@/lib/commerce/fulfil";
import { NO_STORE, badRequest, crossSite, fail, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { buildReceiptPdf, receiptNumber } from "@/lib/commerce/receipt";

/**
 * POST /api/purchase/receipt { token } → the order's Payment Receipt PDF.
 * Same entitlement as the ebook: a valid access token for a paid, non-refunded order.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`receipt:${clientIp(request)}`, 20, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await readJson(request);
  if (!body) return badRequest();
  try {
    const ent = await resolveToken(body.token);
    if (!ent.ok) {
      if (ent.reason === "expired") return fail(410, "link_expired", "This link has expired. Request a fresh one below.");
      if (ent.reason === "not_paid") return fail(403, "not_paid", "This order isn't paid, so no receipt is available.");
      return fail(403, "unauthorized", "This link isn't valid.");
    }
    const pdf = buildReceiptPdf({ ...ent.order, supportEmail: supportEmail() });
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...NO_STORE,
        "cache-control": "private, no-store",
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="Payment-Receipt-${receiptNumber(ent.order)}.pdf"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    console.error(`[commerce] receipt failed: ${(e as Error).message}`);
    return fail(503, "temporarily_unavailable", "We couldn't prepare your receipt just now. Please try again in a minute.");
  }
}
