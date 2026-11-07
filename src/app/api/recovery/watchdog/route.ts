import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { ownerEmail, vercelCronSecret } from "@/lib/commerce/config";
import { NO_STORE, json } from "@/lib/commerce/http";
import { sendOwnerAlert } from "@/lib/commerce/recovery-email";
import { getStore } from "@/lib/commerce/store";

/**
 * GET /api/recovery/watchdog — daily Vercel Cron (vercel.json; once a day is allowed on Hobby).
 * Independent of Supabase's own scheduler: it checks that the database answers (a paused Free
 * project doesn't) and, when automation is on, that pg_cron has run in the last 30 minutes.
 * Problems are emailed to OWNER_EMAIL. Vercel sends "Authorization: Bearer $CRON_SECRET";
 * without CRON_SECRET configured every call is refused.
 */
const digest = (s: string) => createHash("sha256").update(s).digest();

export async function GET(request: Request) {
  await connection();
  const secret = vercelCronSecret();
  const given = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return new Response(null, { status: 401, headers: NO_STORE });

  const problems: string[] = [];
  const store = getStore();
  try {
    const settings = await store.getRecoverySettings();
    if (settings.automationEnabled && !(settings.pausedUntil && Date.parse(settings.pausedUntil) > Date.now())) {
      const lastCron = (await store.listRecoveryRuns(50)).find((r) => r.trigger === "cron");
      if (!lastCron || Date.now() - Date.parse(lastCron.startedAt) > 30 * 60_000) {
        problems.push(`Checkout recovery: automation is ON but the scheduler hasn't run since ${lastCron ? lastCron.startedAt : "it was set up"} (UTC). Check the ztfc-recovery cron job in Supabase.`);
      }
    }
  } catch (e) {
    problems.push(`Database unreachable (${(e as Error).message}). The Supabase Free project may be paused: checkout, payment recording and downloads are affected. Restore it from the Supabase dashboard.`);
  }

  const to = ownerEmail();
  if (problems.length && to) {
    const day = new Date().toISOString().slice(0, 10);
    await sendOwnerAlert(to, "CRAFT & CODE — action needed: store health check", problems, `watchdog-${day}-${createHash("sha256").update(problems.join("|")).digest("hex").slice(0, 16)}`).catch((e) =>
      console.error(`[watchdog] alert email failed: ${(e as Error).message}`),
    );
  }
  if (problems.length) console.warn(`[watchdog] ${problems.length} problem(s) found`);
  return json({ ok: problems.length === 0, problems: problems.length });
}
