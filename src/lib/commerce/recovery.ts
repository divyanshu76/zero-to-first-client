import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { appOrigin, razorpayKeys, recoveryCronSecret } from "./config";
import { ensureDelivered } from "./fulfil";
import { fetchRazorpayOrderPayments, paymentMatchesOrder } from "./razorpay";
import { sendReminderEmail } from "./recovery-email";
import { getStore, type Order, type OrderStatus, type RecoveryMessage, type RecoveryStage, type RunResult } from "./store";

/**
 * Checkout recovery: opt-in reminder emails (automatic at 30 min / 24 h, or sent by the admin) and
 * manual WhatsApp links. See docs/CHECKOUT_RECOVERY.md. Rules that protect customers:
 *  - only orders whose customer ticked the opt-in box; unsubscribed addresses never;
 *  - never when the email has any paid/refunded/in-progress order, and only for its newest checkout;
 *  - Razorpay is asked about the order's payments right before every send; a captured payment marks
 *    the order paid through the existing atomic path (and delivers once) instead of reminding;
 *  - each reminder is claimed once in the database (unique key), so it can't be sent twice.
 */

/** Version of the opt-in wording shown at checkout (stored with each consent). */
export const CONSENT_VERSION = "2026-11-07.v1";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
export const RULES = {
  FIRST_AT: 30 * MIN,
  FIRST_UNTIL: 23 * HOUR,
  SECOND_AT: 24 * HOUR,
  AUTO_UNTIL: 72 * HOUR,
  MANUAL_FROM: 15 * MIN,
  MANUAL_UNTIL: 7 * DAY,
  GAP: 12 * HOUR,
  CAP_WINDOW: 30 * DAY,
  CAP_PER_ADDRESS: 3,
  /** The checkout opt-in promises "up to 2 reminders about this checkout": manual sends count too. */
  CAP_PER_CHECKOUT: 2,
  MAX_AUTO_ATTEMPTS: 3,
  RUN_BATCH: 20,
  BULK_BATCH: 25,
  RESUME_TTL: 7 * DAY,
  UNSUBSCRIBE_TTL: 365 * DAY,
  /** Stop starting new sends after this long, so a run finishes well inside the 60 s function limit. */
  TIME_BUDGET_MS: 20_000,
  /** Manual sends from the admin get a longer budget; the rest are reported as "not sent yet". */
  ADMIN_TIME_BUDGET_MS: 40_000,
} as const;
const SEND_SPACING_MS = process.env.COMMERCE_FAST_RETRY === "true" ? 0 : 600; // stays under Resend's per-second limit

const UNPAID: OrderStatus[] = ["pending", "cancelled", "failed"];
export const isUnpaid = (o: Pick<Order, "status">) => UNPAID.includes(o.status);
const isTest = (o: Pick<Order, "productId">) => o.productId.endsWith(":test");
/** Owner Test Mode orders are never reminded on the live store; in a Test Mode deployment they are the only orders. */
const includeTestOrders = () => razorpayKeys().mode === "test";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const emailHash = (email: string) => sha256(email.trim().toLowerCase());
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const istDay = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/* ── WhatsApp (manual only: the admin reviews and presses Send in WhatsApp) ── */

export const WHATSAPP_MESSAGE =
  "Hi! You recently started checkout for ZERO TO FIRST CLIENT by CRAFT & CODE. Your checkout wasn't completed. If you're still interested, you can continue here: https://craftandcode.tech\n\nNeed any help? Just reply to this message.";

/** wa.me click-to-chat link for a stored +91 mobile number, or null when the number isn't valid. */
export function whatsappUrl(phone: string | null) {
  const m = /^\+91([6-9]\d{9})$/.exec(phone ?? "");
  return m ? `https://wa.me/91${m[1]}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}` : null;
}

/* ── Eligibility ───────────────────────────────────────────────────────── */

