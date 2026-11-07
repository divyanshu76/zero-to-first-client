import "server-only";
import { createHash, createHmac } from "node:crypto";
import { PRODUCT, adminCredentials, razorpayKeys, recoveryClockOverrideAllowed } from "./config";
import { safeEqualHex } from "./razorpay";
import { badge, esc, inr, isTestOrder, ist, istDate, stat, testTag } from "./admin-ui";
import { cleanEmail } from "./http";
import { RULES, emailHash, logWhatsappOpened, recoveryDashboard, runRecovery, sendManualReminders, whatsappUrl, type RecoveryRow, type SendOutcome } from "./recovery";
import { renderReminderEmail } from "./recovery-email";
import { getStore, type Order, type RecoveryMessage, type RecoveryRun, type RecoverySettings } from "./store";

/**
 * /admin/recovery — Checkout Recovery. Server-rendered, no JavaScript (the admin CSP forbids it):
 * every filter is a GET, every action a confirmed same-origin POST. Contact details appear only
 * here, behind the admin sign-in. WhatsApp is never sent by the system: the button opens a
 * pre-filled wa.me chat for the admin to review and send personally.
 */
type Notice = { tone: "ok" | "bad" | "warn" | "info"; text: string };

/** The current time; automated tests may move it forward (refused on Vercel and with live keys). */
export function recoveryNow(request: Request) {
  const t = recoveryClockOverrideAllowed() ? Number(request.headers.get("x-recovery-test-now")) : NaN;
  return Number.isFinite(t) && t > 0 ? t : Date.now();
}
/** Tests only (same guard as the clock): shrink the send time budget to exercise the cut-off path. */
export function recoveryTestBudget(request: Request) {
  const raw = recoveryClockOverrideAllowed() ? request.headers.get("x-recovery-test-budget-ms") : null;
  const t = raw === null ? NaN : Number(raw);
  return Number.isFinite(t) && t >= 0 ? t : undefined;
}

/**
 * Bulk sends must come from the preview page. The preview signs the exact recipient list and an
 * expiry with a key derived from the admin credentials (server-side only); "send" refuses any list
 * that wasn't previewed, was changed, or is older than 15 minutes.
 */
const PREVIEW_TTL_MS = 15 * 60_000;
const previewKey = () => {
  const c = adminCredentials();
  return createHash("sha256").update(JSON.stringify(["ztfc-recovery-preview-v1", c?.user ?? "", c?.pass ?? ""])).digest();
};
const previewSig = (ids: string[], exp: number) => createHmac("sha256", previewKey()).update(`v1|${exp}|${[...new Set(ids)].sort().join(",")}`).digest("hex");
const previewFields = (ids: string[], now: number) => {
  const exp = now + PREVIEW_TTL_MS;
  return `<input type="hidden" name="preview_exp" value="${exp}"><input type="hidden" name="preview_sig" value="${previewSig(ids, exp)}">`;
};
function previewValid(ids: string[], form: FormData, now: number) {
  const exp = Number(form.get("preview_exp"));
  if (!Number.isInteger(exp) || exp < now || exp > now + PREVIEW_TTL_MS) return false;
  return safeEqualHex(previewSig(ids, exp), String(form.get("preview_sig") ?? ""));
}

const PER_PAGE = 25;
const BUCKETS = ["eligible", "waiting", "contacted", "purchased", "ineligible", "all"] as const;
type Bucket = (typeof BUCKETS)[number];

type F = { q: string; bucket: Bucket; from: string; to: string; page: number };
function filters(u: URL): F {
  const d = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const b = u.searchParams.get("show") as Bucket;
  return { q: (u.searchParams.get("q") ?? "").trim().slice(0, 100), bucket: BUCKETS.includes(b) ? b : "eligible", from: d(u.searchParams.get("from")), to: d(u.searchParams.get("to")), page: Math.max(1, Math.min(1000, Number(u.searchParams.get("page")) || 1)) };
}
const qs = (f: F, page: number) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: f.q, show: f.bucket, from: f.from, to: f.to, page: String(page) })) if (v) p.set(k, v);
  return `/admin/recovery?${p.toString().replace(/&/g, "&amp;")}`;
};

