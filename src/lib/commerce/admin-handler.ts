import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { PRODUCT, adminCredentials, checkoutStatus, emailDriver, ebookBucket, ebookStoragePath, missingEnv, ownerEmail, razorpayKeys, resendConfig, storageDriver, storeDriver, supportEmail } from "@/lib/commerce/config";
import { resendSenderStatus, sendIntegrationTestEmail } from "@/lib/commerce/email";
import { ensureDelivered } from "@/lib/commerce/fulfil";
import { NO_STORE, blockedReason, sameOrigin } from "@/lib/commerce/http";
import { clientIp, isLimited, rateLimit, recordHit, refundHit } from "@/lib/commerce/rate-limit";
import { ebookStorageStatus } from "@/lib/commerce/storage";
import { getStore, type Order, type OrderStatus } from "@/lib/commerce/store";
import { badge, esc, inr, isTestOrder, ist, istDate, layout, ordersTable, stat, testTag, type View } from "@/lib/commerce/admin-ui";
import { consentPage, recoveryAction, recoveryNow, recoveryTestBudget, recoveryView, recoveryWhatsapp } from "@/lib/commerce/admin-recovery";

/**
 * Admin dashboard: /admin/orders (HTTP Basic auth with ADMIN_USER / ADMIN_PASSWORD).
 * Disabled entirely (404) until both are set and the password is 9–10 characters long.
 * Read-only views; the only actions are confirmed, same-origin POSTs (retry an order's emails,
 * send one integration test email to OWNER_EMAIL). Nothing here can mark an order paid.
 */
const digest = (s: string) => createHash("sha256").update(s).digest();

function authorised(request: Request): { user: string } | "disabled" | null {
  const creds = adminCredentials();
  if (!creds) return "disabled";
  const h = request.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return null;
  const decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  const userOk = timingSafeEqual(digest(decoded.slice(0, i)), digest(creds.user));
  const passOk = timingSafeEqual(digest(decoded.slice(i + 1)), digest(creds.pass));
  return userOk && passOk ? { user: creds.user } : null;
}

const HEADERS = {
  ...NO_STORE,
  "content-type": "text/html; charset=utf-8",
  // No scripts at all. Styles inline + Google Fonts (Inter); images inline (logo).
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "x-frame-options": "DENY",
  // "same-origin", not "no-referrer": with no-referrer, browsers send "Origin: null" on form POSTs over
  // HTTPS, which the CSRF check then (correctly) refuses. same-origin still sends nothing to other sites.
  "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff",
};

// Brute-force protection (in memory, per server instance; a shared store would need a schema change).
// Only failed attempts count in the end; every attempt is reserved up front.
// - Per IP: the lockout is checked BEFORE the password, so a locked-out IP is refused even with
//   the right password, including requests sent in parallel.
// - Globally: when failures across all IPs are high, checks are serialised (see below), which caps
//   total guessing speed without permanently locking the owner out.
const FAIL_PER_IP = 10;
const FAIL_IP_WINDOW = 15 * 60_000;
const FAIL_GLOBAL = 200;
const FAIL_GLOBAL_WINDOW = 60 * 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// While global failures are high, credential checks run one at a time, 2 s apart: about 30 attempts
// a minute across ALL clients, however many run in parallel. The owner still gets through (after a
// wait) instead of being locked out; only a full queue is refused.
const SLOW_DELAY = 2000;
const MAX_QUEUE = 30;
let queue: Promise<unknown> = Promise.resolve();
let queued = 0;
const inQueue = new Set<string>(); // one slot per IP, so a single client can't fill the queue
function serialised<T>(ip: string, fn: () => T): Promise<T> {
  queued += 1;
  inQueue.add(ip);
  const run = queue.then(async () => {
    await sleep(SLOW_DELAY);
    return fn();
  });
  queue = run.catch(() => undefined).finally(() => {
    queued -= 1;
    inQueue.delete(ip);
  });
  return run;
}

