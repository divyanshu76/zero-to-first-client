import { resolveToken } from "@/lib/commerce/fulfil";
import { badRequest, crossSite, fail, json, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { StorageError, signedEbookUrl } from "@/lib/commerce/storage";
import { getStore } from "@/lib/commerce/store";

/**
 * POST /api/download { token } → { url, expiresAt }  (unlimited downloads for a paid order)
 * Entitlement is checked on the server for every request; the returned URL is signed and
 * expires after 15 minutes. A new one is minted each time.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossSite();
  const rl = rateLimit(`download:${clientIp(request)}`, 30, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const body = await readJson(request);
  if (!body) return badRequest();

  try {
    const ent = await resolveToken(body.token);
    if (!ent.ok) {
      if (ent.reason === "expired") return fail(410, "link_expired", "This download link has expired. Request a fresh one below.");
      if (ent.reason === "not_paid") return fail(403, "not_paid", "This order isn't paid, so the download isn't available.");
      return fail(403, "unauthorized", "This download link isn't valid.");
    }
    // No per-order download cap: a paid buyer can download whenever needed. Each request still needs
    // a valid token for a paid (not refunded) order, gets a fresh 15-minute signed URL, and is
    // throttled per IP above. The counter below is for the dashboard only.
    const origin = new URL(request.url).origin;
    const signed = await signedEbookUrl(ent.order.id, origin);
    await getStore()
      .recordDownload(ent.order.id, new Date().toISOString().slice(0, 10))
      .catch((e) => console.warn(`[commerce] download counter not updated for ${ent.order.id}: ${(e as Error).message}`));
    return json(signed);
  } catch (e) {
    if (e instanceof StorageError) {
      console.error(`[commerce] storage: ${e.message}`);
      return fail(503, "storage_unavailable", "The download is temporarily unavailable. Please try again shortly; your purchase is safe.");
    }
    console.error(`[commerce] download failed: ${(e as Error).message}`);
    return fail(503, "temporarily_unavailable", "We couldn't prepare your download just now. Please try again in a minute.");
  }
}
