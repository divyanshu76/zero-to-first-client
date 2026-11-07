import "server-only";
import { BRAND_LOGO } from "./brand-logo";
import type { Order } from "./store";

/**
 * Server-rendered admin dashboard markup. No JavaScript: every view, filter, sort and page is a
 * plain GET, and every action is a confirmed POST, so the page runs under a script-free CSP.
 * All numbers come from the order store; nothing is invented.
 */

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const istDate = (s: string) => new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
export const ist = (s: string | null) => (s ? `${new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}` : "—");

export type View = "overview" | "orders" | "customers" | "payments" | "ebook" | "email" | "recovery";
const NAV: [View, string, string][] = [
  ["overview", "Overview", "M3 12h7V3H3zm11 9h7v-9h-7zM3 21h7v-6H3zm11-12h7V3h-7z"],
  ["orders", "Orders", "M4 6h16M4 12h16M4 18h10"],
  ["customers", "Customers", "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8"],
  ["payments", "Payments", "M2 7h20v12H2zM2 11h20M6 15h4"],
  ["ebook", "Ebook", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"],
  ["email", "Email", "M4 4h16v16H4zM4 6l8 7 8-7"],
  ["recovery", "Checkout Recovery", "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2"],
];
const icon = (d: string, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

const STATUS_TONE: Record<string, string> = { paid: "ok", sent: "ok", processing: "warn", pending: "muted", sending: "warn", failed: "bad", cancelled: "muted", refunded: "bad", skipped: "muted", eligible: "ok", recovered: "ok", opened: "ok", waiting: "warn", purchased: "muted", ineligible: "muted", running: "warn", error: "bad" };
export const isTestOrder = (o: Pick<Order, "productId">) => o.productId.endsWith(":test");
export const testTag = (o: Pick<Order, "productId">) => (isTestOrder(o) ? ' <span class="b warn" title="Razorpay Test Mode order: no real money">TEST</span>' : "");
export const badge = (s: string) => `<span class="b ${STATUS_TONE[s] ?? "muted"}">${esc(s)}</span>`;

const CSS = `
:root{--bg:#f7f6fb;--card:#fff;--ink:#0b0b0f;--ink2:#5f5b68;--line:#e7e3ef;--v:#6d28d9;--v2:#7c3aed;--vs:#f3efff;--ok:#047857;--oks:#dcfce7;--warn:#92400e;--warns:#fef3c7;--bad:#b91c1c;--bads:#fee2e2;--shadow:0 1px 2px rgba(17,12,34,.04),0 4px 16px -8px rgba(17,12,34,.08)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;text-size-adjust:100%}html,body{margin:0}
body{font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;overflow-wrap:anywhere}
a{color:inherit}
/* Layout: mobile first. One column; sidebar becomes a top bar with a scrollable nav. */
.app{display:grid;grid-template-columns:minmax(0,1fr);min-height:100vh}
.side{display:flex;flex-direction:column;gap:10px;padding:12px 16px;background:#fff;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0}.brand img{width:36px;height:36px;border-radius:10px;flex:none}.brand b{font-weight:800;letter-spacing:.04em}.brand small{display:block;color:var(--ink2);font-size:12px;letter-spacing:0}
.nav{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;margin:0 -16px;padding:2px 16px 4px}
.nav a{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:12px;text-decoration:none;color:var(--ink2);font-weight:500;white-space:nowrap;flex:none;border:1px solid var(--line);background:#fff}
.nav a:hover{background:var(--bg);color:var(--ink)}.nav a[aria-current=page]{background:var(--vs);border-color:#ddd6fe;color:var(--v);font-weight:600}
.i{width:18px;height:18px;flex:none}.mode{display:none;padding:12px;border-radius:12px;background:var(--bg);font-size:13px;color:var(--ink2)}.mode b{color:var(--ink)}
.main{min-width:0}
.top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 12px;padding:12px 16px;border-bottom:1px solid var(--line);background:rgba(247,246,251,.94)}
.top h1{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em;min-width:0}.who{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:14px}.dot{width:8px;height:8px;border-radius:50%;background:var(--ok)}
.wrap{width:100%;max-width:1440px;margin:0 auto;padding:16px;display:grid;gap:16px}
/* Cards and stats */
.grid{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:var(--shadow);min-width:0}
.stat .k{color:var(--ink2);font-size:14px;font-weight:500}.stat .v{margin-top:4px;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.2}.stat .s{margin-top:2px;color:var(--ink2);font-size:13px}
h2{margin:0 0 12px;font-size:17px;font-weight:700}.sub{color:var(--ink2);font-size:14px;margin:-6px 0 14px}
.cols{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
/* Controls: tap-friendly on phones */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;white-space:nowrap}
.btn:hover{border-color:#d4cde2}.btn:disabled{opacity:.5;cursor:not-allowed}.btn.p{background:var(--v);border-color:var(--v);color:#fff}.btn.p:hover{background:#5b21b6}
.btn:focus-visible,.nav a:focus-visible,input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid var(--v2);outline-offset:2px}
form.f,p.f{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;margin:0}form.f>*,p.f>*{flex:1 1 100%}
label.l{display:grid;gap:6px;font-size:13px;font-weight:600;color:var(--ink2)}
input,select{min-height:44px;width:100%;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:#fff;font:inherit;font-size:16px;color:var(--ink);min-width:0}
input[type=checkbox]{width:20px;height:20px;min-height:0;flex:none;accent-color:var(--v)}
.check{display:flex;gap:10px;align-items:center;font-size:14px;min-height:44px}
/* Tables: scroll inside their own box, never the page */
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:14px;background:#fff;max-width:100%}
table{width:100%;border-collapse:collapse;font-size:14px}
th{position:sticky;top:0;text-align:left;font-weight:600;color:var(--ink2);background:#fbfaff;font-size:13px;padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:12px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:normal}tr:last-child td{border-bottom:0}tbody tr:hover{background:#fcfbff}
td .btn{min-height:40px;font-size:14px;padding:0 12px}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}.m{color:var(--ink2)}.nw{white-space:nowrap}.r{text-align:right}
.b{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#f1f0f3;color:var(--ink2);white-space:nowrap}.b.ok{background:var(--oks);color:var(--ok)}.b.warn{background:var(--warns);color:var(--warn)}.b.bad{background:var(--bads);color:var(--bad)}.b.muted{background:#f1f0f3;color:var(--ink2)}
.pg{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;color:var(--ink2);font-size:14px}.empty{padding:28px;text-align:center;color:var(--ink2)}
.kv{display:grid;grid-template-columns:minmax(0,1fr);gap:2px 16px;margin:0}.kv dt{color:var(--ink2);font-size:13px;margin-top:8px}.kv dd{margin:0;word-break:break-word}
.note{padding:12px 14px;border-radius:12px;font-size:14px;margin:0}.note.ok{background:var(--oks);color:var(--ok)}.note.bad{background:var(--bads);color:var(--bad)}.note.warn{background:var(--warns);color:var(--warn)}.note.info{background:var(--vs);color:#4c1d95}
pre{max-width:100%;overflow-x:auto}
/* Small tablets: two-up cards, inline filters */
@media (min-width:600px){
  .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  form.f>*,p.f>*{flex:0 1 auto}form.f>label.l{flex:1 1 180px}form.f input[type=search]{min-width:240px}
  .kv{grid-template-columns:180px minmax(0,1fr);gap:8px 16px}.kv dt{margin-top:0}
  .wrap{padding:20px}
}
/* Laptops: sidebar layout, four-up cards, slightly denser controls */
@media (min-width:1024px){
  body{font-size:14.5px}
  .app{grid-template-columns:248px minmax(0,1fr)}
  .side{position:sticky;top:0;height:100vh;padding:20px 14px;gap:18px;border-bottom:0;border-right:1px solid var(--line)}
  .nav{flex-direction:column;overflow:visible;margin:0;padding:0;gap:2px}
  .nav a{min-height:40px;border:0;background:transparent}
  .mode{display:block;margin-top:auto}
  .top{position:sticky;top:0;z-index:2;padding:14px 28px;backdrop-filter:blur(8px)}
  .wrap{padding:24px 28px 48px;gap:20px}
  .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .card{padding:18px}
  .btn{min-height:38px;font-size:14px}td .btn{min-height:34px;font-size:13px}
  input,select{min-height:38px;font-size:14px}.check{min-height:0}
  .cols{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (min-width:1600px){.wrap{padding:28px 40px 56px}}
`;

export function layout(opts: { view: View; title: string; user: string; status: { checkout: string; mode: string; store: string; storage: string; email: string }; body: string; notice?: { tone: "ok" | "bad" | "warn" | "info"; text: string } | null }) {
  const logo = BRAND_LOGO ? `<img src="data:${BRAND_LOGO.mime};base64,${BRAND_LOGO.base64}" alt="">` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(opts.title)} · CRAFT & CODE Admin</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"><style>${CSS}</style></head>
<body><div class="app">
<aside class="side"><a class="brand" href="/admin/orders">${logo}<span><b>CRAFT &amp; CODE</b><small>Admin · Zero to First Client</small></span></a>
<nav class="nav" aria-label="Admin">${NAV.map(([v, label, d]) => `<a href="${v === "overview" ? "/admin/orders" : v === "orders" ? "/admin/orders?view=orders" : `/admin/${v}`}"${v === opts.view ? ' aria-current="page"' : ""}>${icon(d)}${label}</a>`).join("")}</nav>
<div class="mode">Checkout <b>${esc(opts.status.checkout)}</b><br>Mode <b>${esc(opts.status.mode)}</b><br>Store <b>${esc(opts.status.store)}</b> · Files <b>${esc(opts.status.storage)}</b><br>Email <b>${esc(opts.status.email)}</b></div></aside>
<div class="main"><header class="top"><h1>${esc(opts.title)}</h1><div class="who"><span class="chip"><span class="dot"></span>${esc(opts.user)}</span><a class="btn" href="/admin/logout">Log out</a></div></header>
<main class="wrap">${opts.notice ? `<p class="note ${opts.notice.tone}" role="status">${esc(opts.notice.text)}</p>` : ""}${opts.body}</main></div></div></body></html>`;
}

export const stat = (k: string, v: string, s = "") => `<div class="card stat"><div class="k">${esc(k)}</div><div class="v">${v}</div>${s ? `<div class="s">${esc(s)}</div>` : ""}</div>`;

export function ordersTable(rows: Order[], opts: { compact?: boolean } = {}) {
  if (!rows.length) return `<div class="tw"><div class="empty">No orders match.</div></div>`;
  return `<div class="tw"><table><thead><tr><th>Order</th><th>Customer</th>${opts.compact ? "" : "<th>Phone</th>"}<th class="r">Amount</th><th>Payment</th><th>Date (IST)</th><th>Downloads</th><th>Email</th></tr></thead><tbody>${rows
    .map(
      (o) => `<tr><td><a href="/admin/orders?view=orders&amp;id=${esc(o.id)}"><code>${esc(o.id)}</code></a>${testTag(o)}</td>
<td>${esc(o.customerName)}<br><span class="m">${esc(o.customerEmail)}</span></td>${opts.compact ? "" : `<td class="nw">${esc(o.customerPhone ?? "—")}</td>`}
<td class="r nw">${inr(o.amount)}</td><td>${badge(o.status)}</td><td class="nw">${ist(o.createdAt)}</td>
<td>${o.downloadCount ? `${o.downloadCount}×` : '<span class="m">Not downloaded</span>'}</td><td>${badge(o.emailStatus)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