async function gate(request: Request): Promise<Response | { user: string }> {
  if (!adminCredentials()) return new Response("Not found", { status: 404, headers: NO_STORE });
  const ipKey = `admin-fail:${clientIp(request)}`;
  const tooMany = (retryAfter: number) => new Response("Too many failed sign-in attempts. Try again later.", { status: 429, headers: { ...NO_STORE, "retry-after": String(retryAfter) } });
  const locked = isLimited(ipKey, FAIL_PER_IP);
  if (locked.limited) return tooMany(locked.retryAfter);

  // A request with no credentials is the browser's normal first step, not a guess.
  const attempt = !!request.headers.get("authorization");
  if (attempt) {
    // Reserve the attempt BEFORE any waiting, so parallel requests can't all slip past the
    // per-IP check. A successful login gets its reservation back.
    recordHit(ipKey, FAIL_IP_WINDOW);
    recordHit("admin-fail:all", FAIL_GLOBAL_WINDOW);
  }
  let a: ReturnType<typeof authorised>;
  if (attempt && isLimited("admin-fail:all", FAIL_GLOBAL).limited) {
    const ip = clientIp(request);
    if (queued >= MAX_QUEUE || inQueue.has(ip)) {
      // Turned away without checking the password: not a failed attempt, so give the reservation back.
      refundHit(ipKey);
      refundHit("admin-fail:all");
      return tooMany(queued >= MAX_QUEUE ? 60 : 5);
    }
    a = await serialised(ip, () => authorised(request));
  } else {
    a = authorised(request);
  }
  if (a === "disabled") return new Response("Not found", { status: 404, headers: NO_STORE });
  if (!a) return new Response("Authentication required", { status: 401, headers: { ...NO_STORE, "www-authenticate": 'Basic realm="CRAFT & CODE admin", charset="UTF-8"' } });
  if (attempt) {
    refundHit(ipKey);
    refundHit("admin-fail:all");
  }
  return a;
}

const VIEWS: View[] = ["overview", "orders", "customers", "payments", "ebook", "email", "recovery"];
// Status filter options. Refunds aren't processed by this store, so there is no refund filter.
const STATUSES: OrderStatus[] = ["pending", "processing", "paid", "failed", "cancelled"];
const PER_PAGE = 25;
const MAX_ROWS = 1000;

const statusBar = () => {
  const st = checkoutStatus();
  return { checkout: st.enabled ? "enabled" : `off (${st.reason})`, mode: st.mode === "test" ? "TEST" : st.mode === "live" ? "LIVE" : "—", store: storeDriver(), storage: storageDriver(), email: emailDriver() };
};

/* ── Filters ─────────────────────────────────────────────────────────── */

