import { createHash } from "node:crypto";
import { connection } from "next/server";
import { NO_STORE } from "@/lib/commerce/http";
import { clientIp, rateLimit } from "@/lib/commerce/rate-limit";
import { unsubscribeByToken } from "@/lib/commerce/recovery";

/**
 * Unsubscribe from checkout reminders.
 *  GET  (#t=<token> in the fragment) → confirmation page. The link in the email keeps the token in
 *       the URL fragment, which browsers never send, so it never appears in request logs; a tiny
 *       script (allowed by its exact hash, nothing else) moves it into the form body.
 *  GET  ?t=<token> → the same page with the token already in the form (some mail apps open the
 *       List-Unsubscribe URL in a browser). A GET never unsubscribes: link scanners mustn't.
 *  POST → unsubscribes, with the token from the form body, or from ?t= for RFC 8058 one-click
 *       (Gmail/Outlook post "List-Unsubscribe=One-Click" from their servers, hence no same-origin
 *       check: the random token is the only credential). Once used, a token can only repeat the
 *       same unsubscribe, so its presence in a one-click request log is harmless.
 */
const copy = {
  en: {
    title: "Checkout reminders",
    ask: "Stop all checkout reminders from CRAFT & CODE to this address (email and WhatsApp)?",
    button: "Unsubscribe",
    done: "You're unsubscribed. You won't get any more checkout reminders by email or WhatsApp. Emails about a purchase you make (receipt and download link) are not affected.",
    invalid: "This unsubscribe link isn't valid or has expired. To stop reminders, reply to any reminder email or write to us and we'll do it for you.",
    busy: "Too many requests. Please try again in a few minutes.",
    back: "Back to craftandcode.tech",
  },
  hi: {
    title: "Checkout reminders",
    ask: "क्या इस address के लिए CRAFT & CODE के सभी checkout reminders (email और WhatsApp) बंद कर दें?",
    button: "Unsubscribe करें",
    done: "आप unsubscribe हो गए हैं। अब आपको email या WhatsApp पर checkout reminders नहीं आएँगे। आपकी किसी ख़रीद के emails (receipt और download link) पर इसका असर नहीं पड़ता।",
    invalid: "यह unsubscribe link मान्य नहीं है या expire हो गया है। Reminders बंद करवाने के लिए किसी भी reminder email का जवाब दें या हमें लिखें, हम कर देंगे।",
    busy: "बहुत ज़्यादा requests। कृपया कुछ मिनट बाद फिर कोशिश करें।",
    back: "craftandcode.tech पर वापस जाएँ",
  },
};

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
/** Reads #t=…, puts it in the form, removes it from the address bar, and shows the form (or the invalid note). */
const SCRIPT = `(function(){var m=/^#t=([A-Za-z0-9_-]{43})$/.exec(location.hash);if(m){document.getElementById("t").value=m[1];history.replaceState(null,"",location.pathname+location.search);document.getElementById("f").hidden=false}else{document.getElementById("x").hidden=false}})();`;
const SCRIPT_HASH = createHash("sha256").update(SCRIPT).digest("base64");

const HEADERS = {
  ...NO_STORE,
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": `default-src 'none'; script-src 'sha256-${SCRIPT_HASH}'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(locale: "en" | "hi", body: string, status = 200) {
  const c = copy[locale];
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(c.title)} · CRAFT & CODE</title>
<style>body{margin:0;background:#f1efe9;font:16px/1.6 -apple-system,"Segoe UI",Roboto,"Noto Sans Devanagari",Arial,sans-serif;color:#111113}main{max-width:480px;margin:48px auto;padding:0 16px}.c{background:#fff;border:1px solid #e8e5ed;border-radius:20px;padding:28px}h1{margin:0 0 12px;font-size:20px}b{color:#6d28d9}button{height:44px;padding:0 22px;border:0;border-radius:999px;background:#6d28d9;color:#fff;font:inherit;font-weight:700;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #7c3aed;outline-offset:3px}a{color:#6d28d9}[hidden]{display:none}</style></head>
<body><main><div class="c"><p style="margin:0 0 6px;font-weight:800;letter-spacing:.06em">CRAFT <b>&amp;</b> CODE</p><h1>${esc(c.title)}</h1>${body}<p style="margin:20px 0 0;font-size:14px"><a href="https://craftandcode.tech${locale === "hi" ? "/hi" : ""}">${esc(c.back)}</a></p></div></main></body></html>`;
  return new Response(html, { status, headers: HEADERS });
}

const params = (request: Request) => {
  const u = new URL(request.url);
  return { queryToken: u.searchParams.get("t") ?? "", locale: (u.searchParams.get("l") === "hi" ? "hi" : "en") as "en" | "hi" };
};
/** The form posts the token in its body; the action URL never carries it. */
const formAction = (locale: "en" | "hi") => `/api/recovery/unsubscribe${locale === "hi" ? "?l=hi" : ""}`;

export async function GET(request: Request) {
  await connection();
  const { queryToken, locale } = params(request);
  const c = copy[locale];
  const form = (token: string, hidden: boolean) =>
    `<form id="f" method="post" action="${esc(formAction(locale))}"${hidden ? " hidden" : ""}><p>${esc(c.ask)}</p><input type="hidden" id="t" name="t" value="${esc(token)}"><button type="submit">${esc(c.button)}</button></form>`;
  if (queryToken) return TOKEN_RE.test(queryToken) ? page(locale, form(queryToken, false)) : page(locale, `<p>${esc(c.invalid)}</p>`, 400);
  // Token in the fragment: the page fills the form from it. Without JavaScript, explain how else to stop.
  return page(locale, `${form("", true)}<p id="x" hidden>${esc(c.invalid)}</p><noscript><p>${esc(c.invalid)}</p></noscript><script>${SCRIPT}</script>`);
}

export async function POST(request: Request) {
  const { queryToken, locale } = params(request);
  const c = copy[locale];
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const bodyToken = form?.get("t");
  const token = typeof bodyToken === "string" && bodyToken ? bodyToken : queryToken;
  if (!rateLimit(`unsub:${clientIp(request)}`, 20, 10 * 60_000).ok) return oneClick ? new Response("rate limited", { status: 429, headers: NO_STORE }) : page(locale, `<p>${esc(c.busy)}</p>`, 429);
  let ok = false;
  try {
    ok = (await unsubscribeByToken(token)).ok;
  } catch (e) {
    console.error(`[recovery] unsubscribe failed: ${(e as Error).message}`);
    return oneClick ? new Response("temporarily unavailable", { status: 503, headers: NO_STORE }) : page(locale, `<p>${esc(c.busy)}</p>`, 503);
  }
  if (oneClick) return new Response(ok ? "unsubscribed" : "invalid link", { status: ok ? 200 : 400, headers: NO_STORE });
  return page(locale, `<p>${esc(ok ? c.done : c.invalid)}</p>`, ok ? 200 : 400);
}