export type Assessment = {
  bucket: "eligible" | "waiting" | "purchased" | "paid" | "ineligible";
  reason: string;
  /** Automatic reminder due now (retryId set when retrying a failed attempt of that stage). */
  due: { stage: "auto_1" | "auto_2"; retryId: string | null } | null;
  manualEmail: boolean;
  whatsapp: boolean;
  first: RecoveryMessage | null;
  second: RecoveryMessage | null;
  lastFollowUp: string | null;
};

export type AssessContext = {
  now: number;
  /** All orders for this order's email, any order. */
  emailOrders: Order[];
  /** Recovery messages for those orders. */
  messages: RecoveryMessage[];
  suppressed: boolean;
  includeTest?: boolean;
};

export function assess(order: Order, ctx: AssessContext): Assessment {
  const age = ctx.now - Date.parse(order.createdAt);
  const own = ctx.messages.filter((m) => m.orderId === order.id && m.channel === "email");
  const first = own.find((m) => m.stage === "auto_1") ?? null;
  const second = own.find((m) => m.stage === "auto_2") ?? null;
  const lastFollowUp = ctx.messages.filter((m) => m.status !== "failed").map((m) => m.sentAt ?? m.createdAt).sort().at(-1) ?? null;
  const base = { due: null, manualEmail: false, whatsapp: false, first, second, lastFollowUp };
  const stop = (bucket: Assessment["bucket"], reason: string): Assessment => ({ ...base, bucket, reason });

  if (order.status === "paid") return stop("paid", "paid");
  if (!isUnpaid(order)) return stop(order.status === "processing" ? "waiting" : "ineligible", order.status === "processing" ? "payment in progress" : order.status);
  if (isTest(order) && !(ctx.includeTest ?? includeTestOrders())) return stop("ineligible", "Test Mode order");
  if (ctx.emailOrders.some((o) => o.status === "paid" || o.status === "refunded")) return stop("purchased", "this email already has a paid order");
  if (ctx.emailOrders.some((o) => o.status === "processing")) return stop("waiting", "a payment for this email is in progress");
  if (ctx.emailOrders.some((o) => o.id !== order.id && o.createdAt > order.createdAt)) return stop("ineligible", "a newer checkout exists for this email");
  if (!order.emailConsentAt && !order.whatsappConsentAt) return stop("ineligible", "no reminder consent");

  // One WhatsApp follow-up per address (as the Privacy Policy promises). The link stays usable for
  // 24 hours after the admin first opens it (e.g. WhatsApp didn't load), then disappears.
  const firstWa = ctx.messages.filter((m) => m.channel === "whatsapp").map((m) => Date.parse(m.createdAt)).sort((x, y) => x - y)[0];
  const whatsappUsed = firstWa !== undefined && ctx.now - firstWa > DAY;
  // An unsubscribed (or admin-stopped) address gets no follow-up on any channel.
  const whatsapp = !!order.whatsappConsentAt && !ctx.suppressed && !whatsappUsed && !!whatsappUrl(order.customerPhone) && age >= RULES.MANUAL_FROM && age <= RULES.MANUAL_UNTIL;
  let due: Assessment["due"] = null;
  let manualEmail = false;
  let reason: string;
  if (!order.emailConsentAt) reason = "no email consent";
  else if (ctx.suppressed) reason = "unsubscribed";
  else {
    const counted = ctx.messages.filter((m) => m.channel === "email" && (m.status === "sent" || m.status === "sending"));
    const inWindow = counted.filter((m) => Date.parse(m.createdAt) > ctx.now - RULES.CAP_WINDOW).length;
    const lastEmail = Math.max(0, ...counted.map((m) => Date.parse(m.sentAt ?? m.createdAt)));
    const forThisCheckout = counted.filter((m) => m.orderId === order.id).length;
    if (forThisCheckout >= RULES.CAP_PER_CHECKOUT) reason = "2 reminders already sent for this checkout";
    else if (inWindow >= RULES.CAP_PER_ADDRESS) reason = "reminder limit reached (3 in 30 days)";
    else if (ctx.now - lastEmail < RULES.GAP) reason = "reminded less than 12 hours ago";
    else {
      manualEmail = age >= RULES.MANUAL_FROM && age <= RULES.MANUAL_UNTIL;
      const slot = (stage: "auto_1" | "auto_2", msg: RecoveryMessage | null) =>
        !msg ? { stage, retryId: null } : msg.status === "failed" && msg.attempts < RULES.MAX_AUTO_ATTEMPTS ? { stage, retryId: msg.id } : null;
      if (age >= RULES.SECOND_AT && age < RULES.AUTO_UNTIL) due = slot("auto_2", second);
      else if (age >= RULES.FIRST_AT && age < RULES.FIRST_UNTIL) due = slot("auto_1", first);
      reason = due ? `${due.stage === "auto_1" ? "1st" : "2nd"} reminder due` : age < RULES.FIRST_AT ? "1st reminder not due yet" : age >= RULES.AUTO_UNTIL ? "automatic reminders finished (72 h)" : "next reminder not due yet";
    }
  }
  if (due || manualEmail || whatsapp) return { ...base, bucket: "eligible", reason: due || manualEmail ? reason : "WhatsApp follow-up only", due, manualEmail, whatsapp };
  return { ...base, bucket: age < RULES.FIRST_AT ? "waiting" : "ineligible", reason };
}

