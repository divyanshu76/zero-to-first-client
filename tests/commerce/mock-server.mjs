// Local stand-in for the Razorpay and Resend HTTP APIs, used only by the Playwright suite.
// The app reaches it through RAZORPAY_API_BASE / RESEND_API_BASE. No real keys are involved.
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const PORT = Number(process.env.MOCK_PORT ?? 3399);
const fixture = path.resolve("tests/.fixtures/sample-ebook.pdf");
mkdirSync(path.dirname(fixture), { recursive: true });
writeFileSync(fixture, "%PDF-1.4\n% ZTFC test fixture, not the ebook\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

const state = { orders: new Map(), payments: new Map(), emails: [], failEmails: new Map(), idem: new Set() };
const send = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const read = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b ? JSON.parse(b) : {})); });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const body = req.method === "POST" ? await read(req) : {};
  // ── control endpoints for tests ──
  if (url.pathname === "/__health") return send(res, 200, { ok: true });
  if (url.pathname === "/__control/payment") { state.payments.set(body.id, body); return send(res, 200, body); }
  // Fail the next `count` emails to one recipient (per-recipient, so parallel tests don't interfere).
  if (url.pathname === "/__control/email-fail") { state.failEmails.set(body.to, body.count); return send(res, 200, {}); }
  if (url.pathname === "/__control/emails") return send(res, 200, state.emails.filter((e) => !e.failed && (!url.searchParams.get("to") || e.to.includes(url.searchParams.get("to")))));
  if (url.pathname === "/__control/orders") return send(res, 200, [...state.orders.values()]);
  // ── Razorpay ──
  if (url.pathname.startsWith("/v1/")) {
    if (!req.headers.authorization?.startsWith("Basic ")) return send(res, 401, { error: { description: "auth" } });
    if (req.method === "POST" && url.pathname === "/v1/orders") {
      const o = { id: `order_${randomBytes(7).toString("hex")}`, entity: "order", amount: body.amount, currency: body.currency, receipt: body.receipt, status: "created", notes: body.notes };
      state.orders.set(o.id, { ...o, requested: body });
      return send(res, 200, o);
    }
    const m = /^\/v1\/payments\/(pay_\w+)$/.exec(url.pathname);
    if (m) return state.payments.has(m[1]) ? send(res, 200, state.payments.get(m[1])) : send(res, 400, { error: { description: "not found" } });
    return send(res, 404, {});
  }
  // ── Resend ──
  if (req.method === "POST" && url.pathname === "/emails") {
    const to = body.to?.[0];
    const left = state.failEmails.get(to) ?? 0;
    if (left > 0) { state.failEmails.set(to, left - 1); state.emails.push({ to: body.to, failed: true }); return send(res, 500, { message: "mock failure" }); }
    const key = req.headers["idempotency-key"];
    if (key && state.idem.has(key)) return send(res, 200, { id: "dup" });
    if (key) state.idem.add(key);
    const attachments = (body.attachments ?? []).map((a) => {
      const buf = Buffer.from(a.content, "base64");
      return { filename: a.filename, size: buf.length, contentId: a.content_id ?? null, text: buf.length < 200_000 ? buf.toString("latin1") : null };
    });
    state.emails.push({ to: body.to, subject: body.subject, text: body.text, html: body.html, replyTo: body.reply_to, key, attachments });
    return send(res, 200, { id: `em_${state.emails.length}` });
  }
  send(res, 404, {});
}).listen(PORT, "127.0.0.1", () => console.log(`mock razorpay/resend on ${PORT}`));
