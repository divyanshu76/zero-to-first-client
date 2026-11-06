import "server-only";
import { PRODUCT, appOrigin, emailDriver, resendApiBase, resendConfig, supportEmail } from "./config";
import { BRAND_LOGO } from "./brand-logo";
import { formatIst, receiptNumber } from "./receipt";

/**
 * Transactional email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 * Called only from the server; RESEND_API_KEY never reaches the browser. No SDK dependency is needed.
 */
export type Attachment = { filename: string; content: Buffer; /** Inline image referenced as cid:<contentId>. */ contentId?: string };

/** The logo travels as an inline (CID) attachment: remote images are often blocked and data: URIs are stripped. */
const LOGO_CID = "craftcode-logo";
const logoAttachment = (): Attachment[] =>
  BRAND_LOGO ? [{ filename: `craft-and-code-logo.${BRAND_LOGO.mime === "image/png" ? "png" : "jpg"}`, content: Buffer.from(BRAND_LOGO.base64, "base64"), contentId: LOGO_CID }] : [];

export type DeliveryEmail = {
  to: string;
  name: string;
  locale: "en" | "hi";
  accessUrl: string;
  orderId: string;
  kind: "delivery" | "relink";
  /** Present for the purchase confirmation. */
  payment?: { paymentId: string | null; amount: number; currency: string; paidAt: string | null };
  /** True when the ebook PDF is attached; otherwise the email relies on the secure link. */
  ebookAttached?: boolean;
  attachments?: Attachment[];
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const copy = {
  en: {
    subject: () => "Your CRAFT & CODE purchase is confirmed — ZERO TO FIRST CLIENT",
    relinkSubject: (id: string) => `Your new download link: ${PRODUCT.shortName} (${id})`,
    hello: (n: string) => `Hi ${n},`,
    thanks: "Thank you for your purchase. Your payment has been verified and your copy is ready.",
    relink: "You asked for a fresh download link for your ebook. Here it is.",
    confirmed: "Purchase confirmed",
    product: "Product",
    productValue: "ZERO TO FIRST CLIENT — The AI-Powered Business Starter Kit (2026 Edition)",
    order: "Order ID",
    receipt: "Receipt number",
    payment: "Razorpay payment reference",
    amount: "Amount paid",
    date: "Payment date",
    howTitle: "Getting your ebook",
    howAttached: "The ebook PDF is attached to this email. Save it to your phone or computer.",
    howLink: "You can also download it any time with the button below. The link works for 30 days; each click creates a fresh secure download that is valid for 15 minutes.",
    howLinkOnly: "Download it with the button below. The link works for 30 days; each click creates a fresh secure download that is valid for 15 minutes.",
    receiptNote: "Your payment receipt (PDF) is attached.",
    cta: "Download your ebook",
    share: "Please keep this link private; it is tied to your order.",
    support: (s: string) => `Questions or problems with your files? Reply to this email or write to ${s}.`,
    supportNoEmail: "Questions or problems with your files? Use the contact page on craftandcode.tech.",
    closing: "Wishing you a great first client,",
    team: "The CRAFT & CODE team",
    footer: "CRAFT & CODE sells and DEADCODE LABS publishes ZERO TO FIRST CLIENT. You received this email because you bought the ebook.",
  },
  hi: {
    subject: () => "आपकी CRAFT & CODE ख़रीद confirm हो गई — ZERO TO FIRST CLIENT",
    relinkSubject: (id: string) => `आपका नया download link: ${PRODUCT.shortName} (${id})`,
    hello: (n: string) => `नमस्ते ${n},`,
    thanks: "ख़रीदने के लिए दिल से धन्यवाद। आपका payment verify हो गया है और आपकी copy तैयार है।",
    relink: "आपने अपनी ebook के लिए नया download link माँगा था। यह रहा।",
    confirmed: "ख़रीद confirm हुई",
    product: "Product",
    productValue: "ZERO TO FIRST CLIENT — The AI-Powered Business Starter Kit (2026 Edition)",
    order: "Order ID",
    receipt: "Receipt number",
    payment: "Razorpay payment reference",
    amount: "भुगतान की गई रकम",
    date: "Payment की तारीख़",
    howTitle: "अपनी ebook कैसे पाएँ",
    howAttached: "Ebook की PDF इस email के साथ attached है। इसे अपने phone या computer में save कर लें।",
    howLink: "नीचे दिए button से आप इसे कभी भी download कर सकते हैं। Link 30 दिन तक काम करता है; हर click पर 15 मिनट के लिए valid नया सुरक्षित download बनता है।",
    howLinkOnly: "नीचे दिए button से इसे download करें। Link 30 दिन तक काम करता है; हर click पर 15 मिनट के लिए valid नया सुरक्षित download बनता है।",
    receiptNote: "आपकी payment receipt (PDF) attached है।",
    cta: "अपनी ebook download करें",
    share: "यह link किसी के साथ share न करें; यह आपके order से जुड़ा है।",
    support: (s: string) => `Files से जुड़ा कोई सवाल या दिक्कत? इस email का जवाब दें या ${s} पर लिखें।`,
    supportNoEmail: "Files से जुड़ा कोई सवाल या दिक्कत? craftandcode.tech का contact page इस्तेमाल करें।",
    closing: "आपके पहले client के लिए शुभकामनाएँ,",
    team: "CRAFT & CODE team",
    footer: "ZERO TO FIRST CLIENT को CRAFT & CODE बेचता है और DEADCODE LABS प्रकाशित करता है। यह email आपको ebook ख़रीदने की वजह से मिला है।",
  },
};

export function renderEmail(e: DeliveryEmail) {
  const c = copy[e.locale];
  const support = supportEmail();
  const p = e.payment;
  const delivery = e.kind === "delivery";
  const subject = delivery ? c.subject() : c.relinkSubject(e.orderId);
  const details: [string, string][] = delivery && p
    ? [
        [c.product, c.productValue],
        [c.order, e.orderId],
        [c.receipt, receiptNumber({ id: e.orderId, paidAt: p.paidAt })],
        [c.payment, p.paymentId ?? "—"],
        [c.amount, `${rupees(p.amount)} ${p.currency}`],
        [c.date, formatIst(p.paidAt, e.locale)],
      ]
    : [[c.order, e.orderId]];
  const how = [delivery && e.ebookAttached ? c.howAttached : null, delivery && e.ebookAttached ? c.howLink : c.howLinkOnly, delivery && p ? c.receiptNote : null].filter(Boolean) as string[];
  const supportLine = support ? c.support(support) : c.supportNoEmail;

  const text = [
    c.hello(e.name),
    "",
    delivery ? c.thanks : c.relink,
    "",
    ...(delivery ? [`${c.confirmed}:`] : []),
    ...details.map(([k, v]) => `${k}: ${v}`),
    "",
    `${c.howTitle}:`,
    ...how,
    "",
    `${c.cta}: ${e.accessUrl}`,
    c.share,
    "",
    supportLine,
    "",
    c.closing,
    c.team,
    "",
    c.footer,
  ].join("\n");

  const font = e.locale === "hi" ? "'Noto Sans Devanagari','Mangal',Arial,sans-serif" : "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  const row = ([k, v]: [string, string]) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #e8e5ed;color:#6b6872;font-size:13px;vertical-align:top;width:42%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #e8e5ed;color:#111113;font-size:14px;font-weight:600;word-break:break-word">${esc(v)}</td></tr>`;
  const html = `<!doctype html>
<html lang="${e.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1efe9;font-family:${font};color:#111113;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">${esc(delivery ? c.thanks : c.relink)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e5ed">
<tr><td style="height:6px;background:#6d28d9;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 18px;border-bottom:1px solid #e8e5ed">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
${BRAND_LOGO ? `<td style="padding-right:14px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="56" height="56" alt="CRAFT &amp; CODE" style="display:block;border:0;border-radius:14px"></td>` : ""}
<td style="vertical-align:middle"><div style="font-size:17px;letter-spacing:.06em;font-weight:800;color:#111113">CRAFT <span style="color:#6d28d9">&amp;</span> CODE</div>
<div style="margin-top:4px;font-size:12px;color:#6b6872">ZERO TO FIRST CLIENT · 2026 Edition</div></td>
</tr></table>
</td></tr>
<tr><td style="padding:28px">
${delivery ? `<div style="display:inline-block;background:#dcfce7;color:#065f46;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">✓ ${esc(c.confirmed)}</div>` : ""}
<p style="margin:18px 0 0;font-size:16px;line-height:1.6">${esc(c.hello(e.name))}</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#3a3840">${esc(delivery ? c.thanks : c.relink)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e8e5ed">${details.map(row).join("")}</table>
<h2 style="margin:26px 0 8px;font-size:16px">${esc(c.howTitle)}</h2>
${how.map((h) => `<p style="margin:6px 0;font-size:14px;line-height:1.6;color:#3a3840">${esc(h)}</p>`).join("")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px"><tr><td style="background:#6d28d9;border-radius:999px"><a href="${esc(e.accessUrl)}" style="display:inline-block;padding:14px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px">${esc(c.cta)}</a></td></tr></table>
<p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#6b6872">${esc(c.share)}</p>
<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#3a3840">${support ? esc(c.support(support)).replace(esc(support), `<a href="mailto:${esc(support)}" style="color:#6d28d9;font-weight:600">${esc(support)}</a>`) : esc(c.supportNoEmail)}</p>
<p style="margin:22px 0 0;font-size:14px;line-height:1.6">${esc(c.closing)}<br><strong>${esc(c.team)}</strong></p>
</td></tr>
<tr><td style="padding:18px 28px;background:#faf9f6;border-top:1px solid #e8e5ed;font-size:11px;line-height:1.5;color:#6b6872">${esc(c.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Outbox (no provider configured): kept in memory for local development and tests. */
const g = globalThis as unknown as { __ztfcOutbox?: (Omit<DeliveryEmail, "attachments"> & { subject: string; at: string; attachmentNames: string[]; text?: string; html?: string })[] };
export const outbox = () => (g.__ztfcOutbox ??= []);

export type OwnerNotificationEmail = {
  to: string;
  orderId: string;
  razorpayPaymentId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  amount: number;
  currency: string;
  paymentStatus: string;
  paidAt: string | null;
  locale: "en" | "hi";
  customerEmailStatus: "sent" | "failed" | "pending";
  ebookDeliveryStatus: "attached" | "link_only" | "unavailable";
  receiptStatus: "generated" | "attached" | "failed";
};

export function renderOwnerNotification(n: OwnerNotificationEmail) {
  const subject = `New Purchase Received — CRAFT & CODE | ₹${Math.round(n.amount / 100)}`;
  const adminUrl = `${appOrigin()}/admin/orders`;
  const edition = "2026 Edition (Edition 1.0)";
  const langDisplay = n.locale === "hi" ? "Hindi (hi)" : "English (en)";
  const ebookDisplay =
    n.ebookDeliveryStatus === "attached"
      ? "Attached to customer email (PDF)"
      : n.ebookDeliveryStatus === "link_only"
        ? "Delivered via secure link (PDF unattached)"
        : "Unavailable";
  const receiptDisplay =
    n.receiptStatus === "attached"
      ? "Generated and attached to customer email (PDF)"
      : n.receiptStatus === "generated"
        ? "Generated (PDF)"
        : "Generation failed";
  const customerEmailDisplay =
    n.customerEmailStatus === "sent"
      ? "Delivered successfully"
      : n.customerEmailStatus === "failed"
        ? "Delivery failed (queued for retry)"
        : "Pending";

  const text = [
    "CRAFT & CODE — NEW PURCHASE NOTIFICATION",
    "=========================================",
    "A genuine customer payment has been verified.",
    "",
    "CUSTOMER DETAILS:",
    `Full Name: ${n.customerName}`,
    `Email: ${n.customerEmail}`,
    `Mobile Number: ${n.customerPhone ?? "Not provided"}`,
    `Customer Language: ${langDisplay}`,
    "",
    "ORDER & PAYMENT SUMMARY:",
    `Product: ${PRODUCT.name}`,
    `Product Edition: ${edition}`,
    `Order ID: ${n.orderId}`,
    `Razorpay Payment ID: ${n.razorpayPaymentId ?? "—"}`,
    `Amount Paid: ${rupees(n.amount)} (${n.currency})`,
    `Payment Status: ${n.paymentStatus}`,
    `Payment Date & Time (IST): ${formatIst(n.paidAt, "en")}`,
    "",
    "DELIVERY & FULFILLMENT STATUS:",
    `Customer Delivery Email: ${customerEmailDisplay}`,
    `Ebook Delivery: ${ebookDisplay}`,
    `Receipt Generation: ${receiptDisplay}`,
    "",
    `Admin Dashboard: ${adminUrl}`,
    "",
    "CRAFT & CODE Commerce Notification · Confidential",
  ].join("\n");

  const font = "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #e8e5ed;color:#6b6872;font-size:13px;vertical-align:top;width:42%">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e8e5ed;color:#111113;font-size:14px;font-weight:600;word-break:break-word">${esc(v)}</td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1efe9;font-family:${font};color:#111113;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">New purchase verified: ${esc(n.customerName)} (${rupees(n.amount)})</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e5ed">
<tr><td style="background:#6d28d9;padding:26px 28px 22px">
<div style="font-size:13px;letter-spacing:.16em;font-weight:800;color:#ffffff">CRAFT &amp; CODE</div>
<div style="margin-top:6px;font-size:12px;color:#ede9fe">NEW PURCHASE RECEIVED · OWNER NOTIFICATION</div>
</td></tr>
<tr><td style="padding:28px">
<div style="display:inline-block;background:#dcfce7;color:#065f46;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">✓ Verified Payment Received — ${esc(rupees(n.amount))}</div>
<h2 style="margin:20px 0 6px;font-size:15px;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em">Customer Information</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e5ed">
${row("Customer Full Name", n.customerName)}
${row("Customer Email", n.customerEmail)}
${row("Customer Mobile", n.customerPhone ?? "Not provided")}
${row("Customer Language", langDisplay)}
</table>

<h2 style="margin:22px 0 6px;font-size:15px;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em">Order &amp; Payment Summary</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e5ed">
${row("Product Name", PRODUCT.name)}
${row("Product Edition", edition)}
${row("Order ID", n.orderId)}
${row("Razorpay Payment ID", n.razorpayPaymentId ?? "—")}
${row("Amount Paid", `${rupees(n.amount)} (${n.currency})`)}
${row("Payment Status", n.paymentStatus)}
${row("Payment Date & Time (IST)", formatIst(n.paidAt, "en"))}
</table>

<h2 style="margin:22px 0 6px;font-size:15px;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em">Delivery &amp; Fulfillment Status</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e5ed">
${row("Customer Delivery Email", customerEmailDisplay)}
${row("Ebook Delivery", ebookDisplay)}
${row("Receipt Generation", receiptDisplay)}
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr><td style="background:#6d28d9;border-radius:999px"><a href="${esc(adminUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">View Order in Admin Dashboard</a></td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px;background:#faf9f6;border-top:1px solid #e8e5ed;font-size:11px;line-height:1.5;color:#6b6872">CRAFT &amp; CODE Commerce Notification · Confidential · Generated automatically upon verified payment.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

export async function sendOwnerNotification(n: OwnerNotificationEmail, idempotencyKey: string) {
  const { subject, text, html } = renderOwnerNotification(n);
  if (emailDriver() === "outbox") {
    if (process.env.VERCEL) throw new Error("No email provider configured");
    outbox().push({
      to: n.to,
      name: "Owner",
      locale: "en",
      accessUrl: "",
      orderId: n.orderId,
      kind: "delivery",
      subject,
      text,
      html,
      at: new Date().toISOString(),
      attachmentNames: [],
    });
    return;
  }
  const cfg = resendConfig();
  if (!cfg) throw new Error("Email provider is not configured");
  const res = await fetch(`${resendApiBase()}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.key}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({
      from: cfg.from,
      to: [n.to],
      subject,
      text,
      html,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch((err: Error) => {
    throw new Error(`Owner email request failed (${err.name})`);
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
}

/**
 * Sends one email. `idempotencyKey` makes provider-side retries safe: the same key never
 * produces two emails. Throws on failure so the caller can record and retry.
 */
export async function sendEmail(e: DeliveryEmail, idempotencyKey: string) {
  const { subject, text, html } = renderEmail(e);
  if (emailDriver() === "outbox") {
    if (process.env.VERCEL) throw new Error("No email provider configured");
    const { attachments, ...rest } = e;
    outbox().push({ ...rest, subject, at: new Date().toISOString(), attachmentNames: (attachments ?? []).map((a) => a.filename) });
    return;
  }
  const cfg = resendConfig();
  if (!cfg) throw new Error("Email provider is not configured");
  const support = supportEmail();
  const res = await fetch(`${resendApiBase()}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.key}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({
      from: cfg.from,
      to: [e.to],
      subject,
      text,
      html,
      ...(support ? { reply_to: support } : {}),
      attachments: [...(e.attachments ?? []), ...logoAttachment()].map((a) => ({ filename: a.filename, content: a.content.toString("base64"), ...(a.contentId ? { content_id: a.contentId } : {}) })),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch((err: Error) => {
    throw new Error(`Email request failed (${err.name})`);
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
}

/**
 * A clearly labelled integration test email (no order, receipt or ebook). Admin-only; the caller
 * restricts the recipient to OWNER_EMAIL and rate-limits it.
 */
export function renderIntegrationTest(sentAtIso: string) {
  const support = supportEmail() ?? "contact@deadcode.space";
  const sentAt = formatIst(sentAtIso, "en");
  const subject = "CRAFT & CODE — Email Integration Test";
  const text = [
    "CRAFT & CODE — Email Integration Test",
    "",
    "This is a TEST email. It is not a purchase confirmation, and no order or payment was made.",
    "It confirms that the CRAFT & CODE website can send email through Resend from the verified sender domain.",
    `Sent: ${sentAt}`,
    "",
    `Support: ${support}`,
    "",
    "CRAFT & CODE · ZERO TO FIRST CLIENT · 2026 Edition",
  ].join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1efe9;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111113">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e5ed">
<tr><td style="height:6px;background:#6d28d9;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 18px;border-bottom:1px solid #e8e5ed"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
${BRAND_LOGO ? `<td style="padding-right:14px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="56" height="56" alt="CRAFT &amp; CODE" style="display:block;border:0;border-radius:14px"></td>` : ""}
<td style="vertical-align:middle"><div style="font-size:17px;letter-spacing:.06em;font-weight:800">CRAFT <span style="color:#6d28d9">&amp;</span> CODE</div><div style="margin-top:4px;font-size:12px;color:#6b6872">ZERO TO FIRST CLIENT · 2026 Edition</div></td>
</tr></table></td></tr>
<tr><td style="padding:28px">
<div style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">TEST EMAIL · not a purchase</div>
<h1 style="margin:18px 0 0;font-size:20px">Email integration is working</h1>
<p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#3a3840">This message confirms that the CRAFT &amp; CODE website can send email through Resend from the verified sender domain.</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3a3840">This is a test only. It is <strong>not</strong> a purchase confirmation: no order, payment or receipt was created.</p>
<p style="margin:12px 0 0;font-size:13px;color:#6b6872">Sent ${esc(sentAt)}</p>
<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#3a3840">Support: <a href="mailto:${esc(support)}" style="color:#6d28d9;font-weight:600">${esc(support)}</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#faf9f6;border-top:1px solid #e8e5ed;font-size:11px;color:#6b6872">CRAFT &amp; CODE · Published by DEADCODE LABS · craftandcode.tech</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function sendIntegrationTestEmail(to: string, idempotencyKey: string): Promise<{ id: string | null }> {
  const { subject, text, html } = renderIntegrationTest(new Date().toISOString());
  if (emailDriver() === "outbox") {
    if (process.env.VERCEL) throw new Error("No email provider configured");
    outbox().push({ to, name: "Owner", locale: "en", accessUrl: "", orderId: "integration-test", kind: "relink", subject, text, html, at: new Date().toISOString(), attachmentNames: [] });
    return { id: null };
  }
  const cfg = resendConfig();
  if (!cfg) throw new Error("Email provider is not configured");
  const support = supportEmail();
  const res = await fetch(`${resendApiBase()}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.key}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({
      from: cfg.from, to: [to], subject, text, html,
      ...(support ? { reply_to: support } : {}),
      attachments: logoAttachment().map((a) => ({ filename: a.filename, content: a.content.toString("base64"), content_id: a.contentId })),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch((err: Error) => {
    throw new Error(`Email request failed (${err.name})`);
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
  return { id: ((await res.json().catch(() => ({}))) as { id?: string }).id ?? null };
}

/** Admin-only: is the EMAIL_FROM domain verified in Resend? Returns status names only, never keys. */
export async function resendSenderStatus(): Promise<{ configured: boolean; domain: string | null; status: string | null; error?: string }> {
  const cfg = resendConfig();
  const domain = /@([^>\s]+)>?\s*$/.exec(cfg?.from ?? "")?.[1]?.toLowerCase() ?? null;
  if (!cfg) return { configured: false, domain, status: null };
  try {
    const res = await fetch(`${resendApiBase()}/domains`, { headers: { authorization: `Bearer ${cfg.key}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { configured: true, domain, status: null, error: `Resend returned ${res.status}` };
    const { data } = (await res.json()) as { data?: { name: string; status: string }[] };
    return { configured: true, domain, status: data?.find((d) => d.name.toLowerCase() === domain)?.status ?? "not added" };
  } catch (e) {
    return { configured: true, domain, status: null, error: `request failed (${(e as Error).name})` };
  }
}