async function contextFor(order: Order, now: number): Promise<AssessContext> {
  const store = getStore();
  const emailOrders = await store.ordersByEmail(order.customerEmail);
  const [messages, suppressed] = await Promise.all([store.messagesForOrders(emailOrders.map((o) => o.id)), store.isSuppressed(emailHash(order.customerEmail))]);
  return { now, emailOrders, messages, suppressed };
}

/* ── Payment re-check (Razorpay is the source of truth) ────────────────── */

export type PaymentCheck = "paid" | "in_progress" | "unpaid" | "unknown";

/** Asks Razorpay about every payment on this order. Anything uncertain is "unknown" (= don't send). */
export async function checkPayment(order: Order): Promise<PaymentCheck> {
  let payments;
  try {
    payments = await fetchRazorpayOrderPayments(order.razorpayOrderId);
  } catch (e) {
    console.warn(`[recovery] payment lookup failed for ${order.id}: ${(e as Error).message}`);
    return "unknown";
  }
  const captured = payments.filter((p) => p.status === "captured");
  const good = captured.find((p) => paymentMatchesOrder(p, order.razorpayOrderId));
  if (good) {
    // Same atomic transition the webhook uses; ensureDelivered claims each email once.
    const { order: paid } = await getStore().markPaid(order.razorpayOrderId, good.id);
    if (paid?.status !== "paid") return "unknown";
    await ensureDelivered(paid.id).catch((e) => console.error(`[recovery] delivery after re-check failed for ${order.id}: ${(e as Error).message}`));
    return "paid";
  }
  if (captured.length) return "unknown"; // a captured payment that doesn't match: leave it to a human
  if (payments.some((p) => p.status === "created" || p.status === "authorized")) return "in_progress";
  if (payments.some((p) => p.status !== "failed")) return "unknown"; // e.g. refunded
  return "unpaid";
}

/** Re-checks the customer's unpaid orders (newest three). Only "unpaid" for all of them allows a send. */
async function recheckEmail(ctx: AssessContext, now: number): Promise<PaymentCheck> {
  const recent = ctx.emailOrders.filter((o) => isUnpaid(o) && now - Date.parse(o.createdAt) <= RULES.MANUAL_UNTIL).slice(0, 3);
  // In parallel, so one slow lookup bounds the wait. Any non-"unpaid" answer blocks the send.
  const results = await Promise.all(recent.map((o) => checkPayment(o)));
  for (const r of ["paid", "in_progress", "unknown"] as const) if (results.includes(r)) return r;
  return "unpaid";
}

