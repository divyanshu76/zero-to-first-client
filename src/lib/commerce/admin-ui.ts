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

export type View = "overview" | "orders" | "customers" | "payments" | "ebook" | "email";
const NAV: [View, string, string][] = [
  ["overview", "Overview", "M3 12h7V3H3zm11 9h7v-9h-7zM3 21h7v-6H3zm11-12h7V3h-7z"],
  ["orders", "Orders", "M4 6h16M4 12h16M4 18h10"],
  ["customers", "Customers", "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8"],
  ["payments", "Payments", "M2 7h20v12H2zM2 11h20M6 15h4"],
  ["ebook", "Ebook", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"],
  ["email", "Email", "M4 4h16v16H4zM4 6l8 7 8-7"],
];
const icon = (d: string, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

const STATUS_TONE: Record<string, string> = { paid: "ok", sent: "ok", processing: "warn", pending: "muted", sending: "warn", failed: "bad", cancelled: "muted", refunded: "bad", skipped: "muted" };
export const isTestOrder = (o: Pick<Order, "productId">) => o.productId.endsWith(":test");
export const testTag = (o: Pick<Order, "productId">) => (isTestOrder(o) ? ' <span class="b warn" title="Razorpay Test Mode order: no real money">TEST</span>' : "");
export const badge = (s: string) => `<span class="b ${STATUS_TONE[s] ?? "muted"}">${esc(s)}</span>`;

const CSS = `
:root{--bg:#faf9f6;--card:#fff;--ink:#0b0b0f;--ink2:#64616b;--line:#e9e6ee;--v:#6d28d9;--v2:#7c3aed;--vs:#f3efff;--ok:#047857;--oks:#dcfce7;--warn:#92400e;--warns:#fef3c7;--bad:#b91c1c;--bads:#fee2e2}
*{box-sizing:border-box}html,body{margin:0}body{font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
a{color:inherit}.app{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh}
.side{position:sticky;top:0;height:100vh;padding:20px 14px;border-right:1px solid var(--line);background:#fff;display:flex;flex-direction:column;gap:18px}
.brand{display:flex;align-items:center;gap:10px;padding:4px 8px;text-decoration:none}.brand img{width:36px;height:36px;border-radius:10px}.brand b{font-weight:800;letter-spacing:.04em}.brand small{display:block;color:var(--ink2);font-size:11px;letter-spacing:0}
.nav{display:flex;flex-direction:column;gap:2px}.nav a{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;text-decoration:none;color:var(--ink2);font-weight:500}.nav a:hover{background:var(--bg);color:var(--ink)}.nav a[aria-current=page]{background:var(--vs);color:var(--v);font-weight:600}
.i{width:18px;height:18px;flex:none}.mode{margin-top:auto;padding:10px;border-radius:12px;background:var(--bg);font-size:12px;color:var(--ink2)}.mode b{color:var(--ink)}
.main{min-width:0}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 28px;border-bottom:1px solid var(--line);background:rgba(250,249,246,.9);position:sticky;top:0;z-index:2;backdrop-filter:blur(8px)}
.top h1{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}.who{display:flex;align-items:center;gap:10px}.chip{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:13px}.dot{width:8px;height:8px;border-radius:50%;background:var(--ok)}
.btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-weight:600;text-decoration:none;cursor:pointer}.btn:hover{border-color:#d8d3e2}.btn.p{background:var(--v);border-color:var(--v);color:#fff}.btn.p:hover{background:#5b21b6}.btn:focus-visible,.nav a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--v2);outline-offset:2px}
.wrap{padding:24px 28px 48px;display:grid;gap:20px}.grid{display:grid;gap:14px;grid-template-columns:repeat(4,minmax(0,1fr))}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.stat .k{color:var(--ink2);font-size:12px;font-weight:500}.stat .v{margin-top:6px;font-size:26px;font-weight:700;letter-spacing:-.02em}.stat .s{margin-top:2px;color:var(--ink2);font-size:12px}
h2{margin:0 0 12px;font-size:15px;font-weight:700}.sub{color:var(--ink2);font-size:13px;margin:-6px 0 14px}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:#fff}table{width:100%;border-collapse:collapse;font-size:13px}th{position:sticky;top:0;text-align:left;font-weight:600;color:var(--ink2);background:#fcfbf9;font-size:12px;padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap}td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}tbody tr:hover{background:#fcfbff}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.m{color:var(--ink2)}.nw{white-space:nowrap}.r{text-align:right}
.b{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600;background:#f1f0f3;color:var(--ink2)}.b.ok{background:var(--oks);color:var(--ok)}.b.warn{background:var(--warns);color:var(--warn)}.b.bad{background:var(--bads);color:var(--bad)}
form.f{display:flex;flex-wrap:wrap;gap:10px;align-items:end}label.l{display:grid;gap:4px;font-size:12px;font-weight:600;color:var(--ink2)}input,select{height:36px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:#fff;font:inherit;color:var(--ink);min-width:0}input[type=search]{width:260px}
.pg{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;color:var(--ink2);font-size:13px}.empty{padding:28px;text-align:center;color:var(--ink2)}
.kv{display:grid;grid-template-columns:180px minmax(0,1fr);gap:8px 16px;margin:0}.kv dt{color:var(--ink2)}.kv dd{margin:0;word-break:break-word}
.cols{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}.note{padding:12px 14px;border-radius:12px;font-size:13px}.note.ok{background:var(--oks);color:var(--ok)}.note.bad{background:var(--bads);color:var(--bad)}.note.warn{background:var(--warns);color:var(--warn)}.note.info{background:var(--vs);color:#4c1d95}
.check{display:flex;gap:8px;align-items:center;font-size:13px}.check input{height:auto}
@media (max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cols{grid-template-columns:1fr}}
@media (max-width:760px){.app{grid-template-columns:minmax(0,1fr)}.grid{gap:10px}.stat .v{font-size:22px}.side{position:static;height:auto;padding:12px;gap:10px;border-right:0;border-bottom:1px solid var(--line)}.nav{flex-direction:row;overflow-x:auto}.nav a{white-space:nowrap}.mode{display:none}.top{padding:12px 16px;position:static}.wrap{padding:16px}.kv{grid-template-columns:1fr}input[type=search]{width:100%}form.f>*{flex:1 1 140px}}
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
