import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { appOrigin, razorpayKeys, recoveryCronSecret } from "./config";
import { ensureDelivered } from "./fulfil";
import { fetchRazorpayOrderPayments, paymentMatchesOrder } from "./razorpay";
import { sendReminderEmail } from "./recovery-email";
import { getStore, type Order, type OrderStatus, type RecoveryMessage, type RecoveryStage, type RunResult, type Stops } from "./store";

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

/**
 * Consent the admin records after a genuine customer interaction (e.g. the customer wrote on
 * WhatsApp asking to be contacted). The wording is fixed per channel and version; the database
 * stamps the time (no backdating) and keeps an append-only audit row with the source and evidence.
 */
export const ADMIN_CONSENT = {
  email: { version: "admin-email-2026-11-08.v1", text: "The customer asked or clearly agreed to receive email from CRAFT & CODE about this checkout." },
  whatsapp: { version: "admin-whatsapp-2026-11-08.v1", text: "The customer asked or clearly agreed to be contacted on WhatsApp by CRAFT & CODE about this checkout." },
} as const;
export const CONSENT_SOURCES = { email_reply: "Customer's email reply", whatsapp_message: "Customer's WhatsApp message", phone_call: "Phone call with the customer", in_person: "In person", other: "Other (describe in the evidence)" } as const;

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

/** The pre-filled WhatsApp text, with the customer's own "Continue checkout" link. */
export const whatsappMessage = (link: string) =>
  `Hi! You recently started checkout for ZERO TO FIRST CLIENT by CRAFT & CODE, but your purchase wasn't completed.\n\nYour checkout details are saved securely. Continue where you left off and complete your purchase here:\n${link}\n\nNeed help? Simply reply to this message.`;

/** wa.me click-to-chat link for a stored +91 mobile number (null when the number isn't valid). */
export function whatsappUrl(phone: string | null, text = whatsappMessage("https://craftandcode.tech")) {
  const m = /^\+91([6-9]\d{9})$/.exec(phone ?? "");
  return m ? `https://wa.me/91${m[1]}?text=${encodeURIComponent(text)}` : null;
}

/**
 * The WhatsApp link the admin opens: the same secure resume mechanism as the email. The token is
 * stored only as a hash, lasts 7 days, works only while nothing has been bought with that email,
 * and pre-fills name, email and mobile; paying always creates a fresh ₹599 order. With the
 * recovery secret configured, reopening the chat for the same checkout gives the same link.
 */
export async function whatsappRecoveryUrl(order: Order, now = Date.now()) {
  const token = await issueToken(order.id, "resume", RULES.RESUME_TTL, now, `wa-${order.id}`);
  const link = `${appOrigin()}${order.locale === "hi" ? "/hi" : ""}/#resume=${token}`;
  return whatsappUrl(order.customerPhone, whatsappMessage(link));
}

/* ── Eligibility ───────────────────────────────────────────────────────── */

/**
 * One channel's verdict. Every state except "eligible" says why the action is unavailable:
 * consent_required (the customer never agreed to this channel), unsubscribed (used the link),
 * stopped (a stop request was recorded), paid (bought / paying), limit (caps or already done),
 * not_due (too early), unavailable (anything else, e.g. no valid mobile number).
 */
export type ChannelState = "eligible" | "consent_required" | "unsubscribed" | "stopped" | "paid" | "limit" | "not_due" | "unavailable";
export type ChannelVerdict = { state: ChannelState; reason: string };

export type Assessment = {
  bucket: "eligible" | "waiting" | "purchased" | "paid" | "ineligible";
  reason: string;
  /** Per-channel verdicts. Email consent never stands in for WhatsApp consent, or the reverse. */
  email: ChannelVerdict;
  wa: ChannelVerdict;
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
  /** Stop requests for this address: global (`all`) and per channel. */
  stops: Stops;
  includeTest?: boolean;
};

/** Treat an unreadable stop list as "stopped everywhere" (fail closed). */
export const STOPPED_EVERYWHERE: Stops = { all: true, allReason: "admin", email: true, whatsapp: true };

