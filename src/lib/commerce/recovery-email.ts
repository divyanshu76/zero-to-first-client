import "server-only";
import { PRODUCT, emailDriver, resendApiBase, resendConfig, supportEmail } from "./config";
import { BRAND_LOGO } from "./brand-logo";
import { LOGO_CID, logoAttachment, outbox } from "./email";
import { pricing } from "@/data/product";

/**
 * Checkout reminder (opt-in only). Deliberately non-promotional: it names the unfinished checkout,
 * states verified product facts and the price, and offers a way to continue or unsubscribe.
 * No discount, no urgency, no earnings claims.
 */
export type ReminderEmail = {
  to: string;
  name: string;
  locale: "en" | "hi";
  orderId: string;
  continueUrl: string;
  /** Link in the email body (token in the URL fragment). */
  unsubscribeUrl: string;
  /** List-Unsubscribe header target for RFC 8058 one-click POSTs (token in the query). */
  oneClickUrl: string;
  /** Which of the (at most) 2 reminders for this checkout this is, automatic or manual. */
  sequence: 1 | 2 | null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/**
 * The greeting uses the first name only when it looks like a name: letters in any script (with
 * their combining marks, e.g. Devanagari), optionally joined by an apostrophe or hyphen (no dots), at
 * most 30 characters. Anything else ("evil.com", "Win₹500", digits, symbols) falls back to a plain
 * "Hi," — the checkout form is unverified, so its text must not be able to put a link-like or
 * promotional phrase into a CRAFT & CODE email.
 */
const NAME_RE = /^\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*$/u;
export const firstName = (name: string) => {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.length <= 30 && NAME_RE.test(first) ? first : "";
};

const copy = {
  en: {
    subject: "Still interested in Zero to First Client? 🚀",
    hello: (n: string) => (n ? `Hi ${n},` : "Hi,"),
    intro: "You recently started checkout for this ebook on craftandcode.tech, but it wasn't completed, so you haven't been charged for it.",
    tagline: "Learn AI. Build Your Service. Find Your First Paying Client.",
    description: "A practical starter kit for using AI tools to choose a service, set it up and win your first paying client. Hindi explanations with English business terms; prompts and message scripts in English or Roman Hinglish.",
    facts: ["142-page PDF", "10 chapters", "141 AI prompts", "20 templates", "7 calculator sheets", "24 diagrams"],
    price: "Price",
    priceValue: "₹599 (one-time payment, digital download after the payment is verified)",
    cta: "Continue checkout",
    ctaNote: "The button opens craftandcode.tech with your details filled in. You'll review everything and pay securely through Razorpay.",
    ignore: "If you've already bought it or changed your mind, just ignore this email.",
    sequence: (n: number) => `This is reminder ${n} of 2. You won't get more after that.`,
    manual: "This is a one-off reminder.",
    support: (s: string) => `Questions? Reply to this email or write to ${s}.`,
    supportNoEmail: "Questions? Use the contact page on craftandcode.tech.",
    team: "The CRAFT & CODE team",
    why: "You're receiving this because you chose to get reminders about this checkout when you started it on craftandcode.tech.",
    unsubscribe: "Unsubscribe from checkout reminders",
  },
  hi: {
    subject: "क्या आप अब भी Zero to First Client में interested हैं? 🚀",
    hello: (n: string) => (n ? `नमस्ते ${n},` : "नमस्ते,"),
    intro: "आपने हाल ही में craftandcode.tech पर इस ebook का checkout शुरू किया था, पर वह पूरा नहीं हुआ, इसलिए आपसे इसके लिए कोई पैसा नहीं लिया गया।",
    tagline: "Learn AI. Build Your Service. Find Your First Paying Client.",
    description: "AI tools की मदद से service चुनने, उसे set up करने और अपना पहला paying client पाने की practical starter kit। Hindi explanations, English business terms के साथ; prompts और message scripts English या Roman Hinglish में।",
    facts: ["142 पेज की PDF", "10 chapters", "141 AI prompts", "20 templates", "7 calculator sheets", "24 diagrams"],
    price: "कीमत",
    priceValue: "₹599 (एक बार का payment, payment verify होने के बाद digital download)",
    cta: "Checkout जारी रखें",
    ctaNote: "यह button craftandcode.tech खोलेगा और आपकी details पहले से भरी होंगी। आप सब कुछ देखकर Razorpay से सुरक्षित payment करेंगे।",
    ignore: "अगर आप इसे ख़रीद चुके हैं या आपका मन बदल गया है, तो इस email को नज़रअंदाज़ कर दें।",
    sequence: (n: number) => `यह 2 में से reminder ${n} है। इसके बाद और reminders नहीं आएँगे।`,
    manual: "यह एक बार का reminder है।",
    support: (s: string) => `कोई सवाल? इस email का जवाब दें या ${s} पर लिखें।`,
    supportNoEmail: "कोई सवाल? craftandcode.tech का contact page इस्तेमाल करें।",
    team: "CRAFT & CODE team",
    why: "यह email आपको इसलिए मिला क्योंकि craftandcode.tech पर checkout शुरू करते समय आपने इस checkout के reminders पाना चुना था।",
    unsubscribe: "Checkout reminders से unsubscribe करें",
  },
};

/* ── Reminder 2 of 2: a fuller, more polished email (reminder 1 is unchanged) ── */

/** Show the launch price against the regular price only while the site itself says so. */
const launchOffer = () => {
  const inr = pricing.INR;
  return inr.amount === PRODUCT.amount / 100 && inr.compareAt && inr.compareAt > inr.amount ? { now: inr.amount, was: inr.compareAt } : null;
};

const second = {
  en: {
    subject: "Your copy of Zero to First Client is ready when you are",
    preheader: "Your checkout details are saved. Pick up where you left off.",
    badge: "Your checkout is saved",
    title: "Pick up where you left off",
    hello: (n: string) => (n ? `Hi ${n},` : "Hi,"),
    intro: "You recently started checkout for ZERO TO FIRST CLIENT but didn't finish, so you haven't been charged. Your details are saved: the button below takes you back with them filled in, and you only need to review and pay.",
    insideTitle: "What's inside",
    stats: [["142", "page PDF"], ["10", "chapters"], ["141", "AI prompts"], ["20", "templates"], ["7", "calculator sheets"], ["24", "diagrams"]] as [string, string][],
    missingTitle: "What you'd be missing",
    missing: [
      "A step-by-step path from choosing a service to winning your first paying client",
      "Ready-to-use AI prompts and message scripts in English or Roman Hinglish",
      "Templates and calculator sheets you can put to work straight away",
      "Clear Hindi explanations with the English business terms you'll actually use",
    ],
    priceLabel: "Launch price",
    regular: (n: number) => `regular ₹${n}`,
    priceNote: "One-time payment. Instant download after your payment is verified.",
    cta: "Complete Your Purchase",
    secure: "Secure payment by Razorpay. We never see your card or UPI details.",
    ignore: "If you've already bought it or changed your mind, just ignore this email. This is reminder 2 of 2: you won't get more about this checkout.",
    support: (s: string) => `Questions? Reply to this email or write to ${s}.`,
    supportNoEmail: "Questions? Use the contact page on craftandcode.tech.",
    team: "The CRAFT & CODE team",
    why: "You're receiving this because you chose to get reminders about this checkout when you started it on craftandcode.tech.",
    unsubscribe: "Unsubscribe from checkout reminders",
  },
  hi: {
    subject: "Zero to First Client की आपकी copy आपका इंतज़ार कर रही है",
    preheader: "आपकी checkout details saved हैं। जहाँ छोड़ा था, वहीं से आगे बढ़ें।",
    badge: "आपका checkout saved है",
    title: "जहाँ छोड़ा था, वहीं से आगे बढ़ें",
    hello: (n: string) => (n ? `नमस्ते ${n},` : "नमस्ते,"),
    intro: "आपने हाल ही में ZERO TO FIRST CLIENT का checkout शुरू किया था, पर पूरा नहीं हुआ, इसलिए आपसे कोई पैसा नहीं लिया गया। आपकी details saved हैं: नीचे का button आपको भरी हुई details के साथ वापस ले जाएगा, आपको बस जाँचकर pay करना है।",
    insideTitle: "अंदर क्या है",
    stats: [["142", "पेज की PDF"], ["10", "chapters"], ["141", "AI prompts"], ["20", "templates"], ["7", "calculator sheets"], ["24", "diagrams"]] as [string, string][],
    missingTitle: "आप क्या miss करेंगे",
    missing: [
      "Service चुनने से लेकर पहला paying client पाने तक का step-by-step रास्ता",
      "English या Roman Hinglish में तैयार AI prompts और message scripts",
      "Templates और calculator sheets, जिन्हें आप तुरंत इस्तेमाल कर सकते हैं",
      "आसान Hindi explanations, उन English business terms के साथ जो आप सच में इस्तेमाल करेंगे",
    ],
    priceLabel: "Launch price",
    regular: (n: number) => `regular ₹${n}`,
    priceNote: "एक बार का payment। Payment verify होते ही तुरंत download।",
    cta: "अपनी ख़रीद पूरी करें",
    secure: "Razorpay से सुरक्षित payment। हम आपके card या UPI details न देखते हैं, न रखते हैं।",
    ignore: "अगर आप इसे ख़रीद चुके हैं या आपका मन बदल गया है, तो इस email को नज़रअंदाज़ कर दें। यह 2 में से reminder 2 है: इस checkout के बारे में और emails नहीं आएँगे।",
    support: (s: string) => `कोई सवाल? इस email का जवाब दें या ${s} पर लिखें।`,
    supportNoEmail: "कोई सवाल? craftandcode.tech का contact page इस्तेमाल करें।",
    team: "CRAFT & CODE team",
    why: "यह email आपको इसलिए मिला क्योंकि craftandcode.tech पर checkout शुरू करते समय आपने इस checkout के reminders पाना चुना था।",
    unsubscribe: "Checkout reminders से unsubscribe करें",
  },
};

export function renderSecondReminder(e: ReminderEmail) {
  const c = second[e.locale];
  const support = supportEmail();
  const name = firstName(e.name);
  const offer = launchOffer();
  const font = e.locale === "hi" ? "'Noto Sans Devanagari','Mangal',Arial,sans-serif" : "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  const priceText = offer ? `${c.priceLabel}: ₹${offer.now} (${c.regular(offer.was)})` : `₹${PRODUCT.amount / 100}`;
  const text = [
    c.hello(name), "", c.intro, "",
    `${c.insideTitle}:`, ...c.stats.map(([n, l]) => `• ${n} ${l}`), "",
    `${c.missingTitle}:`, ...c.missing.map((m) => `• ${m}`), "",
    priceText, c.priceNote, "",
    `${c.cta}: ${e.continueUrl}`, c.secure, "",
    c.ignore, "",
    support ? c.support(support) : c.supportNoEmail, c.team, "craftandcode.tech", "",
    c.why, `${c.unsubscribe}: ${e.unsubscribeUrl}`,
  ].join("\n");

  const statCell = ([n, l]: [string, string]) =>
    `<td width="33%" style="padding:6px"><div style="background:#ffffff;border:1px solid #e8e5ed;border-radius:14px;padding:14px 8px;text-align:center"><div style="font-size:24px;line-height:1.1;font-weight:800;color:#6d28d9">${esc(n)}</div><div style="margin-top:4px;font-size:12px;line-height:1.3;color:#3a3840">${esc(l)}</div></div></td>`;
  const button = `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto 8px"><tr><td style="background:#6d28d9;border-radius:999px;box-shadow:0 8px 20px -10px rgba(109,40,217,.7)"><a href="${esc(e.continueUrl)}" style="display:inline-block;padding:15px 26px;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;letter-spacing:.01em;white-space:nowrap">${esc(c.cta)} →</a></td></tr></table>`;
  const html = `<!doctype html>
<html lang="${e.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f1efe9;font-family:${font};color:#111113;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e8e5ed">
<tr><td style="padding:22px 28px;background:#0f0b1a"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
${BRAND_LOGO ? `<td style="padding-right:14px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="48" height="48" alt="CRAFT &amp; CODE" style="display:block;border:0;border-radius:12px"></td>` : ""}
<td style="vertical-align:middle"><div style="font-size:16px;letter-spacing:.08em;font-weight:800;color:#ffffff">CRAFT <span style="color:#a78bfa">&amp;</span> CODE</div><div style="margin-top:3px;font-size:12px;color:#c4b5fd">ZERO TO FIRST CLIENT · 2026 Edition</div></td>
</tr></table></td></tr>
<tr><td style="padding:30px 28px 8px">
<div style="display:inline-block;background:#ede7fb;color:#5b21b6;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px">✓ ${esc(c.badge)}</div>
<h1 style="margin:16px 0 0;font-size:26px;line-height:1.25;font-weight:800;color:#111113">${esc(c.title)}</h1>
<p style="margin:16px 0 0;font-size:16px;line-height:1.6">${esc(c.hello(name))}</p>
<p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#3a3840">${esc(c.intro)}</p>
${button}
</td></tr>
<tr><td style="padding:18px 22px 6px"><div style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6b6872;padding:0 6px 6px">${esc(c.insideTitle)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;border-radius:18px;padding:6px">
<tr>${c.stats.slice(0, 3).map(statCell).join("")}</tr><tr>${c.stats.slice(3).map(statCell).join("")}</tr></table></td></tr>
<tr><td style="padding:20px 28px 4px"><div style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6b6872">${esc(c.missingTitle)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px">${c.missing.map((m) => `<tr><td width="26" style="vertical-align:top;padding:6px 0;color:#6d28d9;font-weight:800">✓</td><td style="padding:6px 0;font-size:14px;line-height:1.6;color:#111113">${esc(m)}</td></tr>`).join("")}</table></td></tr>
<tr><td style="padding:20px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ddd6fe;border-radius:18px;background:#f5f3ff"><tr><td style="padding:18px 20px">
<div style="font-size:15px;font-weight:800;color:#111113">${esc(PRODUCT.name)}</div>
<div style="margin-top:10px">${offer ? `<span style="font-size:13px;color:#5b21b6;font-weight:700">${esc(c.priceLabel)}</span> <span style="font-size:28px;font-weight:800;color:#111113">₹${offer.now}</span> <span style="font-size:15px;color:#6b6872;text-decoration:line-through">₹${offer.was}</span>` : `<span style="font-size:28px;font-weight:800;color:#111113">₹${PRODUCT.amount / 100}</span>`}</div>
<div style="margin-top:6px;font-size:13px;line-height:1.5;color:#3a3840">${esc(c.priceNote)}</div>
${button}
<div style="text-align:center;font-size:12px;line-height:1.5;color:#6b6872">🔒 ${esc(c.secure)}</div>
</td></tr></table></td></tr>
<tr><td style="padding:4px 28px 26px">
<p style="margin:0;font-size:13px;line-height:1.6;color:#6b6872">${esc(c.ignore)}</p>
<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#3a3840">${support ? esc(c.support(support)).replace(esc(support), `<a href="mailto:${esc(support)}" style="color:#6d28d9;font-weight:600">${esc(support)}</a>`) : esc(c.supportNoEmail)}</p>
<p style="margin:16px 0 0;font-size:14px;line-height:1.6"><strong>${esc(c.team)}</strong><br><a href="https://craftandcode.tech" style="color:#6d28d9">craftandcode.tech</a></p>
</td></tr>
<tr><td style="padding:18px 28px;background:#faf9f6;border-top:1px solid #e8e5ed;font-size:11px;line-height:1.6;color:#6b6872">${esc(c.why)}<br><a href="${esc(e.unsubscribeUrl)}" style="color:#6b6872;text-decoration:underline">${esc(c.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: c.subject, text, html };
}

export function renderReminderEmail(e: ReminderEmail) {
  if (e.sequence === 2) return renderSecondReminder(e); // reminder 1 (below) is unchanged
  const c = copy[e.locale];
  const support = supportEmail();
  const name = firstName(e.name);
  const seqLine = e.sequence ? c.sequence(e.sequence) : c.manual;
  const supportLine = support ? c.support(support) : c.supportNoEmail;
  const text = [
    c.hello(name),
    "",
    c.intro,
    "",
    PRODUCT.name,
    c.tagline,
    c.description,
    "",
    ...c.facts.map((f) => `• ${f}`),
    "",
    `${c.price}: ${c.priceValue}`,
    "",
    `${c.cta}: ${e.continueUrl}`,
    c.ctaNote,
    "",
    c.ignore,
    seqLine,
    "",
    supportLine,
    c.team,
    "craftandcode.tech",
    "",
    c.why,
    `${c.unsubscribe}: ${e.unsubscribeUrl}`,
  ].join("\n");

  const font = e.locale === "hi" ? "'Noto Sans Devanagari','Mangal',Arial,sans-serif" : "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  const html = `<!doctype html>
<html lang="${e.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f1efe9;font-family:${font};color:#111113;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">${esc(c.intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e5ed">
<tr><td style="height:6px;background:#6d28d9;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 18px;border-bottom:1px solid #e8e5ed"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
${BRAND_LOGO ? `<td style="padding-right:14px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="56" height="56" alt="CRAFT &amp; CODE" style="display:block;border:0;border-radius:14px"></td>` : ""}
<td style="vertical-align:middle"><div style="font-size:17px;letter-spacing:.06em;font-weight:800;color:#111113">CRAFT <span style="color:#6d28d9">&amp;</span> CODE</div><div style="margin-top:4px;font-size:12px;color:#6b6872">ZERO TO FIRST CLIENT · 2026 Edition</div></td>
</tr></table></td></tr>
<tr><td style="padding:28px">
<p style="margin:0;font-size:16px;line-height:1.6">${esc(c.hello(name))}</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#3a3840">${esc(c.intro)}</p>
<div style="margin:22px 0 0;padding:18px;border:1px solid #e8e5ed;border-radius:16px;background:#faf9f6">
<div style="font-size:15px;font-weight:800;line-height:1.4">${esc(PRODUCT.name)}</div>
<div style="margin-top:6px;font-size:13px;font-weight:600;color:#6d28d9">${esc(c.tagline)}</div>
<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#3a3840">${esc(c.description)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${[0, 2, 4]
    .map((i) => `<tr><td style="padding:4px 0;font-size:13px;color:#111113;width:50%">✓ ${esc(c.facts[i])}</td><td style="padding:4px 0;font-size:13px;color:#111113">✓ ${esc(c.facts[i + 1])}</td></tr>`)
    .join("")}</table>
<p style="margin:12px 0 0;font-size:14px;line-height:1.5"><strong>${esc(c.price)}:</strong> ${esc(c.priceValue)}</p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:#6d28d9;border-radius:999px"><a href="${esc(e.continueUrl)}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px">${esc(c.cta)}</a></td></tr></table>
<p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#6b6872">${esc(c.ctaNote)}</p>
<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#3a3840">${esc(c.ignore)} ${esc(seqLine)}</p>
<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#3a3840">${support ? esc(c.support(support)).replace(esc(support), `<a href="mailto:${esc(support)}" style="color:#6d28d9;font-weight:600">${esc(support)}</a>`) : esc(c.supportNoEmail)}</p>
<p style="margin:18px 0 0;font-size:14px;line-height:1.6"><strong>${esc(c.team)}</strong><br><a href="https://craftandcode.tech" style="color:#6d28d9">craftandcode.tech</a></p>
</td></tr>
<tr><td style="padding:18px 28px;background:#faf9f6;border-top:1px solid #e8e5ed;font-size:11px;line-height:1.6;color:#6b6872">${esc(c.why)}<br><a href="${esc(e.unsubscribeUrl)}" style="color:#6b6872;text-decoration:underline">${esc(c.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: c.subject, text, html };
}

/**
 * Sends one reminder. The idempotency key is per order + stage (+ day for manual sends), so a
 * provider-side retry never produces a second email. Returns Resend's message id when available.
 */
export async function sendReminderEmail(e: ReminderEmail, idempotencyKey: string): Promise<{ id: string | null }> {
  const { subject, text, html } = renderReminderEmail(e);
  if (emailDriver() === "outbox") {
    if (process.env.VERCEL) throw new Error("No email provider configured");
    outbox().push({ to: e.to, name: e.name, locale: e.locale, accessUrl: e.continueUrl, orderId: e.orderId, kind: "recovery", subject, text, html, at: new Date().toISOString(), attachmentNames: [] });
    return { id: null };
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
      // RFC 8058 one-click unsubscribe (Gmail/Outlook "Unsubscribe" button). The URL's token is the only credential.
      headers: { "List-Unsubscribe": `<${e.oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [{ name: "category", value: "checkout_reminder" }],
      attachments: logoAttachment().map((a) => ({ filename: a.filename, content: a.content.toString("base64"), content_id: a.contentId })),
    }),
    cache: "no-store",
    // Shorter than the delivery email's 30 s, so a scheduler run stays inside its time limit.
    signal: AbortSignal.timeout(15_000),
  }).catch((err: Error) => {
    throw new Error(`Email request failed (${err.name})`);
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
  return { id: ((await res.json().catch(() => ({}))) as { id?: string }).id ?? null };
}

/** Plain operational alert to OWNER_EMAIL (used by the daily watchdog). Contains no customer data. */
export async function sendOwnerAlert(to: string, subject: string, lines: string[], idempotencyKey: string) {
  const text = [...lines, "", "See docs/CHECKOUT_RECOVERY.md → Recovery procedure.", "", "CRAFT & CODE · automated check"].join("\n");
  if (emailDriver() === "outbox") {
    if (process.env.VERCEL) throw new Error("No email provider configured");
    outbox().push({ to, name: "Owner", locale: "en", accessUrl: "", orderId: "watchdog", kind: "recovery", subject, text, at: new Date().toISOString(), attachmentNames: [] });
    return;
  }
  const cfg = resendConfig();
  if (!cfg) throw new Error("Email provider is not configured");
  const res = await fetch(`${resendApiBase()}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.key}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, text }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch((err: Error) => {
    throw new Error(`Alert request failed (${err.name})`);
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
}
