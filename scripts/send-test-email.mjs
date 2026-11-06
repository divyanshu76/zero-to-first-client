#!/usr/bin/env node
// Sends ONE branded Resend integration test email to the configured test recipient (OWNER_EMAIL,
// which must also be listed in CHECKOUT_TEST_EMAILS). No order, receipt or ebook is involved.
// Refuses unless COMMERCE_EMAIL=resend and the EMAIL_FROM domain is verified in Resend.
// Usage: node scripts/send-test-email.mjs --confirm
// Prints no secrets; the recipient is masked.
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const env = (k) => process.env[k]?.trim() || null;
const mask = (e) => e.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
const stop = (msg) => {
  console.error(`STOPPED: ${msg}`);
  process.exit(1);
};

const key = env("RESEND_API_KEY");
const from = env("EMAIL_FROM");
const support = env("SUPPORT_EMAIL");
const to = env("OWNER_EMAIL");
const allow = (env("CHECKOUT_TEST_EMAILS") ?? "").toLowerCase().split(",").map((s) => s.trim());
if (env("COMMERCE_EMAIL") !== "resend") stop('COMMERCE_EMAIL is not "resend".');
if (!key || !from) stop("RESEND_API_KEY or EMAIL_FROM is missing.");
if (!to || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to)) stop("OWNER_EMAIL (test recipient) is missing or invalid.");
if (!allow.includes(to.toLowerCase())) stop("The recipient is not listed in CHECKOUT_TEST_EMAILS.");

const h = { authorization: `Bearer ${key}` };
const fromDomain = /@([^>\s]+)>?\s*$/.exec(from)?.[1]?.toLowerCase();
const domains = (await (await fetch("https://api.resend.com/domains", { headers: h })).json()).data ?? [];
const d = domains.find((x) => x.name.toLowerCase() === fromDomain);
if (d?.status !== "verified") stop(`Sender domain "${fromDomain}" is not verified in Resend.`);
console.log(`Checks OK: driver=resend, sender domain ${fromDomain} verified, recipient ${mask(to)} (test address), no order involved.`);
if (!process.argv.includes("--confirm")) stop("Add --confirm to send the single test email.");

// Logo (inline CID), from the embedded brand module.
const logoSrc = readFileSync("src/lib/commerce/brand-logo.ts", "utf8");
const logo = /base64: "([A-Za-z0-9+/=]+)"/.exec(logoSrc)?.[1] ?? null;

const subject = "CRAFT & CODE — Email Integration Test";
const sentAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
const text = [
  "CRAFT & CODE — Email Integration Test",
  "",
  "This is a TEST email. It is not a purchase confirmation, and no order or payment was made.",
  "",
  "It confirms that the CRAFT & CODE website can send email through Resend from the verified craftandcode.tech domain.",
  `Sent: ${sentAt} IST`,
  "",
  `Support: ${support ?? "contact@deadcode.space"}`,
  "",
  "CRAFT & CODE · ZERO TO FIRST CLIENT · 2026 Edition",
].join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1efe9;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111113">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e5ed">
<tr><td style="height:6px;background:#6d28d9;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 18px;border-bottom:1px solid #e8e5ed"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
${logo ? `<td style="padding-right:14px;vertical-align:middle"><img src="cid:craftcode-logo" width="56" height="56" alt="CRAFT &amp; CODE" style="display:block;border:0;border-radius:14px"></td>` : ""}
<td style="vertical-align:middle"><div style="font-size:17px;letter-spacing:.06em;font-weight:800">CRAFT <span style="color:#6d28d9">&amp;</span> CODE</div><div style="margin-top:4px;font-size:12px;color:#6b6872">ZERO TO FIRST CLIENT · 2026 Edition</div></td>
</tr></table></td></tr>
<tr><td style="padding:28px">
<div style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">TEST EMAIL · not a purchase</div>
<h1 style="margin:18px 0 0;font-size:20px">Email integration is working</h1>
<p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#3a3840">This message confirms that the CRAFT &amp; CODE website can send email through Resend from the verified <strong>craftandcode.tech</strong> domain.</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3a3840">This is a test only. It is <strong>not</strong> a purchase confirmation: no order, payment or receipt was created.</p>
<p style="margin:12px 0 0;font-size:13px;color:#6b6872">Sent ${sentAt} IST</p>
<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#3a3840">Support: <a href="mailto:${support ?? "contact@deadcode.space"}" style="color:#6d28d9;font-weight:600">${support ?? "contact@deadcode.space"}</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#faf9f6;border-top:1px solid #e8e5ed;font-size:11px;color:#6b6872">CRAFT &amp; CODE · Published by DEADCODE LABS · craftandcode.tech</td></tr>
</table></td></tr></table></body></html>`;

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  // Same key all day: re-running this script within 24 h cannot send a second copy.
  headers: { ...h, "content-type": "application/json", "idempotency-key": `ccd-integration-test-${new Date().toISOString().slice(0, 10)}` },
  body: JSON.stringify({
    from,
    to: [to],
    subject,
    text,
    html,
    ...(support ? { reply_to: support } : {}),
    ...(logo ? { attachments: [{ filename: "craft-and-code-logo.jpg", content: logo, content_id: "craftcode-logo" }] } : {}),
  }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) stop(`Resend returned HTTP ${res.status}: ${body.name ?? ""} ${body.message ?? ""}`.trim());
console.log(`Accepted by Resend (HTTP ${res.status}). Email ID: ${body.id}`);

// Delivery status: poll Resend's own record of the email.
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const s = await (await fetch(`https://api.resend.com/emails/${body.id}`, { headers: h })).json().catch(() => ({}));
  console.log(`Status check ${i + 1}: last_event=${s.last_event ?? "unknown"}`);
  if (["delivered", "bounced", "complained", "failed"].includes(s.last_event)) break;
}
