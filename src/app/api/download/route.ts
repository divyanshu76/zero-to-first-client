import { MAX_DOWNLOADS_PER_DAY } from "@/lib/commerce/config";
import { resolveToken } from "@/lib/commerce/fulfil";
import { badRequest, crossSite, fail, json, readJson, sameOrigin } from "@/lib/commerce/http";
import { clientIp, rateLimit, tooMany } from "@/lib/commerce/rate-limit";
import { StorageError, signedEbookUrl } from "@/lib/commerce/storage";
import { getStore } from "@/lib/commerce/store";

/**
 * POST /api/download { token } → { url, expiresAt }
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
    const day = new Date().toISOString().slice(0, 10);
    if (!(await getStore().recordDownload(ent.order.id, day, MAX_DOWNLOADS_PER_DAY))) {
      return fail(429, "download_limit", "You've reached today's download limit. Please try again tomorrow or contact support.");
    }
    const origin = new URL(request.url).origin;
    return json(await signedEbookUrl(ent.order.id, origin));
  } catch (e) {
    if (e instanceof StorageError) {
      console.error(`[commerce] storage: ${e.message}`);
      return fail(503, "storage_unavailable", "The download is temporarily unavailable. Please try again shortly; your purchase is safe.");
    }
    console.error(`[commerce] download failed: ${(e as Error).message}`);
    return fail(503, "temporarily_unavailable", "We couldn't prepare your download just now. Please try again in a minute.");
  }
}