export function assess(order: Order, ctx: AssessContext): Assessment {
  const age = ctx.now - Date.parse(order.createdAt);
  const own = ctx.messages.filter((m) => m.orderId === order.id && m.channel === "email");
  const first = own.find((m) => m.stage === "auto_1") ?? null;
  const second = own.find((m) => m.stage === "auto_2") ?? null;
  const lastFollowUp = ctx.messages.filter((m) => m.status !== "failed").map((m) => m.sentAt ?? m.createdAt).sort().at(-1) ?? null;
  const base = { due: null, manualEmail: false, whatsapp: false, first, second, lastFollowUp };
  // Order-level blocks apply to both channels.
  const both = (bucket: Assessment["bucket"], state: ChannelState, reason: string): Assessment => ({ ...base, bucket, reason, email: { state, reason }, wa: { state, reason } });

  if (order.status === "paid") return both("paid", "paid", "paid");
  if (order.status === "refunded") return both("ineligible", "paid", "refunded");
  if (order.status === "processing") return both("waiting", "paid", "payment in progress");
  if (!isUnpaid(order)) return both("ineligible", "unavailable", order.status);
  if (isTest(order) && !(ctx.includeTest ?? includeTestOrders())) return both("ineligible", "unavailable", "Test Mode order");
  if (ctx.emailOrders.some((o) => o.status === "paid" || o.status === "refunded")) return both("purchased", "paid", "this email already has a paid order");
  if (ctx.emailOrders.some((o) => o.status === "processing")) return both("waiting", "paid", "a payment for this email is in progress");
  if (ctx.emailOrders.some((o) => o.id !== order.id && o.createdAt > order.createdAt)) return both("ineligible", "unavailable", "a newer checkout exists for this email");

  const globalStop = (): ChannelVerdict | null =>
    ctx.stops.all ? (ctx.stops.allReason === "unsubscribe" ? { state: "unsubscribed", reason: "customer unsubscribed (all checkout reminders)" } : { state: "stopped", reason: "stop request recorded (all channels)" }) : null;

  /* ── Email ── */
  let email: ChannelVerdict;
  let due: Assessment["due"] = null;
  let manualEmail = false;
  if (!order.emailConsentAt) email = { state: "consent_required", reason: "customer didn't opt in to email reminders" };
  else if (globalStop()) email = globalStop()!;
  else if (ctx.stops.email) email = { state: "stopped", reason: "email stop request recorded" };
  else {
    const counted = ctx.messages.filter((m) => m.channel === "email" && (m.status === "sent" || m.status === "sending"));
    const inWindow = counted.filter((m) => Date.parse(m.createdAt) > ctx.now - RULES.CAP_WINDOW).length;
    const lastEmail = Math.max(0, ...counted.map((m) => Date.parse(m.sentAt ?? m.createdAt)));
    const forThisCheckout = counted.filter((m) => m.orderId === order.id).length;
    if (forThisCheckout >= RULES.CAP_PER_CHECKOUT) email = { state: "limit", reason: "2 reminders already sent for this checkout" };
    else if (inWindow >= RULES.CAP_PER_ADDRESS) email = { state: "limit", reason: "reminder limit reached (3 in 30 days)" };
    else if (ctx.now - lastEmail < RULES.GAP) email = { state: "limit", reason: "reminded less than 12 hours ago" };
    else {
      manualEmail = age >= RULES.MANUAL_FROM && age <= RULES.MANUAL_UNTIL;
      const slot = (stage: "auto_1" | "auto_2", msg: RecoveryMessage | null) =>
        !msg ? { stage, retryId: null } : msg.status === "failed" && msg.attempts < RULES.MAX_AUTO_ATTEMPTS ? { stage, retryId: msg.id } : null;
      if (age >= RULES.SECOND_AT && age < RULES.AUTO_UNTIL) due = slot("auto_2", second);
      else if (age >= RULES.FIRST_AT && age < RULES.FIRST_UNTIL) due = slot("auto_1", first);
      if (due) email = { state: "eligible", reason: `${due.stage === "auto_1" ? "1st" : "2nd"} reminder due` };
      else if (manualEmail) email = { state: "eligible", reason: age < RULES.FIRST_AT ? "manual email allowed (1st automatic reminder at 30 min)" : "manual email allowed" };
      else if (age < RULES.MANUAL_FROM) email = { state: "not_due", reason: "checkout started less than 15 minutes ago" };
      else email = { state: "unavailable", reason: "checkout older than 7 days" };
    }
  }

  /* ── WhatsApp (manual only) ── */
  // One WhatsApp follow-up per address (as the Privacy Policy promises). The link stays usable for
  // 24 hours after the admin first opens it (e.g. WhatsApp didn't load), then disappears.
  const firstWa = ctx.messages.filter((m) => m.channel === "whatsapp").map((m) => Date.parse(m.createdAt)).sort((x, y) => x - y)[0];
  let wa: ChannelVerdict;
  if (!order.whatsappConsentAt) wa = { state: "consent_required", reason: "customer didn't opt in to WhatsApp" };
  else if (globalStop()) wa = globalStop()!;
  else if (ctx.stops.whatsapp) wa = { state: "stopped", reason: "WhatsApp stop request recorded" };
  else if (!whatsappUrl(order.customerPhone)) wa = { state: "unavailable", reason: "no valid Indian mobile number" };
  else if (firstWa !== undefined && ctx.now - firstWa > DAY) wa = { state: "limit", reason: "already followed up on WhatsApp" };
  else if (age < RULES.MANUAL_FROM) wa = { state: "not_due", reason: "checkout started less than 15 minutes ago" };
  else if (age > RULES.MANUAL_UNTIL) wa = { state: "unavailable", reason: "checkout older than 7 days" };
  else wa = { state: "eligible", reason: "manual WhatsApp allowed" };
  const whatsapp = wa.state === "eligible";

  const any = email.state === "eligible" || whatsapp;
  const waiting = email.state === "not_due" || wa.state === "not_due";
  const bucket: Assessment["bucket"] = any ? "eligible" : waiting ? "waiting" : "ineligible";
  const reason =
    email.state === wa.state && email.state === "consent_required" ? "no reminder consent (email or WhatsApp)" : `email: ${email.reason}; WhatsApp: ${wa.reason}`;
  return { ...base, bucket, reason, email, wa, due, manualEmail, whatsapp };
}