const includeTest = () => razorpayKeys().mode === "test";
const contacted = (r: RecoveryRow) => r.messages.some((m) => m.status === "sent" || m.status === "opened");
const reminderCell = (m: RecoveryMessage | null) => (m ? `${badge(m.status)}<br><span class="m nw">${ist(m.sentAt ?? m.createdAt)}</span>` : '<span class="m">—</span>');
const recoveryStatus = (r: RecoveryRow) => `${badge(r.a.bucket)}<br><span class="m">${esc(r.a.reason)}</span>`;

function visible(rows: RecoveryRow[], f: F) {
  const q = f.q.toLowerCase();
  return rows.filter((r) => {
    if (!includeTest() && isTestOrder(r.order)) return false;
    if (f.bucket === "contacted" ? !contacted(r) : f.bucket !== "all" && r.a.bucket !== f.bucket) return false;
    const day = istDate(r.order.createdAt);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (q && ![r.order.id, r.order.customerName, r.order.customerEmail, r.order.customerPhone ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  });
}

function automationPanel(s: RecoverySettings, runs: RecoveryRun[], now: number) {
  const paused = !!s.pausedUntil && Date.parse(s.pausedUntil) > now;
  const lastCron = runs.find((r) => r.trigger === "cron");
  const stale = s.automationEnabled && (!lastCron || now - Date.parse(lastCron.startedAt) > 15 * 60_000);
  const state = !s.automationEnabled ? '<span class="b muted">OFF</span>' : paused ? `<span class="b warn">PAUSED until ${esc(ist(s.pausedUntil))}</span>` : '<span class="b ok">ON</span>';
  const confirm = (text: string) => `<label class="check"><input type="checkbox" name="confirm" value="yes" required> ${esc(text)}</label>`;
  const form = (action: string, inner: string, button: string, primary = false) => `<form method="post" action="/admin/recovery" class="f"><input type="hidden" name="action" value="${action}">${inner}<button class="btn${primary ? " p" : ""}" type="submit">${esc(button)}</button></form>`;
  return `<section class="card"><h2>Automatic reminders</h2>
<p class="sub">Scheduler: Supabase pg_cron calls this site about every 5 minutes. Reminders go only to customers who opted in: 1st at 30 minutes, 2nd at 24 hours. Razorpay is re-checked before every send.</p>
${stale ? `<p class="note bad">No scheduler run in the last 15 minutes while automation is on. Check that the Supabase project isn't paused and that the <code>ztfc-recovery</code> cron job exists (see docs/CHECKOUT_RECOVERY.md).</p>` : ""}
<dl class="kv"><dt>Status</dt><dd>${state}</dd><dt>Last scheduler run</dt><dd>${lastCron ? `${ist(lastCron.startedAt)} · ${badge(lastCron.status)}${lastCron.note ? ` <span class="m">${esc(lastCron.note)}</span>` : ""}` : '<span class="m">none yet</span>'}</dd>
<dt>Next run</dt><dd>${lastCron ? `around ${esc(ist(new Date(Date.parse(lastCron.startedAt) + 5 * 60_000).toISOString()))} (every 5 minutes)` : "every 5 minutes once the cron job is set up"}</dd>
<dt>Daily limit</dt><dd>${s.dailyCap} reminder emails per 24 hours (automatic + manual)</dd></dl>
<div class="cols" style="margin-top:14px">
${s.automationEnabled ? form("automation-off", confirm("Turn automatic reminders off"), "Disable automation") : form("automation-on", confirm("Turn automatic reminders on (opted-in customers only)"), "Enable automation", true)}
${paused ? form("resume", confirm("Resume reminders now"), "Resume reminders", true) : form("pause", `<label class="l">Pause for<select name="hours"><option value="1">1 hour</option><option value="24" selected>24 hours</option><option value="168">7 days</option></select></label>${confirm("Pause reminders")}`, "Pause")}
${form("cap", `<label class="l">Daily limit<input type="number" name="cap" min="0" max="500" value="${s.dailyCap}" style="width:100px"></label>${confirm("Change the daily limit")}`, "Save limit")}
${form("run-now", confirm("Run one reminder pass now (same rules; does nothing while automation is off or paused)"), "Run now")}
</div></section>`;
}

/** Opt-outs received by reply, WhatsApp "stop" or a support email: recorded here, effective for every channel. */
function stopCard() {
  return `<section class="card"><h2>Record a "stop" request</h2>
<p class="sub">When a customer asks (by email reply, WhatsApp or support) to stop reminders, enter their email address. They get no more reminder emails and no WhatsApp follow-up. Only a one-way hash of the address is stored. Order and delivery emails for purchases are not affected.</p>
<form method="post" action="/admin/recovery" class="f"><input type="hidden" name="action" value="stop">
<label class="l">Customer email<input type="email" name="email" required maxlength="254" autocomplete="off"></label>
<label class="check"><input type="checkbox" name="confirm" value="yes" required> Stop all reminders to this address</label><button class="btn" type="submit">Stop reminders</button></form></section>`;
}

function runLog(runs: RecoveryRun[]) {
  const shown = runs.filter((r) => r.status === "error" || r.failed > 0 || r.sent > 0 || r.recovered > 0 || r.trigger === "admin").slice(0, 15);
  return `<section class="card"><h2>Scheduler log</h2><p class="sub">Runs that sent, failed or were started by an admin (routine "nothing to do" runs are hidden).</p>
${shown.length ? `<div class="tw"><table><thead><tr><th>Started (IST)</th><th>Trigger</th><th>Status</th><th class="r">Checked</th><th class="r">Sent</th><th class="r">Failed</th><th class="r">Paid on re-check</th><th>Note</th></tr></thead><tbody>${shown
    .map((r) => `<tr><td class="nw">${ist(r.startedAt)}</td><td>${esc(r.trigger)}</td><td>${badge(r.status)}</td><td class="r">${r.examined}</td><td class="r">${r.sent}</td><td class="r">${r.failed}</td><td class="r">${r.recovered}</td><td class="m">${esc(r.note ?? "")}</td></tr>`)
    .join("")}</tbody></table></div>` : `<div class="empty">No runs to show yet.</div>`}</section>`;
}

function history(messages: RecoveryMessage[], orders: Map<string, Order>) {
  const rows = messages.slice(0, 30);
  return `<section class="card"><h2>Follow-up history</h2>
${rows.length ? `<div class="tw"><table><thead><tr><th>When (IST)</th><th>Customer</th><th>Order</th><th>Channel</th><th>Reminder</th><th>Status</th><th>By</th><th>Error</th></tr></thead><tbody>${rows
    .map((m) => {
      const o = orders.get(m.orderId);
      return `<tr><td class="nw">${ist(m.sentAt ?? m.createdAt)}</td><td>${o ? `${esc(o.customerName)}<br><span class="m">${esc(o.customerEmail)}</span>` : "—"}</td><td><code>${esc(m.orderId)}</code></td><td>${m.channel === "whatsapp" ? "WhatsApp (manual)" : "Email"}</td><td>${m.stage === "auto_1" ? "1st (auto)" : m.stage === "auto_2" ? "2nd (auto)" : "Manual"}</td><td>${badge(m.status)}${m.attempts > 1 ? ` <span class="m">${m.attempts} attempts</span>` : ""}</td><td>${esc(m.triggeredBy)}</td><td class="m">${esc(m.error ?? "")}</td></tr>`;
    })
    .join("")}</tbody></table></div>` : `<div class="empty">No follow-ups yet.</div>`}</section>`;
}

function table(rows: RecoveryRow[], f: F, total: number, eligibleIds: string[]) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(f.page, pages);
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return `<section class="card"><h2>Pending checkouts</h2>
<form class="f" method="get" action="/admin/recovery" role="search">
<label class="l">Search<input type="search" name="q" value="${esc(f.q)}" placeholder="Name, email, mobile or order ID"></label>
<label class="l">Show<select name="show">${BUCKETS.map((b) => `<option value="${b}"${f.bucket === b ? " selected" : ""}>${{ eligible: "Eligible for follow-up", waiting: "Waiting (not due / paying)", contacted: "Already contacted", purchased: "Bought later", ineligible: "Not eligible", all: "All unpaid checkouts" }[b]}</option>`).join("")}</select></label>
<label class="l">From<input type="date" name="from" value="${esc(f.from)}"></label><label class="l">To<input type="date" name="to" value="${esc(f.to)}"></label>
<button class="btn p" type="submit">Apply</button><a class="btn" href="/admin/recovery">Reset</a></form></section>
<form method="post" action="/admin/recovery"><input type="hidden" name="action" value="preview">
<div class="tw">${shown.length ? `<table><thead><tr><th>Select</th><th>Customer</th><th>Mobile</th><th>Order</th><th class="r">Amount</th><th>Order date (IST)</th><th>Payment</th><th>1st reminder</th><th>2nd reminder</th><th>Last follow-up</th><th>Recovery status</th><th>Actions</th></tr></thead><tbody>${shown
    .map((r) => {
      const o = r.order;
      return `<tr><td>${r.a.manualEmail ? `<input type="checkbox" name="ids" value="${esc(o.id)}" aria-label="Select ${esc(o.customerName)}">` : ""}</td>
<td>${esc(o.customerName)}<br><span class="m">${esc(o.customerEmail)}</span></td><td class="nw">${esc(o.customerPhone ?? "—")}</td>
<td><a href="/admin/orders?view=orders&amp;id=${esc(o.id)}"><code>${esc(o.id)}</code></a>${testTag(o)}</td><td class="r nw">${inr(o.amount)}</td><td class="nw">${ist(o.createdAt)}</td><td>${badge(o.status)}</td>
<td>${reminderCell(r.a.first)}</td><td>${reminderCell(r.a.second)}</td><td class="nw">${ist(r.a.lastFollowUp)}</td><td>${recoveryStatus(r)}</td>
<td class="nw">${r.a.manualEmail ? `<button class="btn" type="submit" name="one" value="${esc(o.id)}">Email</button> ` : ""}${r.whatsappLink ? `<a class="btn" href="/admin/recovery?whatsapp=${esc(o.id)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}</td></tr>`;
    })
    .join("")}</tbody></table>` : `<div class="empty">No checkouts match.</div>`}</div>
<p class="pg"><span>${total} checkout(s) · page ${page} of ${pages}</span><span>${page > 1 ? `<a class="btn" href="${qs(f, page - 1)}">← Previous</a> ` : ""}${page < pages ? `<a class="btn" href="${qs(f, page + 1)}">Next →</a>` : ""}</span></p>
<p class="f" style="margin-top:12px"><button class="btn p" type="submit">Preview email to selected</button><button class="btn" type="submit" name="all" value="1"${eligibleIds.length ? "" : " disabled"}>Select all eligible (${eligibleIds.length}) and preview</button></p>
<p class="sub" style="margin-top:8px">Nothing is sent from this step: the next page shows the recipient count and the email for a final confirmation. At most ${RULES.BULK_BATCH} emails are sent per confirmation.</p>
</form>`;
}

export async function recoveryView(u: URL, orders: Order[], now = Date.now()) {
  const store = getStore();
  const [{ rows, recovered, messages }, settings, runs] = await Promise.all([recoveryDashboard(orders, now), store.getRecoverySettings(), store.listRecoveryRuns(100)]);
  const f = filters(u);
  const real = rows.filter((r) => includeTest() || !isTestOrder(r.order));
  const pending = real.filter((r) => r.order.status !== "processing");
  const eligible = real.filter((r) => r.a.bucket === "eligible");
  const eligibleEmails = new Set(eligible.map((r) => r.order.customerEmail));
  const emailMsgs = messages.filter((m) => m.channel === "email");
  const remindedEmails = new Set(emailMsgs.filter((m) => m.status === "sent").map((m) => orders.find((o) => o.id === m.orderId)?.customerEmail).filter(Boolean));
  const recoveredReal = recovered.filter((o) => includeTest() || !isTestOrder(o));
  const rate = remindedEmails.size ? `${Math.round((recoveredReal.length / remindedEmails.size) * 100)}%` : "—";
  const list = visible(rows, f);
  const eligibleIds = eligible.filter((r) => r.a.manualEmail).map((r) => r.order.id);
  return `
<p class="note info">Reminders go only to customers who ticked the optional reminder box at checkout. Older checkouts (before consent was collected) are never contacted. WhatsApp is manual: the button opens a pre-filled chat, and you review and press Send yourself.</p>
<section class="grid" aria-label="Recovery numbers">
${stat("Pending checkouts", String(pending.length), "unpaid, not counting Test Mode")}
${stat("Eligible customers", String(eligibleEmails.size), "opted in and can be followed up")}
${stat("Emails sent", String(emailMsgs.filter((m) => m.status === "sent").length), "last 60 days")}
${stat("Emails failed", String(emailMsgs.filter((m) => m.status === "failed").length), "retried automatically or from here")}
${stat("Recovered orders", String(recoveredReal.length), "paid after a reminder")}
${stat("Potential revenue", inr(eligibleEmails.size * PRODUCT.amount), `${eligibleEmails.size} × ${inr(PRODUCT.amount)}`)}
${stat("Recovery conversion", rate, "recovered ÷ customers emailed")}
${stat("Recovered revenue", inr(recoveredReal.reduce((s, o) => s + o.amount, 0)))}
</section>
${automationPanel(settings, runs, now)}
${stopCard()}
${table(list, f, list.length, eligibleIds)}
${history(messages, new Map(orders.map((o) => [o.id, o])))}
${runLog(runs)}`;
}

/* ── Actions ───────────────────────────────────────────────────────────── */

function previewPage(orders: Order[], skipped: number, now: number) {
  const sample = orders[0];
  const { subject, text } = renderReminderEmail({ to: sample.customerEmail, name: sample.customerName, locale: sample.locale, orderId: sample.id, continueUrl: "[secure Continue checkout link, created when sent]", unsubscribeUrl: "[unsubscribe link, created when sent]", oneClickUrl: "", sequence: 1 });
  const batch = orders.slice(0, RULES.BULK_BATCH);
  return `<section class="card"><h2>Confirm: send ${batch.length} reminder email(s)</h2>
${orders.length > batch.length ? `<p class="note warn">${orders.length} selected; the first ${batch.length} are sent now. Submit again for the rest.</p>` : ""}
${skipped ? `<p class="note warn">${skipped} selected checkout(s) aren't eligible right now and were left out.</p>` : ""}
<p class="sub">Each customer gets the email in the language they used at checkout. Razorpay is re-checked for every customer right before sending; anyone who has paid meanwhile is skipped.</p>
<div class="tw"><table><thead><tr><th>Customer</th><th>Order</th><th>Language</th></tr></thead><tbody>${batch.map((o) => `<tr><td>${esc(o.customerName)}<br><span class="m">${esc(o.customerEmail)}</span></td><td><code>${esc(o.id)}</code></td><td>${o.locale === "hi" ? "Hindi" : "English"}</td></tr>`).join("")}</tbody></table></div>
<h2 style="margin-top:18px">Email preview (${sample.locale === "hi" ? "Hindi" : "English"}, for ${esc(sample.customerName)})</h2>
<p><strong>Subject:</strong> ${esc(subject)}</p><pre style="white-space:pre-wrap;background:#faf9f6;border:1px solid var(--line);border-radius:12px;padding:14px;font:13px/1.5 ui-monospace,monospace">${esc(text)}</pre>
<form method="post" action="/admin/recovery" class="f" style="margin-top:14px"><input type="hidden" name="action" value="send">${batch.map((o) => `<input type="hidden" name="ids" value="${esc(o.id)}">`).join("")}${previewFields(batch.map((o) => o.id), now)}
<label class="check"><input type="checkbox" name="confirm" value="yes" required> Send this reminder to ${batch.length} customer(s)</label><button class="btn p" type="submit">Send ${batch.length} email(s)</button><a class="btn" href="/admin/recovery">Cancel</a></form></section>`;
}

function resultsPage(results: SendOutcome[], now: number) {
  const failed = results.filter((r) => r.result === "failed");
  const count = (k: SendOutcome["result"]) => results.filter((r) => r.result === k).length;
  return `<section class="card"><h2>Send results</h2><p class="sub">${count("sent")} sent · ${count("failed")} failed · ${count("skipped")} skipped · ${count("paid")} found already paid</p>
<div class="tw"><table><thead><tr><th>Order</th><th>Email</th><th>Result</th><th>Detail</th></tr></thead><tbody>${results
    .map((r) => `<tr><td><code>${esc(r.orderId)}</code></td><td>${esc(r.email)}</td><td>${badge(r.result === "paid" ? "paid" : r.result)}</td><td class="m">${esc(r.reason)}</td></tr>`)
    .join("")}</tbody></table></div>
${failed.length ? `<form method="post" action="/admin/recovery" class="f" style="margin-top:14px"><input type="hidden" name="action" value="send">${failed.map((r) => `<input type="hidden" name="ids" value="${esc(r.orderId)}">`).join("")}${previewFields(failed.map((r) => r.orderId), now)}<label class="check"><input type="checkbox" name="confirm" value="yes" required> Retry the ${failed.length} failed email(s)</label><button class="btn p" type="submit">Retry failed</button></form>` : ""}
<p style="margin-top:14px"><a class="btn" href="/admin/recovery">← Checkout Recovery</a></p></section>`;
}

/**
 * Handles a POST to /admin/recovery (already signed in and same-origin checked by the caller).
 * Returns either a notice for the normal page or a full body (preview / results).
 */
export async function recoveryAction(form: FormData, orders: Order[], now = Date.now(), budgetMs?: number): Promise<{ notice: Notice } | { body: string; title: string; notice?: Notice }> {
  const store = getStore();
  const action = String(form.get("action") ?? "");
  const confirmed = form.get("confirm") === "yes";

  if (action === "preview") {
    let ids = form.getAll("ids").map(String);
    const one = form.get("one");
    const { rows } = await recoveryDashboard(orders, now);
    const allowed = new Map(rows.filter((r) => r.a.manualEmail && (includeTest() || !isTestOrder(r.order))).map((r) => [r.order.id, r.order]));
    if (one) ids = [String(one)];
    else if (form.get("all") === "1") ids = [...allowed.keys()];
    ids = [...new Set(ids)];
    if (!ids.length) return { notice: { tone: "warn", text: "Select at least one customer first." } };
    const chosen = ids.map((id) => allowed.get(id)).filter((o): o is Order => !!o);
    if (!chosen.length) return { notice: { tone: "warn", text: "None of the selected checkouts can be emailed right now (see their recovery status)." } };
    return { title: "Confirm reminder emails", body: previewPage(chosen, ids.length - chosen.length, now) };
  }

  if (!confirmed) return { notice: { tone: "warn", text: "Nothing was done: please tick the confirmation box." } };

  if (action === "send") {
    const ids = [...new Set(form.getAll("ids").map(String))];
    if (!ids.length) return { notice: { tone: "warn", text: "No customers selected." } };
    if (ids.length > RULES.BULK_BATCH || !previewValid(ids, form, now)) return { notice: { tone: "bad", text: "Nothing was sent: open the preview first and send from there (the recipient list must match the preview, which is valid for 15 minutes)." } };
    // One bulk send at a time (double-clicks, two tabs, two admins). Each send is also claimed once per order per day.
    if (!(await store.acquireRecoveryLock("bulk", 3 * 60_000))) return { notice: { tone: "warn", text: "Another send is still running. Wait a minute, then check the follow-up history before trying again." } };
    // Also take the scheduler's lock, so a manual send and an automatic run can never email the same
    // customer at the same moment (each would otherwise pass the 12-hour check before the other records).
    if (!(await store.acquireRecoveryLock("run", 3 * 60_000))) {
      await store.releaseRecoveryLock("bulk").catch(() => {});
      return { notice: { tone: "warn", text: "Automatic reminders are being sent right now. Nothing was sent: try again in a minute." } };
    }
    try {
      const results = await sendManualReminders(ids, now, budgetMs);
      return { title: "Send results", body: resultsPage(results, now) };
    } finally {
      await store.releaseRecoveryLock("run").catch(() => {});
      await store.releaseRecoveryLock("bulk").catch(() => {});
    }
  }
  if (action === "stop") {
    const email = cleanEmail(form.get("email"));
    if (!email) return { notice: { tone: "bad", text: "Enter a valid email address." } };
    await store.addSuppression(emailHash(email), "admin");
    return { notice: { tone: "ok", text: "Done: no more reminder emails or WhatsApp follow-ups to that address." } };
  }
  if (action === "automation-on" || action === "automation-off") {
    await store.updateRecoverySettings({ automationEnabled: action === "automation-on" });
    return { notice: { tone: "ok", text: action === "automation-on" ? "Automatic reminders are ON (opted-in customers only)." : "Automatic reminders are OFF. Nothing will be sent automatically." } };
  }
  if (action === "pause") {
    const hours = [1, 24, 168].includes(Number(form.get("hours"))) ? Number(form.get("hours")) : 24;
    const until = new Date(now + hours * 3_600_000).toISOString();
    await store.updateRecoverySettings({ pausedUntil: until });
    return { notice: { tone: "ok", text: `Reminders paused until ${ist(until)}.` } };
  }
  if (action === "resume") {
    await store.updateRecoverySettings({ pausedUntil: null });
    return { notice: { tone: "ok", text: "Reminders resumed." } };
  }
  if (action === "cap") {
    const cap = Number(form.get("cap"));
    if (!Number.isInteger(cap) || cap < 0 || cap > 500) return { notice: { tone: "bad", text: "The daily limit must be a whole number from 0 to 500." } };
    await store.updateRecoverySettings({ dailyCap: cap });
    return { notice: { tone: "ok", text: `Daily limit set to ${cap} reminder emails.` } };
  }
  if (action === "run-now") {
    const r = await runRecovery({ trigger: "admin", nonce: null, now });
    return { notice: { tone: r.status === "error" ? "bad" : "ok", text: `Run ${r.status}: checked ${r.examined}, sent ${r.sent}, failed ${r.failed}, paid on re-check ${r.recovered}${r.note ? ` (${r.note})` : ""}.` } };
  }
  return { notice: { tone: "warn", text: "Unknown action." } };
}

/**
 * GET /admin/recovery?whatsapp=<order id>: logs that the admin opened the chat, then redirects to
 * WhatsApp with the pre-filled message. Nothing is sent by the system. Only for an opted-in,
 * still-eligible checkout, and only from the admin page itself.
 */
export async function recoveryWhatsapp(request: Request, id: string, orders: Order[], now = Date.now()): Promise<Response> {
  const notFound = (msg: string) => new Response(msg, { status: 404, headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" } });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response("Open WhatsApp from the admin page.", { status: 403, headers: { "cache-control": "no-store" } });
  if (!/^ord_[a-f0-9]{24}$/.test(id)) return notFound("Unknown order.");
  const { rows } = await recoveryDashboard(orders, now);
  const row = rows.find((r) => r.order.id === id);
  const url = row?.a.whatsapp ? whatsappUrl(row.order.customerPhone) : null;
  if (!row || !url) return notFound("WhatsApp isn't available for this checkout (no WhatsApp consent, already followed up, paid, or not eligible).");
  await logWhatsappOpened(row.order).catch((e) => console.error(`[recovery] whatsapp log failed: ${(e as Error).message}`));
  return new Response(null, { status: 303, headers: { location: url, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