type Filters = { q: string; status: string; from: string; to: string; sort: "new" | "old"; page: number };
function filters(u: URL): Filters {
  const d = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  return {
    q: (u.searchParams.get("q") ?? "").trim().slice(0, 100),
    status: STATUSES.includes(u.searchParams.get("status") as OrderStatus) ? (u.searchParams.get("status") as string) : "",
    from: d(u.searchParams.get("from")),
    to: d(u.searchParams.get("to")),
    sort: u.searchParams.get("sort") === "old" ? "old" : "new",
    page: Math.max(1, Math.min(1000, Number(u.searchParams.get("page")) || 1)),
  };
}
function apply(orders: Order[], f: Filters) {
  const q = f.q.toLowerCase();
  const out = orders.filter((o) => {
    if (f.status && o.status !== f.status) return false;
    const day = istDate(o.createdAt);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (q && ![o.id, o.customerName, o.customerEmail, o.customerPhone ?? "", o.razorpayOrderId, o.razorpayPaymentId ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  });
  return out.sort((a, b) => (f.sort === "old" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
}
const qs = (f: Filters, extra: Record<string, string | number>) => {
  const p = new URLSearchParams({ view: "orders" });
  for (const [k, v] of Object.entries({ q: f.q, status: f.status, from: f.from, to: f.to, sort: f.sort === "old" ? "old" : "", ...extra })) if (v !== "" && v !== undefined) p.set(k, String(v));
  return `/admin/orders?${p.toString().replace(/&/g, "&amp;")}`;
};

/* ── Views ───────────────────────────────────────────────────────────── */

function overview(orders: Order[], truncated: boolean) {
  const paid = orders.filter((o) => o.status === "paid");
  // Real revenue counts only verified paid orders made with live keys; Test Mode orders are shown apart.
  const revenue = paid.filter((o) => !isTestOrder(o)).reduce((s, o) => s + o.amount, 0);
  const testRevenue = paid.filter(isTestOrder).reduce((s, o) => s + o.amount, 0);
  const customers = new Set(paid.map((o) => o.customerEmail)).size;
  const downloads = orders.reduce((s, o) => s + o.downloadCount, 0);
  const count = (s: OrderStatus[]) => orders.filter((o) => s.includes(o.status)).length;
  const failedEmails = orders.filter((o) => o.status === "paid" && (o.emailStatus === "failed" || o.ownerEmailStatus === "failed"));
  const missing = missingEnv();
  return `
${truncated ? `<p class="note warn">Showing the latest ${MAX_ROWS} orders.</p>` : ""}
${missing.length ? `<p class="note bad">Missing configuration: ${esc(missing.join(", "))}</p>` : ""}
${failedEmails.length ? `<p class="note warn">${failedEmails.length} paid order(s) have a failed email. Open them from the Email page to retry.</p>` : ""}
<section class="grid" aria-label="Key numbers">
${stat("Total orders", String(orders.length), "all statuses")}
${stat("Revenue", inr(revenue), testRevenue ? `verified live orders · ${inr(testRevenue)} in TEST orders excluded` : "verified paid orders (live keys)")}
${stat("Successful payments", String(paid.length))}
${stat("Customers", String(customers), "unique paying emails")}
${stat("Pending", String(count(["pending", "processing"])), "awaiting payment / confirmation")}
${stat("Failed", String(count(["failed"])), "payment attempt declined")}
${stat("Cancelled", String(count(["cancelled"])), "payment window closed")}
${stat("Ebook downloads", String(downloads), "signed-link downloads")}
</section>
<section class="card"><h2>Recent orders</h2>${ordersTable(orders.slice(0, 8), { compact: true })}<p class="pg"><span></span><a class="btn" href="/admin/orders?view=orders">All orders →</a></p></section>`;
}

function ordersView(orders: Order[], f: Filters) {
  const list = apply(orders, f);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(f.page, pages);
  const rows = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return `<section class="card"><h2>Orders</h2>
<form class="f" method="get" action="/admin/orders" role="search"><input type="hidden" name="view" value="orders">
<label class="l">Search<input type="search" name="q" value="${esc(f.q)}" placeholder="Name, email, phone, order or payment ID"></label>
<label class="l">Payment status<select name="status"><option value="">All</option>${STATUSES.map((s) => `<option value="${s}"${f.status === s ? " selected" : ""}>${s}</option>`).join("")}</select></label>
<label class="l">From<input type="date" name="from" value="${esc(f.from)}"></label>
<label class="l">To<input type="date" name="to" value="${esc(f.to)}"></label>
<label class="l">Sort<select name="sort"><option value="new">Newest first</option><option value="old"${f.sort === "old" ? " selected" : ""}>Oldest first</option></select></label>
<button class="btn p" type="submit">Apply</button><a class="btn" href="/admin/orders?view=orders">Reset</a></form></section>
${ordersTable(rows)}
<nav class="pg" aria-label="Pages"><span>${list.length} order(s) · page ${page} of ${pages}</span><span>${page > 1 ? `<a class="btn" href="${qs(f, { page: page - 1 })}">← Previous</a> ` : ""}${page < pages ? `<a class="btn" href="${qs(f, { page: page + 1 })}">Next →</a>` : ""}</span></nav>`;
}

function orderDetail(o: Order) {
  const access = o.status === "paid" ? badge("paid") + " access active" : badge(o.status) + " no access";
  const canRetry = o.status === "paid" && (o.emailStatus !== "sent" || (!!ownerEmail() && o.ownerEmailStatus !== "sent"));
  return `<p><a class="btn" href="/admin/orders?view=orders">← Orders</a></p>
<div class="cols">
<section class="card"><h2>Customer</h2><dl class="kv"><dt>Name</dt><dd>${esc(o.customerName)}</dd><dt>Email</dt><dd>${esc(o.customerEmail)}</dd><dt>Mobile</dt><dd>${esc(o.customerPhone ?? "—")}</dd><dt>Language</dt><dd>${o.locale === "hi" ? "Hindi" : "English"}</dd><dt>All orders</dt><dd><a href="/admin/orders?view=orders&amp;q=${encodeURIComponent(o.customerEmail)}">View purchase history</a></dd></dl></section>
<section class="card"><h2>Payment</h2><dl class="kv"><dt>Order ID</dt><dd><code>${esc(o.id)}</code>${testTag(o)}</dd><dt>Razorpay order</dt><dd><code>${esc(o.razorpayOrderId)}</code></dd><dt>Razorpay payment</dt><dd><code>${esc(o.razorpayPaymentId ?? "—")}</code></dd><dt>Amount</dt><dd>${inr(o.amount)} ${esc(o.currency)}</dd><dt>Status</dt><dd>${badge(o.status)}</dd><dt>Created</dt><dd>${ist(o.createdAt)}</dd><dt>Paid</dt><dd>${ist(o.paidAt)}</dd><dt>Verification</dt><dd class="m">Paid status is only set after the Razorpay signature and a captured payment are verified on the server (checkout verify or signed webhook).</dd></dl></section>
<section class="card"><h2>Email delivery</h2><dl class="kv"><dt>Customer email</dt><dd>${badge(o.emailStatus)} · ${o.emailAttempts} attempt(s)${o.emailSentAt ? ` · sent ${ist(o.emailSentAt)}` : ""}</dd>${o.lastEmailError ? `<dt>Last error</dt><dd class="m">${esc(o.lastEmailError)}</dd>` : ""}<dt>Owner notification</dt><dd>${badge(o.ownerEmailStatus)} · ${o.ownerEmailAttempts} attempt(s)${o.ownerEmailSentAt ? ` · sent ${ist(o.ownerEmailSentAt)}` : ""}</dd>${o.lastOwnerEmailError ? `<dt>Last error</dt><dd class="m">${esc(o.lastOwnerEmailError)}</dd>` : ""}</dl>
${canRetry ? `<form method="post" class="f" style="margin-top:14px"><input type="hidden" name="action" value="retry"><input type="hidden" name="id" value="${esc(o.id)}"><label class="check"><input type="checkbox" name="confirm" value="yes" required> Retry the pending email(s) for this one order</label><button class="btn p" type="submit">Retry email</button></form>` : ""}</section>
<section class="card"><h2>Downloads &amp; access</h2><dl class="kv"><dt>Access</dt><dd>${access}</dd><dt>Total downloads</dt><dd>${o.downloadCount}</dd><dt>Today</dt><dd>${o.downloadDay === new Date().toISOString().slice(0, 10) ? o.downloadsToday : 0}</dd><dt>Last download</dt><dd>${ist(o.lastDownloadAt)}</dd></dl></section>
</div>`;
}

function customersView(orders: Order[], q: string) {
  const map = new Map<string, { name: string; email: string; phone: string | null; orders: number; paid: number; spent: number; last: string }>();
  for (const o of orders) {
    const c = map.get(o.customerEmail) ?? { name: o.customerName, email: o.customerEmail, phone: o.customerPhone, orders: 0, paid: 0, spent: 0, last: o.createdAt };
    c.orders += 1;
    if (o.status === "paid") {
      c.paid += 1;
      c.spent += o.amount;
    }
    if (o.createdAt > c.last) Object.assign(c, { last: o.createdAt, name: o.customerName, phone: o.customerPhone ?? c.phone });
    map.set(o.customerEmail, c);
  }
  const ql = q.toLowerCase();
  const list = [...map.values()].filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.email.includes(ql)).sort((a, b) => b.last.localeCompare(a.last));
  return `<section class="card"><h2>Customers</h2><p class="sub">Grouped by email from real orders. Contact details are shown only to signed-in admins.</p>
<form class="f" method="get" action="/admin/orders" role="search"><input type="hidden" name="view" value="customers"><label class="l">Search<input type="search" name="q" value="${esc(q)}" placeholder="Name or email"></label><button class="btn p" type="submit">Search</button></form></section>
<div class="tw">${list.length ? `<table><thead><tr><th>Customer</th><th>Mobile</th><th class="r">Orders</th><th class="r">Paid</th><th class="r">Total spent</th><th>Last order</th><th></th></tr></thead><tbody>${list
    .map((c) => `<tr><td>${esc(c.name)}<br><span class="m">${esc(c.email)}</span></td><td class="nw">${esc(c.phone ?? "—")}</td><td class="r">${c.orders}</td><td class="r">${c.paid}</td><td class="r nw">${inr(c.spent)}</td><td class="nw">${ist(c.last)}</td><td><a class="btn" href="/admin/orders?view=orders&amp;q=${encodeURIComponent(c.email)}">History</a></td></tr>`)
    .join("")}</tbody></table>` : `<div class="empty">No customers yet.</div>`}</div>`;
}

async function paymentsView(orders: Order[]) {
  const { keyId, webhookSecret, mode } = razorpayKeys();
  let events: { eventId: string; type: string; receivedAt: string }[] = [];
  let evError = "";
  try {
    events = await getStore().listWebhookEvents(20);
  } catch (e) {
    evError = (e as Error).message;
  }
  const rows = orders.slice(0, 50);
  return `<div class="cols"><section class="card"><h2>Razorpay</h2><dl class="kv"><dt>Mode</dt><dd>${mode === "live" ? badge("failed").replace("failed", "LIVE") : mode === "test" ? '<span class="b warn">TEST MODE</span>' : "—"}</dd><dt>Key ID</dt><dd>${keyId ? "configured" : "missing"}</dd><dt>Webhook secret</dt><dd>${webhookSecret ? "configured · signatures verified on the raw body" : "missing"}</dd><dt>Price</dt><dd>${inr(PRODUCT.amount)} ${PRODUCT.currency}, fixed on the server</dd></dl></section>
<section class="card"><h2>Recent verified webhooks</h2><p class="sub">Only events with a valid signature are stored; each event ID is processed once.</p>${evError ? `<p class="note bad">${esc(evError)}</p>` : events.length ? `<div class="tw"><table><thead><tr><th>Event</th><th>Received (IST)</th><th>ID</th></tr></thead><tbody>${events.map((e) => `<tr><td>${esc(e.type)}</td><td class="nw">${ist(e.receivedAt)}</td><td><code>${esc(e.eventId.slice(0, 18))}…</code></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No webhooks received yet.</div>`}</section></div>
<section class="card"><h2>Payments</h2><p class="sub">Latest 50 orders. There is deliberately no "mark as paid" control.</p>
<div class="tw">${rows.length ? `<table><thead><tr><th>Order</th><th>Razorpay order</th><th>Payment ID</th><th class="r">Amount</th><th>Status</th><th>Paid (IST)</th></tr></thead><tbody>${rows
    .map((o) => `<tr><td><a href="/admin/orders?view=orders&amp;id=${esc(o.id)}"><code>${esc(o.id)}</code></a></td><td><code>${esc(o.razorpayOrderId)}</code></td><td><code>${esc(o.razorpayPaymentId ?? "—")}</code></td><td class="r nw">${inr(o.amount)}</td><td>${badge(o.status)}</td><td class="nw">${ist(o.paidAt)}</td></tr>`)
    .join("")}</tbody></table>` : `<div class="empty">No payments yet.</div>`}</div></section>`;
}

async function ebookView(orders: Order[], check: boolean) {
  const s = check ? await ebookStorageStatus() : null;
  const downloads = orders.reduce((n, o) => n + o.downloadCount, 0);
  const buyersDownloaded = orders.filter((o) => o.status === "paid" && o.downloadCount > 0).length;
  const paid = orders.filter((o) => o.status === "paid").length;
  const today = new Date().toISOString().slice(0, 10);
  const yn = (v: boolean | null, yes: string, no: string) => (v === null ? '<span class="m">—</span>' : v ? `<span class="b ok">${yes}</span>` : `<span class="b bad">${no}</span>`);
  return `<div class="cols"><section class="card"><h2>Ebook</h2><dl class="kv"><dt>Title</dt><dd>${esc(PRODUCT.name)}</dd><dt>File</dt><dd><code>${esc(ebookStoragePath())}</code></dd><dt>Bucket</dt><dd><code>${esc(ebookBucket())}</code> (${esc(storageDriver())})</dd><dt>Delivery</dt><dd>Signed URLs, valid 15 minutes, created per click after a server-side paid check. Paid buyers can download as often as they need. No permanent URL exists.</dd></dl></section>
<section class="card"><h2>Storage status</h2>${s
    ? `${s.ok ? '<p class="note ok">Storage verified: private and the ebook is present.</p>' : `<p class="note bad">Storage problem: ${esc(s.error ?? "see details")}</p>`}<dl class="kv"><dt>Bucket private</dt><dd>${yn(s.bucketPrivate, "private", "PUBLIC")}</dd><dt>Public URL blocked</dt><dd>${yn(s.publicAccessBlocked, "blocked", "OPEN")}</dd><dt>Ebook object</dt><dd>${s.size ? `present · ${(s.size / 1048576).toFixed(2)} MB` : '<span class="b bad">missing</span>'}</dd><dt>Type</dt><dd>${esc(s.mime ?? "—")}</dd><dt>Allowed types</dt><dd>${esc(s.allowedMime ?? "—")}</dd><dt>Size limit</dt><dd>${s.sizeLimit ? `${(s.sizeLimit / 1048576).toFixed(0)} MB` : "—"}</dd></dl>`
    : `<p class="sub">Checks the bucket and file on demand. The private URL is never shown.</p>`}
<form method="get" action="/admin/orders" style="margin-top:12px"><input type="hidden" name="view" value="ebook"><input type="hidden" name="check" value="1"><button class="btn p" type="submit">Verify storage now</button></form></section></div>
<section class="grid">${stat("Total downloads", String(downloads))}${stat("Buyers who downloaded", `${buyersDownloaded}`, `of ${paid} paid`)}${stat("Downloads today", String(orders.filter((o) => o.downloadDay === today).reduce((n, o) => n + o.downloadsToday, 0)))}${stat("Download link", "15 min", "fresh signed URL per click · no daily cap")}</section>`;
}

async function emailView(orders: Order[], check: boolean) {
  const cfg = resendConfig();
  const sender = check ? await resendSenderStatus() : null;
  const paid = orders.filter((o) => o.status === "paid");
  const c = (f: (o: Order) => boolean) => paid.filter(f).length;
  const failed = paid.filter((o) => o.emailStatus === "failed" || o.ownerEmailStatus === "failed");
  const owner = ownerEmail();
  return `<div class="cols"><section class="card"><h2>Configuration</h2><dl class="kv"><dt>Driver</dt><dd>${esc(emailDriver())}</dd><dt>Resend API key</dt><dd>${cfg ? "configured" : '<span class="b bad">missing</span>'}</dd><dt>Sender</dt><dd>${esc(cfg?.from ?? "—")}</dd><dt>Sender domain</dt><dd>${sender ? (sender.status === "verified" ? `${badge("sent").replace("sent", "verified")} ${esc(sender.domain)}` : `<span class="b bad">${esc(sender.status ?? sender.error ?? "unknown")}</span> ${esc(sender.domain)}`) : '<span class="m">not checked</span>'}</dd><dt>Reply-To / support</dt><dd>${esc(supportEmail() ?? "—")}</dd><dt>Owner notifications</dt><dd>${esc(owner ?? "not configured")}</dd></dl>
<form method="get" action="/admin/orders" style="margin-top:12px"><input type="hidden" name="view" value="email"><input type="hidden" name="check" value="1"><button class="btn" type="submit">Check sender domain</button></form></section>
<section class="card"><h2>Send a test email</h2><p class="sub">Sends one clearly labelled test email (no order, receipt or ebook) to the owner address only. Limited to one per 10 minutes.</p>
${owner && cfg ? `<form method="post" class="f"><input type="hidden" name="action" value="test-email"><label class="check"><input type="checkbox" name="confirm" value="yes" required> Send one test email to ${esc(owner)}</label><button class="btn p" type="submit">Send test email</button></form>` : `<p class="note warn">Set RESEND_API_KEY, EMAIL_FROM and OWNER_EMAIL first.</p>`}</section></div>
<section class="grid">${stat("Customer emails sent", String(c((o) => o.emailStatus === "sent")), `of ${paid.length} paid orders`)}${stat("Customer emails failed", String(c((o) => o.emailStatus === "failed")))}${stat("Owner alerts sent", String(c((o) => o.ownerEmailStatus === "sent")))}${stat("Owner alerts failed", String(c((o) => o.ownerEmailStatus === "failed")))}</section>
<section class="card"><h2>Failed deliveries</h2>${failed.length ? ordersTable(failed, { compact: true }) : `<div class="empty">No failed emails.</div>`}</section>`;
}

/* ── Handlers ────────────────────────────────────────────────────────── */

async function render(request: Request, user: string, notice: { tone: "ok" | "bad" | "warn" | "info"; text: string } | null = null, forcedView?: View, page?: { title: string; body: string }) {
  const u = new URL(request.url);
  const view = (forcedView ?? (VIEWS.includes(u.searchParams.get("view") as View) ? u.searchParams.get("view") : "overview")) as View;
  const id = u.searchParams.get("id");
  const check = u.searchParams.get("check") === "1";
  let orders: Order[];
  try {
    orders = await getStore().listOrders(MAX_ROWS);
  } catch (e) {
    return new Response(layout({ view, title: "Database unavailable", user, status: statusBar(), body: `<p class="note bad">Could not load orders: ${esc((e as Error).message)}</p>` }), { status: 503, headers: HEADERS });
  }
  let title = { overview: "Overview", orders: "Orders", customers: "Customers", payments: "Payments", ebook: "Ebook", email: "Email", recovery: "Checkout Recovery" }[view];
  let body: string;
  if (page) {
    title = page.title;
    body = page.body;
  } else if (view === "recovery") {
    try {
      body = await recoveryView(u, orders, recoveryNow(request));
    } catch (e) {
      body = `<p class="note bad">Checkout Recovery is unavailable: ${esc((e as Error).message)}. If migration 003 hasn't been run yet, run it first (docs/CHECKOUT_RECOVERY.md).</p>`;
    }
  } else if (view === "orders" && id) {
    const o = /^ord_[a-f0-9]{24}$/.test(id) ? await getStore().getOrder(id) : null;
    title = o ? `Order ${o.id}` : "Order not found";
    body = o ? orderDetail(o) : `<p class="note warn">No order with that ID.</p><p><a class="btn" href="/admin/orders?view=orders">← Orders</a></p>`;
  } else if (view === "orders") body = ordersView(orders, filters(u));
  else if (view === "customers") body = customersView(orders, (u.searchParams.get("q") ?? "").trim().slice(0, 100));
  else if (view === "payments") body = await paymentsView(orders);
  else if (view === "ebook") body = await ebookView(orders, check);
  else if (view === "email") body = await emailView(orders, check);
  else body = overview(orders, orders.length >= MAX_ROWS);
  return new Response(layout({ view, title, user, status: statusBar(), body, notice }), { headers: HEADERS });
}

export const ADMIN_SECTIONS = ["overview", "customers", "payments", "ebook", "email", "recovery"] as const;

/** GET for /admin/orders (view from ?view=) and /admin/<section> (view fixed by the path). */
export async function adminGet(request: Request, forcedView?: View) {
  const g = await gate(request);
  if (g instanceof Response) return g;
  const wa = forcedView === "recovery" ? new URL(request.url).searchParams.get("whatsapp") : null;
  if (wa !== null) return recoveryWhatsapp(request, wa, await getStore().listOrders(MAX_ROWS), recoveryNow(request));
  const consentFor = forcedView === "recovery" ? new URL(request.url).searchParams.get("consent") : null;
  if (consentFor !== null) {
    const order = /^ord_[a-f0-9]{24}$/.test(consentFor) ? await getStore().getOrder(consentFor) : null;
    if (!order) return render(request, g.user, { tone: "bad", text: "Unknown order." }, forcedView);
    if (!["pending", "cancelled", "failed"].includes(order.status)) return render(request, g.user, { tone: "bad", text: `This order is ${order.status}; checkout recovery doesn't apply.` }, forcedView);
    const missing = ([["email", order.emailConsentAt], ["whatsapp", order.whatsappConsentAt]] as const).filter(([, at]) => !at).map(([c]) => c);
    return render(request, g.user, null, forcedView, { title: "Record customer consent", body: consentPage(order, [...missing], g.user) });
  }
  return render(request, g.user, null, forcedView);
}

/** /admin itself: sign in (Basic auth challenge), then go to the dashboard. */
export async function adminHome(request: Request) {
  const g = await gate(request);
  if (g instanceof Response) return g;
  return new Response(null, { status: 307, headers: { ...NO_STORE, location: "/admin/orders" } });
}

export async function adminPost(request: Request, forcedView?: View) {
  const g = await gate(request);
  if (g instanceof Response) return g;
  if (!sameOrigin(request)) {
    console.warn(`[admin] POST blocked by same-origin check: ${blockedReason(request)}`);
    return new Response("Request blocked: this action must be sent from the admin page itself.", { status: 403, headers: NO_STORE });
  }
  const form = await request.formData().catch(() => null);
  if (forcedView === "recovery") {
    if (!form) return render(request, g.user, { tone: "bad", text: "The form could not be read." }, forcedView);
    try {
      const r = await recoveryAction(form, await getStore().listOrders(MAX_ROWS), recoveryNow(request), recoveryTestBudget(request), g.user);
      return "body" in r ? render(request, g.user, r.notice ?? null, forcedView, r) : render(request, g.user, r.notice, forcedView);
    } catch (e) {
      console.error(`[admin] recovery action failed: ${(e as Error).message}`);
      return render(request, g.user, { tone: "bad", text: `Action failed: ${(e as Error).message}` }, forcedView);
    }
  }
  const action = String(form?.get("action") ?? "");
  const confirmed = form?.get("confirm") === "yes";
  if (!confirmed) return render(request, g.user, { tone: "warn", text: "Nothing was done: please tick the confirmation box." }, forcedView);

  if (action === "retry") {
    const id = String(form?.get("id") ?? "");
    if (!/^ord_[a-f0-9]{24}$/.test(id)) return render(request, g.user, { tone: "bad", text: "Invalid order ID." }, forcedView);
    const r = await ensureDelivered(id).catch(() => "failed" as const);
    return render(request, g.user, { tone: r === "failed" ? "bad" : "ok", text: `Retry for ${id}: ${r}.` });
  }
  if (action === "test-email") {
    const to = ownerEmail();
    if (!to) return render(request, g.user, { tone: "bad", text: "OWNER_EMAIL is not configured." }, forcedView);
    if (!rateLimit("admin-test-email", 1, 10 * 60_000).ok) return render(request, g.user, { tone: "warn", text: "A test email was sent in the last 10 minutes. Please wait before sending another." }, forcedView);
    try {
      const { id } = await sendIntegrationTestEmail(to, `admin-test-${Math.floor(Date.now() / 600_000)}`);
      return render(request, g.user, { tone: "ok", text: `Test email accepted by the provider${id ? ` (ID ${id})` : ""}. Check the inbox; acceptance is not proof of delivery.` });
    } catch (e) {
      return render(request, g.user, { tone: "bad", text: `Test email failed: ${(e as Error).message}` });
    }
  }
  return render(request, g.user, { tone: "warn", text: "Unknown action." }, forcedView);
}