/* ── Tokens (only SHA-256 hashes are stored) ───────────────────────────── */

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
/**
 * Key for the links inside one reminder, derived from the dedicated recovery secret (a separate
 * label, so it is never the same key as the scheduler signature). With it, a retry of the same
 * reminder carries the SAME links, so the email is identical and can reuse the same Resend
 * idempotency key: if the first attempt was in fact accepted, Resend won't send it again.
 * Without the secret, links are random and each attempt gets its own key (the previous behaviour).
 */
const linkKey = () => {
  const secret = recoveryCronSecret();
  return secret ? createHmac("sha256", secret).update("ztfc-recovery-link-key-v1").digest() : null;
};

async function issueToken(orderId: string, purpose: "resume" | "unsubscribe", ttl: number, now: number, messageKey: string | null = null) {
  const key = messageKey ? linkKey() : null;
  const token = key ? createHmac("sha256", key).update(`${purpose}:${messageKey}`).digest("base64url") : randomBytes(32).toString("base64url");
  try {
    await getStore().addRecoveryToken(sha256(token), orderId, purpose, new Date(now + ttl).toISOString());
  } catch (e) {
    // The same derived token was stored by an earlier attempt of this reminder: keep that one.
    if (!(key && (e as { conflict?: boolean }).conflict)) throw e;
  }
  return token;
}
async function findToken(token: unknown, purpose: "resume" | "unsubscribe") {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const t = await getStore().findRecoveryToken(sha256(token));
  if (!t || t.purpose !== purpose || Date.parse(t.expiresAt) < Date.now()) return null;
  return getStore().getOrder(t.orderId);
}

/** "Continue checkout": the customer's details for prefilling, only while nothing has been bought. */
export async function resolveResumeToken(token: unknown) {
  const order = await findToken(token, "resume");
  if (!order || !isUnpaid(order)) return null;
  const others = await getStore().ordersByEmail(order.customerEmail);
  if (others.some((o) => o.status === "paid" || o.status === "refunded")) return null;
  return order;
}

/** One-click unsubscribe: the token is the only credential. Idempotent. */
export async function unsubscribeByToken(token: unknown): Promise<{ ok: boolean; locale: "en" | "hi" }> {
  const order = await findToken(token, "unsubscribe");
  if (!order) return { ok: false, locale: "en" };
  await getStore().addSuppression(emailHash(order.customerEmail), "unsubscribe");
  return { ok: true, locale: order.locale };
}

/* ── Sending ───────────────────────────────────────────────────────────── */

export type SendOutcome = { orderId: string; email: string; result: "sent" | "failed" | "skipped" | "paid"; reason: string };

