import { createHmac } from "node:crypto";
import { after } from "next/server";
import { recoveryClockOverrideAllowed, recoveryCronSecret } from "@/lib/commerce/config";
import { NO_STORE, json } from "@/lib/commerce/http";
import { safeEqualHex } from "@/lib/commerce/razorpay";
import { runRecovery } from "@/lib/commerce/recovery";

export const maxDuration = 60;

/**
 * POST /api/recovery/run — called by Supabase pg_cron (via pg_net) about every 5 minutes.
 *
 * Authentication never sends the secret itself (pg_net keeps request headers in its queue table):
 *   x-recovery-ts         Unix seconds
 *   x-recovery-nonce      random, single-use (stored with the run; a replay is refused)
 *   x-recovery-signature  hex HMAC-SHA256(RECOVERY_CRON_SECRET, "v1:" + ts + ":" + nonce)
 * The signature is valid for 5 minutes. RECOVERY_CRON_SECRET is a dedicated value, never the
 * Supabase service-role key. Failures return a bare 401 and nothing about the headers is logged.
 *
 * Replies 202 at once and works after responding, so pg_net's response table never holds customer data.
 * Whether anything is sent is decided by the admin's automation switch (OFF by default).
 */
const WINDOW_S = 300;
const unauthorised = () => new Response(null, { status: 401, headers: NO_STORE });

export async function POST(request: Request) {
  const secret = recoveryCronSecret();
  if (!secret) return unauthorised(); // fail closed when not configured
  const h = request.headers;
  const ts = h.get("x-recovery-ts") ?? "";
  const nonce = h.get("x-recovery-nonce") ?? "";
  const sig = h.get("x-recovery-signature");
  if (!/^\d{9,11}$/.test(ts) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return unauthorised();
  if (Math.abs(Date.now() / 1000 - Number(ts)) > WINDOW_S) return unauthorised();
  const expected = createHmac("sha256", secret).update(`v1:${ts}:${nonce}`).digest("hex");
  if (!safeEqualHex(expected, sig)) return unauthorised();

  // Automated tests only (refused on Vercel and with live keys): move the clock / wait for the result.
  let now: number | undefined;
  let budgetMs: number | undefined;
  let wait = false;
  if (recoveryClockOverrideAllowed()) {
    const t = Number(h.get("x-recovery-test-now"));
    if (Number.isFinite(t) && t > 0) now = t;
    const b = Number(h.get("x-recovery-test-budget-ms"));
    if (h.has("x-recovery-test-budget-ms") && Number.isFinite(b) && b >= 0) budgetMs = b;
    wait = h.get("x-recovery-test-sync") === "1";
  }
  if (wait) return json(await runRecovery({ trigger: "cron", nonce, now, budgetMs }));

  after(() =>
    runRecovery({ trigger: "cron", nonce, now })
      .then((r) => {
        if (r.status === "error") console.error(`[recovery] run ${r.runId} error: ${r.note}`);
      })
      .catch((e) => console.error(`[recovery] run crashed: ${(e as Error).message}`)),
  );
  return json({ accepted: true }, 202);
}