async function stopsFor(email: string): Promise<Stops> {
  return getStore().getStops(emailHash(email));
}

async function contextFor(order: Order, now: number): Promise<AssessContext> {
  const store = getStore();
  const emailOrders = await store.ordersByEmail(order.customerEmail);
  // getStops throws if it can't be read: the caller then sends nothing (fail closed).
  const [messages, stops] = await Promise.all([store.messagesForOrders(emailOrders.map((o) => o.id)), stopsFor(order.customerEmail)]);
  return { now, emailOrders, messages, stops };
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
async function findToken(token: unknown, purpose: "resume" | "unsubscribe", now = Date.now()) {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const t = await getStore().findRecoveryToken(sha256(token));
  if (!t || t.purpose !== purpose || Date.parse(t.expiresAt) < now) return null;
  return getStore().getOrder(t.orderId);
}

/** "Continue checkout": the customer's details for prefilling, only while nothing has been bought. */
export async function resolveResumeToken(token: unknown, now = Date.now()) {
  const order = await findToken(token, "resume", now);
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
  const stopsByEmail = new Map<string, Stops>();
  const rows: RecoveryRow[] = [];
  for (const o of orders) {
    if (!isUnpaid(o) && o.status !== "processing") continue;
    const emailOrders = byEmail.get(o.customerEmail) ?? [o];
    // Every address is checked, whatever it consented to (a stop blocks WhatsApp too), and a failed
    // lookup counts as "stopped": the dashboard never offers a follow-up it couldn't verify.
    if (!stopsByEmail.has(o.customerEmail)) stopsByEmail.set(o.customerEmail, await stopsFor(o.customerEmail).catch(() => STOPPED_EVERYWHERE));
    const ctx: AssessContext = { now, emailOrders, messages: msgsFor(new Set(emailOrders.map((x) => x.id))), stops: stopsByEmail.get(o.customerEmail) ?? STOPPED_EVERYWHERE };
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