async function deliver(order: Order, stage: RecoveryStage, by: "scheduler" | "admin", retryId: string | null, now: number): Promise<SendOutcome> {
  const store = getStore();
  const out = (result: SendOutcome["result"], reason: string): SendOutcome => ({ orderId: order.id, email: order.customerEmail, result, reason });
  const key = stage === "manual" ? `rcv-${order.id}-manual-${istDay(now)}` : `rcv-${order.id}-${stage}`;

  // Last look at our own record right before claiming (a webhook may have landed meanwhile).
  const fresh = await store.getOrder(order.id);
  if (!fresh || !isUnpaid(fresh)) return out("skipped", "order is no longer unpaid");

  let msg = retryId ? await store.retryRecoveryMessage(retryId) : await store.claimRecoveryMessage({ orderId: order.id, channel: "email", stage, idempotencyKey: key, triggeredBy: by });
  if (!msg && !retryId && stage === "manual") {
    // Today's manual reminder exists: it may only be retried if it failed.
    const failed = (await store.messagesForOrders([order.id])).find((m) => m.idempotencyKey === key && m.status === "failed");
    if (failed) msg = await store.retryRecoveryMessage(failed.id);
  }
  if (!msg) return out("skipped", "this reminder was already sent");
  // "Reminder n of 2" counts every reminder email for this checkout, automatic or manual.
  const earlier = (await store.messagesForOrders([order.id])).filter((m) => m.id !== msg!.id && m.channel === "email" && (m.status === "sent" || m.status === "sending")).length;
  const sequence = Math.min(earlier + 1, RULES.CAP_PER_CHECKOUT) as 1 | 2;

  try {
    const [resume, unsubscribe] = await Promise.all([issueToken(order.id, "resume", RULES.RESUME_TTL, now, msg.idempotencyKey), issueToken(order.id, "unsubscribe", RULES.UNSUBSCRIBE_TTL, now, msg.idempotencyKey)]);
    const stable = !!linkKey();
    const origin = appOrigin();
    const hi = order.locale === "hi";
    const { id } = await sendReminderEmail(
      {
        to: order.customerEmail,
        name: order.customerName,
        locale: order.locale,
        orderId: order.id,
        // Fragment, not query: the token never reaches server logs or Referer headers.
        continueUrl: `${origin}${hi ? "/hi" : ""}/#resume=${resume}`,
        // The link people click keeps the token in the fragment (never sent in a URL, so never in
        // request logs); the page posts it in the request body.
        unsubscribeUrl: `${origin}/api/recovery/unsubscribe${hi ? "?l=hi" : ""}#t=${unsubscribe}`,
        // RFC 8058 one-click: mail providers POST to this URL, so the token must be in it. It reaches
        // the logs only when it is used, and then it can do nothing more than it just did.
        oneClickUrl: `${origin}/api/recovery/unsubscribe?t=${unsubscribe}${hi ? "&l=hi" : ""}`,
        sequence,
      },
      // Stable links → identical email → same key on every attempt (provider-side de-duplication).
      stable ? msg.idempotencyKey : `${msg.idempotencyKey}#${msg.attempts}`,
    );
    await store.recordRecoveryResult(msg.id, true, id);
    return out("sent", stage === "manual" ? "manual reminder sent" : `${stage === "auto_1" ? "1st" : "2nd"} reminder sent`);
  } catch (e) {
    const error = (e as Error).message;
    await store.recordRecoveryResult(msg.id, false, null, error).catch(() => {});
    console.error(`[recovery] reminder failed for ${order.id}: ${error}`);
    return out("failed", error);
  }
}

async function sentInLast24h(now: number) {
  const msgs = await getStore().listRecoveryMessages(new Date(now - DAY).toISOString(), 1000);
  return msgs.filter((m) => m.channel === "email" && (m.status === "sent" || m.status === "sending")).length;
}

/** Admin: send a manual reminder to each selected order (at most BULK_BATCH per call). */
export async function sendManualReminders(orderIds: string[], now = Date.now(), budgetMs: number = RULES.ADMIN_TIME_BUDGET_MS): Promise<SendOutcome[]> {
  const store = getStore();
  const started = Date.now();
  const settings = await store.getRecoverySettings();
  let used = await sentInLast24h(now);
  const results: SendOutcome[] = [];
  for (const id of [...new Set(orderIds)].slice(0, RULES.BULK_BATCH)) {
    if (Date.now() - started >= budgetMs) {
      results.push({ orderId: id, email: "", result: "skipped", reason: "not sent yet: time limit for one submission reached. Send again for the rest." });
      continue;
    }
    const order = /^ord_[a-f0-9]{24}$/.test(id) ? await store.getOrder(id) : null;
    if (!order) {
      results.push({ orderId: id, email: "", result: "skipped", reason: "order not found" });
      continue;
    }
    const ctx = await contextFor(order, now);
    const a = assess(order, ctx);
    if (!a.manualEmail) {
      results.push({ orderId: id, email: order.customerEmail, result: "skipped", reason: a.reason });
      continue;
    }
    if (used >= settings.dailyCap) {
      results.push({ orderId: id, email: order.customerEmail, result: "skipped", reason: `daily limit of ${settings.dailyCap} reminder emails reached` });
      continue;
    }
    const check = await recheckEmail(ctx, now);
    if (check !== "unpaid") {
      results.push({ orderId: id, email: order.customerEmail, result: check === "paid" ? "paid" : "skipped", reason: check === "paid" ? "already paid (found on Razorpay); ebook delivered" : check === "in_progress" ? "a payment is in progress" : "couldn't confirm the payment status with Razorpay" });
      continue;
    }
    const r = await deliver(order, "manual", "admin", null, now);
    if (r.result === "sent") used += 1;
    results.push(r);
    if (SEND_SPACING_MS) await sleep(SEND_SPACING_MS);
  }
  return results;
}

/** Admin: log that the admin opened a manual WhatsApp chat (nothing is sent by the system). */
export async function logWhatsappOpened(order: Order) {
  await getStore().claimRecoveryMessage({ orderId: order.id, channel: "whatsapp", stage: "manual", status: "opened", idempotencyKey: `wa-${order.id}-${Math.floor(Date.now() / 60_000)}`, triggeredBy: "admin" });
}

/* ── Scheduled run ─────────────────────────────────────────────────────── */

export async function runRecovery(opts: { trigger: "cron" | "admin"; nonce: string | null; now?: number; budgetMs?: number }): Promise<RunResult & { runId: string | null }> {
  const store = getStore();
  const now = opts.now ?? Date.now();
  const runId = await store.startRecoveryRun(opts.trigger, opts.nonce);
  if (!runId) return { runId: null, status: "skipped", examined: 0, sent: 0, skipped: 0, failed: 0, recovered: 0, note: "replayed request" };
  const res: RunResult = { status: "ok", examined: 0, sent: 0, skipped: 0, failed: 0, recovered: 0, note: null };
  const finish = async () => {
    await store.finishRecoveryRun(runId, res).catch((e) => console.error(`[recovery] could not record run: ${(e as Error).message}`));
    return { runId, ...res };
  };

  let settings;
  try {
    settings = await store.getRecoverySettings();
  } catch (e) {
    Object.assign(res, { status: "error", note: `settings unavailable: ${(e as Error).message}` });
    return finish();
  }
  const skip = (note: string) => {
    Object.assign(res, { status: "skipped", note });
    return finish();
  };
  if (!settings.automationEnabled) return skip("automation is off");
  if (settings.pausedUntil && Date.parse(settings.pausedUntil) > now) return skip("reminders are paused");
  if (!(await store.acquireRecoveryLock("run", 4 * MIN))) return skip("another run is in progress");

  try {
    const started = Date.now();
    let used = await sentInLast24h(now);
    const candidates = (await store.consentedOrdersSince(new Date(now - RULES.AUTO_UNTIL).toISOString())).filter((o) => o.emailConsentAt && isUnpaid(o));
    const seen = new Set<string>();
    for (const order of candidates) {
      if (seen.has(order.customerEmail)) continue;
      seen.add(order.customerEmail);
      if (res.sent >= RULES.RUN_BATCH) {
        res.note = "batch limit reached; the rest continue next run";
        break;
      }
      if (Date.now() - started >= (opts.budgetMs ?? RULES.TIME_BUDGET_MS)) {
        res.note = "time budget reached; the rest continue next run";
        break;
      }
      const ctx = await contextFor(order, now);
      // Only the newest checkout for an address can be reminded.
      const newest = ctx.emailOrders[0];
      const target = newest && isUnpaid(newest) && newest.emailConsentAt ? newest : order;
      const a = assess(target, ctx);
      res.examined += 1;
      if (!a.due) continue;
      if (used >= settings.dailyCap) {
        res.skipped += 1;
        res.note = `daily limit of ${settings.dailyCap} reminder emails reached`;
        break;
      }
      const check = await recheckEmail(ctx, now);
      if (check === "paid") {
        res.recovered += 1;
        continue;
      }
      if (check !== "unpaid") {
        res.skipped += 1; // in progress or uncertain: try again next run
        continue;
      }
      const r = await deliver(target, a.due.stage, "scheduler", a.due.retryId, now);
      if (r.result === "sent") {
        res.sent += 1;
        used += 1;
      } else if (r.result === "failed") res.failed += 1;
      else res.skipped += 1;
      if (SEND_SPACING_MS) await sleep(SEND_SPACING_MS);
    }
    if (res.failed) res.note = [res.note, `${res.failed} email(s) failed; they are retried on later runs`].filter(Boolean).join("; ");
  } catch (e) {
    res.status = "error";
    res.note = (e as Error).message.slice(0, 300);
    console.error(`[recovery] run failed: ${res.note}`);
  } finally {
    await store.releaseRecoveryLock("run").catch(() => {});
  }
  return finish();
}

/* ── Dashboard data ────────────────────────────────────────────────────── */

export type RecoveryRow = { order: Order; a: Assessment; whatsappLink: string | null; messages: RecoveryMessage[] };

/**
 * Every unpaid checkout (newest first) with its assessment, plus orders recovered after a reminder.
 * `orders` is the admin's already-loaded order list.
 */
export async function recoveryDashboard(orders: Order[], now = Date.now()) {
  const store = getStore();
  const byEmail = new Map<string, Order[]>();
  for (const o of orders) byEmail.set(o.customerEmail, [...(byEmail.get(o.customerEmail) ?? []), o]);
  for (const list of byEmail.values()) list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Reminders are only ever sent within 7 days of a checkout, so 60 days of history covers every row shown.
  const messages = await store.listRecoveryMessages(new Date(now - 60 * DAY).toISOString(), 2000);
  const msgsFor = (ids: Set<string>) => messages.filter((m) => ids.has(m.orderId));
  const suppressed = new Map<string, boolean>();
  const rows: RecoveryRow[] = [];
  for (const o of orders) {
    if (!isUnpaid(o) && o.status !== "processing") continue;
    const emailOrders = byEmail.get(o.customerEmail) ?? [o];
    // Every address is checked, whatever it consented to (a stop blocks WhatsApp too), and a failed
    // lookup counts as "stopped": the dashboard never offers a follow-up it couldn't verify.
    if (!suppressed.has(o.customerEmail)) suppressed.set(o.customerEmail, await store.isSuppressed(emailHash(o.customerEmail)).catch(() => true));
    const ctx: AssessContext = { now, emailOrders, messages: msgsFor(new Set(emailOrders.map((x) => x.id))), suppressed: suppressed.get(o.customerEmail) ?? true };
    const a = assess(o, ctx);
    rows.push({ order: o, a, whatsappLink: a.whatsapp ? whatsappUrl(o.customerPhone) : null, messages: ctx.messages.filter((m) => m.orderId === o.id) });
  }
  // Recovered: a paid order that came from a reminder link, or whose address got a reminder in the 7 days before paying.
  const recovered = orders.filter((p) => {
    if (p.status !== "paid" || !p.paidAt) return false;
    if (p.recoveredFromOrderId) return true;
    const ids = new Set((byEmail.get(p.customerEmail) ?? []).map((x) => x.id));
    const paidAt = Date.parse(p.paidAt);
    return messages.some((m) => ids.has(m.orderId) && m.status === "sent" && m.channel === "email" && Date.parse(m.sentAt ?? m.createdAt) < paidAt && paidAt - Date.parse(m.sentAt ?? m.createdAt) <= 7 * DAY);
  });
  return { rows, recovered, messages };
}
