import { createHmac, randomBytes } from "node:crypto";
import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";
import { ADMIN, COMMERCE_URL, MOCK, TEST_KEY_SECRET, TEST_STORAGE_SECRET, TEST_WEBHOOK_SECRET } from "./commerce/env";

/**
 * Razorpay Test Mode integration, end to end against a local server whose Razorpay and
 * Resend APIs are mocked (tests/commerce/mock-server.mjs). Signatures are real HMACs made
 * with throwaway test secrets, so the server's verification code runs unmodified.
 */
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, "commerce tests need the local mock servers");

const rid = () => randomBytes(6).toString("hex");
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");
const checkoutSig = (orderId: string, paymentId: string) => hmac(TEST_KEY_SECRET, `${orderId}|${paymentId}`);
const newEmail = (tag: string) => `${tag}-${rid()}@buyers.test`;
/** Format-valid number used only against the local mock; it never reaches Razorpay. */
const MOBILE = "9000000001";

let api: APIRequestContext;
let mock: APIRequestContext;
test.beforeEach(async () => {
  // A distinct client IP per test keeps the per-IP rate limits independent.
  api = await pwRequest.newContext({ baseURL: COMMERCE_URL, extraHTTPHeaders: { "x-forwarded-for": `10.${[1, 2, 3].map(() => Math.floor(Math.random() * 250)).join(".")}` } });
  mock = await pwRequest.newContext({ baseURL: MOCK });
});
test.afterEach(async () => {
  await api.dispose();
  await mock.dispose();
});

async function createOrder(email: string, extra: Record<string, unknown> = {}) {
  const res = await api.post("/api/checkout/create-order", { data: { name: "Test Buyer", email, phone: MOBILE, locale: "en", ...extra } });
  return { res, body: (await res.json()) as { orderId: string; razorpayOrderId: string; amount: number; currency: string; error?: string } };
}
async function setPayment(orderId: string, status: string, amount = 59900, currency = "INR") {
  const id = `pay_${rid()}${rid()}`;
  await mock.post("/__control/payment", { data: { id, entity: "payment", order_id: orderId, amount, currency, status } });
  return id;
}
const verify = (orderId: string, paymentId: string, signature = checkoutSig(orderId, paymentId)) =>
  api.post("/api/checkout/verify", { data: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } });

function webhook(event: string, payment: Record<string, unknown>, opts: { eventId?: string; secret?: string; signature?: string } = {}) {
  const body = JSON.stringify({ entity: "event", event, payload: { payment: { entity: payment } }, created_at: Math.floor(Date.now() / 1000) });
  return api.post("/api/webhooks/razorpay", {
    headers: { "content-type": "application/json", "x-razorpay-event-id": opts.eventId ?? `evt_${rid()}`, "x-razorpay-signature": opts.signature ?? hmac(opts.secret ?? TEST_WEBHOOK_SECRET, body) },
    data: body,
  });
}
const paymentEntity = (id: string, orderId: string, status: string, amount = 59900) => ({ id, entity: "payment", order_id: orderId, amount, currency: "INR", status });

type Mail = { subject: string; text: string; html: string; replyTo?: string; key: string; attachments: { filename: string; size: number; contentId: string | null; text: string | null }[] };
async function emailsTo(email: string) {
  return (await (await mock.get(`/__control/emails?to=${encodeURIComponent(email)}`)).json()) as Mail[];
}
const tokenFrom = (text: string) => /#t=([A-Za-z0-9_-]{43})/.exec(text)?.[1] ?? null;
const status = async (token: string) => (await api.post("/api/purchase/status", { data: { token } })).json();

test.describe("orders", () => {
  test("1. creates an order for a valid buyer", async () => {
    const { res, body } = await createOrder(newEmail("create"));
    expect(res.status()).toBe(201);
    expect(body.orderId).toMatch(/^ord_[a-f0-9]{24}$/);
    expect(body.razorpayOrderId).toMatch(/^order_/);
  });

  test("2. the price is fixed on the server at ₹599 (59900 paise, INR)", async () => {
    const { body } = await createOrder(newEmail("price"));
    expect(body).toMatchObject({ amount: 59900, currency: "INR" });
    const orders = (await (await mock.get("/__control/orders")).json()) as { id: string; requested: { amount: number; currency: string } }[];
    expect(orders.find((o) => o.id === body.razorpayOrderId)?.requested).toMatchObject({ amount: 59900, currency: "INR" });
  });

  test("3. an amount, currency or product sent by the browser is ignored, and a wrong-amount payment is refused", async () => {
    const { body } = await createOrder(newEmail("amount"), { amount: 100, currency: "USD", product: "other" });
    expect(body).toMatchObject({ amount: 59900, currency: "INR" });
    const orders = (await (await mock.get("/__control/orders")).json()) as { id: string; requested: { amount: number } }[];
    expect(orders.find((o) => o.id === body.razorpayOrderId)?.requested.amount).toBe(59900);
    // A captured payment of ₹1 against this order must not unlock anything.
    const pay = await setPayment(body.razorpayOrderId, "captured", 100);
    const res = await verify(body.razorpayOrderId, pay);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("payment_mismatch");
    const wh = await webhook("order.paid", paymentEntity(pay, body.razorpayOrderId, "captured", 100));
    expect((await wh.json()).result).toBe("ignored:mismatch");
  });

  test("rejects invalid name, email and malformed bodies", async () => {
    expect((await api.post("/api/checkout/create-order", { data: { name: "A", email: newEmail("x") } })).status()).toBe(422);
    expect((await api.post("/api/checkout/create-order", { data: { name: "Valid Name", email: "not-an-email" } })).status()).toBe(422);
    expect((await api.post("/api/checkout/create-order", { headers: { "content-type": "application/json" }, data: "{bad" })).status()).toBe(400);
    for (const phone of [undefined, "", "12345", "5000000001", "90000000011", "+1 9000000001", "abcdefghij"]) {
      const res = await api.post("/api/checkout/create-order", { data: { name: "Valid Name", email: newEmail("ph"), phone } });
      expect(res.status(), String(phone)).toBe(422);
      expect((await res.json()).error).toBe("invalid_phone");
    }
  });

  test("accepts Indian mobile numbers in common formats and normalises them to +91", async () => {
    for (const phone of ["9000000001", "+91 90000 00001", "0 90000-00001", "(+91) 9000000001", "919000000001"]) {
      const res = await api.post("/api/checkout/create-order", { data: { name: "Valid Name", email: newEmail("ph"), phone } });
      expect(res.status(), phone).toBe(201);
      expect((await res.json()).contact).toBe("+919000000001");
    }
  });

  test("Test Mode checkout is restricted to allow-listed test emails", async () => {
    const { res, body } = await createOrder(`someone-${rid()}@gmail.com`);
    expect(res.status()).toBe(403);
    expect(body.error).toBe("checkout_restricted");
  });

  test("rate-limits repeated order creation from one client", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await createOrder(newEmail(`rl${i}`))).res.status());
    expect(codes.slice(0, 10).every((c) => c === 201)).toBe(true);
    expect(codes.at(-1)).toBe(429);
  });

  test("blocks cross-site requests", async () => {
    const res = await api.post("/api/checkout/create-order", { headers: { origin: "https://evil.example" }, data: { name: "Test Buyer", email: newEmail("csrf"), phone: MOBILE } });
    expect(res.status()).toBe(403);
  });
});

test.describe("payment verification", () => {
  test("4. a valid signature with a captured payment marks the order paid and delivers once", async () => {
    const email = newEmail("valid");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const res = await verify(body.razorpayOrderId, pay);
    expect(res.status()).toBe(200);
    const v = await res.json();
    expect(v).toMatchObject({ status: "paid", orderId: body.orderId });
    expect(v.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect.poll(async () => (await emailsTo(email)).length).toBe(1);
    const [mail] = await emailsTo(email);
    expect(mail.text).not.toMatch(/supabase|storage\/v1|\/api\/download\/file/i); // the backup link goes to the access page, never a file URL
    expect(tokenFrom(mail.text)).toBeTruthy();
  });

  test("5. an invalid signature is rejected and the order stays unpaid", async () => {
    const { body } = await createOrder(newEmail("badsig"));
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const forged = createHmac("sha256", "wrong-secret").update(`${body.razorpayOrderId}|${pay}`).digest("hex");
    for (const sig of [forged, "0".repeat(64), "not-hex", checkoutSig(body.razorpayOrderId, pay).slice(0, 63)]) {
      const res = await verify(body.razorpayOrderId, pay, sig);
      expect(res.status()).toBe(400);
      expect(["invalid_signature", "invalid_request"]).toContain((await res.json()).error);
    }
    // A signature for a different payment id doesn't transfer.
    const other = await setPayment(body.razorpayOrderId, "captured");
    expect((await verify(body.razorpayOrderId, other, checkoutSig(body.razorpayOrderId, pay))).status()).toBe(400);
  });
});

test.describe("webhooks", () => {
  test("6. a valid order.paid webhook marks the order paid and sends the delivery email", async () => {
    const email = newEmail("wh");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const res = await webhook("order.paid", paymentEntity(pay, body.razorpayOrderId, "captured"));
    expect(res.status()).toBe(200);
    expect((await res.json()).result).toBe("paid:sent");
    const mails = await emailsTo(email);
    expect(mails).toHaveLength(1);
    expect((await status(tokenFrom(mails[0].text)!)).status).toBe("paid");
  });

  test("7. a webhook with an invalid or missing signature is rejected", async () => {
    const { body } = await createOrder(newEmail("whbad"));
    const entity = paymentEntity(`pay_${rid()}`, body.razorpayOrderId, "captured");
    expect((await webhook("order.paid", entity, { secret: "wrong" })).status()).toBe(401);
    expect((await webhook("order.paid", entity, { signature: "" })).status()).toBe(401);
    expect((await api.post("/api/webhooks/razorpay", { data: { event: "order.paid" } })).status()).toBe(401);
  });

  test("8. a duplicate webhook is acknowledged but processed only once", async () => {
    const email = newEmail("dup");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const eventId = `evt_${rid()}`;
    const entity = paymentEntity(pay, body.razorpayOrderId, "captured");
    const first = await webhook("order.paid", entity, { eventId });
    const again = await webhook("order.paid", entity, { eventId });
    expect((await first.json()).result).toBe("paid:sent");
    expect(await again.json()).toMatchObject({ received: true, duplicate: true });
    // A different event for the same payment (e.g. payment.captured) doesn't send a second email either.
    expect((await (await webhook("payment.captured", entity)).json()).result).toBe("paid:skipped");
    expect(await emailsTo(email)).toHaveLength(1);
  });

  test("a delayed webhook after the browser verified changes nothing", async () => {
    const email = newEmail("late");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    await verify(body.razorpayOrderId, pay);
    await expect.poll(async () => (await emailsTo(email)).length).toBe(1);
    expect((await (await webhook("order.paid", paymentEntity(pay, body.razorpayOrderId, "captured"))).json()).result).toBe("paid:skipped");
    expect(await emailsTo(email)).toHaveLength(1);
  });

  test("a pending payment is reconciled with Razorpay when the webhook is late", async () => {
    const email = newEmail("recon");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "authorized");
    const v = await (await verify(body.razorpayOrderId, pay)).json();
    expect(v.status).toBe("processing");
    expect((await status(v.token)).status).toBe("processing");
    // Razorpay now reports the payment captured, but no webhook has arrived.
    await mock.post("/__control/payment", { data: { id: pay, order_id: body.razorpayOrderId, amount: 59900, currency: "INR", status: "captured" } });
    expect((await status(v.token)).status).toBe("paid");
    await expect.poll(async () => (await emailsTo(email)).length).toBe(1);
  });

  test("an unknown order or unrelated event is acknowledged and ignored", async () => {
    const res = await webhook("order.paid", paymentEntity(`pay_${rid()}`, `order_${rid()}`, "captured"));
    expect(res.status()).toBe(200);
    expect((await res.json()).result).toBe("ignored:unknown-order");
  });
});

test.describe("access and downloads", () => {
  async function paidToken(email = newEmail("paid")) {
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    return { ...(await (await verify(body.razorpayOrderId, pay)).json()), razorpayOrderId: body.razorpayOrderId } as { token: string; orderId: string; razorpayOrderId: string };
  }

  test("9. a failed payment never grants access", async () => {
    const { body } = await createOrder(newEmail("failed"));
    const pay = await setPayment(body.razorpayOrderId, "authorized");
    const { token } = await (await verify(body.razorpayOrderId, pay)).json();
    const wh = await webhook("payment.failed", paymentEntity(pay, body.razorpayOrderId, "failed"));
    expect((await wh.json()).result).toBe("failed:failed");
    expect((await status(token)).status).toBe("failed");
    const dl = await api.post("/api/download", { data: { token } });
    expect(dl.status()).toBe(403);
    expect((await dl.json()).error).toBe("not_paid");
    // And a failed payment reported at verify returns no token at all.
    const { body: b2 } = await createOrder(newEmail("failed2"));
    const p2 = await setPayment(b2.razorpayOrderId, "failed");
    const r2 = await verify(b2.razorpayOrderId, p2);
    expect(r2.status()).toBe(402);
    expect((await r2.json()).token).toBeUndefined();
  });

  test("a payment.failed event never downgrades a paid order", async () => {
    const t = await paidToken();
    await webhook("payment.failed", paymentEntity(`pay_${rid()}`, t.razorpayOrderId, "failed"));
    expect((await status(t.token)).status).toBe("paid");
  });

  test("10. an unpaid order cannot download", async () => {
    const { body } = await createOrder(newEmail("unpaid"));
    const pay = await setPayment(body.razorpayOrderId, "authorized");
    const { token, status: s } = await (await verify(body.razorpayOrderId, pay)).json();
    expect(s).toBe("processing");
    expect((await api.post("/api/download", { data: { token } })).status()).toBe(403);
  });

  test("11. a paid order can download through a short-lived signed URL", async () => {
    const { token } = await paidToken();
    const res = await api.post("/api/download", { data: { token } });
    expect(res.status()).toBe(200);
    const { url, expiresAt } = await res.json();
    const ttl = new Date(expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(14 * 60_000);
    expect(ttl).toBeLessThanOrEqual(15 * 60_000);
    const file = await api.get(url);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("application/pdf");
    expect(file.headers()["content-disposition"]).toContain("attachment");
    expect(file.headers()["cache-control"]).toContain("no-store");
    expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
    // Each request mints a new URL.
    const again = await (await api.post("/api/download", { data: { token } })).json();
    expect(again.url).not.toBe(url);
  });

  test("12. an expired download URL is refused", async () => {
    const { orderId } = await paidToken();
    const exp = Math.floor(Date.now() / 1000) - 5;
    const sig = hmac(TEST_STORAGE_SECRET, `ebook|${orderId}|${exp}|abc123`);
    const res = await api.get(`/api/download/file?o=${orderId}&exp=${exp}&n=abc123&sig=${sig}`);
    expect(res.status()).toBe(410);
  });

  test("13. unauthorised access is refused: forged tokens, tampered URLs, refunded orders", async () => {
    expect((await api.post("/api/download", { data: { token: randomBytes(32).toString("base64url") } })).status()).toBe(403);
    expect((await api.post("/api/download", { data: { token: "short" } })).status()).toBe(403);
    expect((await api.post("/api/download", { data: {} })).status()).toBe(403);
    const t = await paidToken();
    const { url } = await (await api.post("/api/download", { data: { token: t.token } })).json();
    const u = new URL(url);
    const other = await paidToken();
    u.searchParams.set("o", other.orderId); // reuse a signature for another order
    expect((await api.get(u.toString())).status()).toBe(403);
    u.searchParams.set("o", t.orderId);
    u.searchParams.set("exp", String(Number(u.searchParams.get("exp")) + 3600)); // extend the expiry
    expect((await api.get(u.toString())).status()).toBe(403);
    expect((await api.get("/api/download/file")).status()).toBe(403);
    // A full refund revokes access.
    await webhook("refund.processed", { ...paymentEntity(`pay_${rid()}`, t.razorpayOrderId, "refunded"), amount_refunded: 59900 });
    expect((await api.post("/api/download", { data: { token: t.token } })).status()).toBe(403);
  });

  test("the ebook is not reachable at any public path", async () => {
    for (const p of ["/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf", "/reference/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf", "/ebook.pdf", "/files/ebook.pdf", "/tests/.fixtures/sample-ebook.pdf"]) {
      expect((await api.get(p)).status(), p).toBe(404);
    }
  });

  test("a buyer can request a fresh link by email; the response never reveals whether an email bought", async () => {
    const email = newEmail("relink");
    await paidToken(email);
    await expect.poll(async () => (await emailsTo(email)).length).toBe(1);
    const yes = await api.post("/api/purchase/resend", { data: { email } });
    const no = await api.post("/api/purchase/resend", { data: { email: newEmail("nobody") } });
    expect(await yes.json()).toEqual(await no.json());
    const mails = await emailsTo(email);
    expect(mails).toHaveLength(2);
    expect((await status(tokenFrom(mails[1].text)!)).status).toBe("paid");
  });

  test("buying again with an email that already owns the ebook sends a link instead of charging", async () => {
    const email = newEmail("again");
    await paidToken(email);
    const { res, body } = await createOrder(email);
    expect(res.status()).toBe(409);
    expect(body.error).toBe("already_purchased");
  });
});

test.describe("delivery email", () => {
  test("14. a failing email provider is retried, and a webhook retry finishes delivery", async () => {
    // Two transient failures: delivered within the same request.
    const e1 = newEmail("retry");
    await mock.post("/__control/email-fail", { data: { to: e1, count: 2 } });
    const { body: b1 } = await createOrder(e1);
    const p1 = await setPayment(b1.razorpayOrderId, "captured");
    expect((await (await webhook("order.paid", paymentEntity(p1, b1.razorpayOrderId, "captured"))).json()).result).toBe("paid:sent");
    expect(await emailsTo(e1)).toHaveLength(1);

    // Provider down: the webhook fails (so Razorpay retries); the buyer can still download.
    const e2 = newEmail("down");
    await mock.post("/__control/email-fail", { data: { to: e2, count: 3 } });
    const { body: b2 } = await createOrder(e2);
    const p2 = await setPayment(b2.razorpayOrderId, "captured");
    const eventId = `evt_${rid()}`;
    const entity = paymentEntity(p2, b2.razorpayOrderId, "captured");
    expect((await webhook("order.paid", entity, { eventId })).status()).toBe(500);
    expect(await emailsTo(e2)).toHaveLength(0);
    // Razorpay's retry of the same event succeeds once the provider is back.
    expect((await (await webhook("order.paid", entity, { eventId })).json()).result).toBe("paid:sent");
    expect(await emailsTo(e2)).toHaveLength(1);
  });

  test("15. verify, webhook and reconciliation together deliver exactly one email", async () => {
    const email = newEmail("once");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const entity = paymentEntity(pay, body.razorpayOrderId, "captured");
    const [v] = await Promise.all([verify(body.razorpayOrderId, pay), webhook("order.paid", entity), webhook("payment.captured", entity), verify(body.razorpayOrderId, pay)]);
    const { token } = await v.json();
    await status(token);
    await new Promise((r) => setTimeout(r, 800));
    const mails = await emailsTo(email);
    expect(mails).toHaveLength(1);
  });
});

test.describe("purchase email, receipt and ebook attachment", () => {
  async function buy(email: string, locale: "en" | "hi" = "en") {
    const res = await api.post("/api/checkout/create-order", { data: { name: "Asha Verma", email, phone: MOBILE, locale } });
    const body = await res.json();
    const pay = await setPayment(body.razorpayOrderId, "captured");
    await verify(body.razorpayOrderId, pay);
    await expect.poll(async () => (await emailsTo(email)).length).toBe(1);
    return { ...body, pay, mail: (await emailsTo(email))[0] } as { orderId: string; pay: string; mail: Mail };
  }

  test("the confirmation email has every purchase detail and support", async () => {
    const { orderId, pay, mail } = await buy(newEmail("details"));
    expect(mail.subject).toBe("Your CRAFT & CODE purchase is confirmed — ZERO TO FIRST CLIENT");
    for (const s of ["CRAFT & CODE", "Asha Verma", "Thank you for your purchase", "ZERO TO FIRST CLIENT", "2026 Edition", orderId, pay, "₹599 INR", "IST", "Purchase confirmed", "support@buyers.test", "Download it with the button below", "receipt (PDF) is attached", "keep this link private", "30 days", "15 minutes"]) {
      expect(mail.text, s).toContain(s);
    }
    expect(mail.text).toMatch(/Receipt number: CC-\d{8}-[A-F0-9]{8}/);
    expect(mail.html).toContain(orderId);
    expect(mail.html).toContain('lang="en"');
    expect(mail.replyTo).toBe("support@buyers.test");
    expect(tokenFrom(mail.text)).toBeTruthy();
  });

  test("the receipt PDF and the inline logo are attached; the ebook itself goes by secure link", async () => {
    const { orderId, pay, mail } = await buy(newEmail("attach"));
    expect(mail.attachments.map((a) => a.filename)).toEqual([expect.stringMatching(/^Payment-Receipt-CC-\d{8}-[A-F0-9]{8}\.pdf$/), "craft-and-code-logo.jpg"]);
    const [receipt, logo] = mail.attachments;
    expect(receipt.contentId).toBeNull();
    expect(logo.contentId).toBe("craftcode-logo");
    expect(mail.html).toContain('src="cid:craftcode-logo"');
    expect(mail.text).not.toMatch(/supabase|storage\/v1/i);
    expect(receipt.text!.startsWith("%PDF-1.4")).toBe(true);
    expect(receipt.text).toContain("%%EOF");
    for (const s of ["Payment Receipt", orderId, pay, "599.00", "INR", "PAID", "Asha Verma", "+91 90000 00001", "support@buyers.test", "https://craftandcode.tech", "DEADCODE LABS", "Thank you for purchasing from CRAFT & CODE.", "It is not a GST tax invoice"]) expect(receipt.text, s).toContain(s);
    // The official logo is embedded (header + faint watermark).
    expect(receipt.text).toContain("/Filter /DCTDecode");
    expect(receipt.text).toContain("/ca 0.05");
    expect(receipt.text).not.toMatch(/GSTIN/);
    // The xref table points at real objects (a broken offset makes PDF viewers complain).
    const start = Number(/startxref\n(\d+)/.exec(receipt.text!)![1]);
    expect(receipt.text!.slice(start, start + 4)).toBe("xref");
  });

  test("a Hindi buyer gets the email in Hindi", async () => {
    const { orderId, mail } = await buy(newEmail("hindi"), "hi");
    expect(mail.subject).toContain("confirm हो गई");
    expect(mail.text).toContain("ख़रीदने के लिए दिल से धन्यवाद");
    expect(mail.text).toContain(orderId);
    expect(mail.html).toContain('lang="hi"');
    expect(mail.text).toContain("/hi/purchase/success#t=");
  });

  test("an email failure never changes the payment status", async () => {
    const email = newEmail("keep-paid");
    await mock.post("/__control/email-fail", { data: { to: email, count: 3 } });
    const body = await (await api.post("/api/checkout/create-order", { data: { name: "Asha Verma", email, phone: MOBILE } })).json();
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const { token } = await (await verify(body.razorpayOrderId, pay)).json();
    await expect.poll(async () => (await status(token)).emailStatus, { timeout: 10000 }).toBe("failed");
    expect((await status(token)).status).toBe("paid");
    expect((await api.post("/api/download", { data: { token } })).status()).toBe(200);
  });
});

test.describe("receipt download", () => {
  test("a paid buyer can download the receipt; nobody else can", async () => {
    const email = newEmail("rcpt");
    const body = await (await api.post("/api/checkout/create-order", { data: { name: "Asha Verma", email, phone: MOBILE } })).json();
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const { token } = await (await verify(body.razorpayOrderId, pay)).json();
    const ok = await api.post("/api/purchase/receipt", { data: { token } });
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-type"]).toBe("application/pdf");
    expect(ok.headers()["content-disposition"]).toMatch(/attachment; filename="Payment-Receipt-CC-\d{8}-[A-F0-9]{8}\.pdf"/);
    expect(ok.headers()["cache-control"]).toContain("no-store");
    const pdf = (await ok.body()).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain(body.orderId);
    // Forged token, missing token, unpaid order, refunded order: all refused.
    expect((await api.post("/api/purchase/receipt", { data: { token: randomBytes(32).toString("base64url") } })).status()).toBe(403);
    expect((await api.post("/api/purchase/receipt", { data: {} })).status()).toBe(403);
    const unpaid = await (await api.post("/api/checkout/create-order", { data: { name: "Asha Verma", email: newEmail("rcpt2"), phone: MOBILE } })).json();
    const p2 = await setPayment(unpaid.razorpayOrderId, "authorized");
    const { token: t2 } = await (await verify(unpaid.razorpayOrderId, p2)).json();
    expect((await api.post("/api/purchase/receipt", { data: { token: t2 } })).status()).toBe(403);
    await webhook("refund.processed", { ...paymentEntity(pay, body.razorpayOrderId, "refunded"), amount_refunded: 59900 });
    expect((await api.post("/api/purchase/receipt", { data: { token } })).status()).toBe(403);
  });
});

test.describe("owner email notification", () => {
  const OWNER = "owner@buyers.test";

  test("verified payment sends a separate, detailed notification to the owner", async () => {
    const email = newEmail("owner-notify");
    const res = await api.post("/api/checkout/create-order", { data: { name: "Rohan Sharma", email, phone: MOBILE, locale: "en" } });
    const body = await res.json();
    const pay = await setPayment(body.razorpayOrderId, "captured");
    await verify(body.razorpayOrderId, pay);

    await expect.poll(async () => {
      const mails = await emailsTo(OWNER);
      return mails.some((m) => m.text.includes(body.orderId));
    }, { timeout: 10000 }).toBe(true);
    const ownerMails = await emailsTo(OWNER);
    const mail = ownerMails.find((m) => m.text.includes(body.orderId))!;

    expect(mail.subject).toContain("New Purchase Received — CRAFT & CODE | ₹599");
    for (const item of [
      "CRAFT & CODE",
      "Rohan Sharma",
      email,
      "+919000000001",
      "ZERO TO FIRST CLIENT",
      "2026 Edition",
      body.orderId,
      pay,
      "₹599",
      "paid",
      "IST",
      "English (en)",
      "Customer Delivery Email: Delivered successfully",
      "Ebook Delivery: Delivered via secure link (PDF unattached)",
      "Receipt Generation: Generated and attached to customer email (PDF)",
    ]) {
      expect(mail.text, item).toContain(item);
    }
    expect(mail.html).toContain(body.orderId);
    expect(mail.html).toContain("/admin/orders");
    // Ensure no secrets or passwords are leaked in the email
    expect(mail.text).not.toContain(TEST_KEY_SECRET);
    expect(mail.text).not.toContain(TEST_WEBHOOK_SECRET);
    expect(mail.text).not.toContain(ADMIN.pass);
  });

  test("if customer email fails, owner notification is still attempted and sent", async () => {
    const email = newEmail("cust-fail-owner-ok");
    await mock.post("/__control/email-fail", { data: { to: email, count: 3 } });
    const res = await api.post("/api/checkout/create-order", { data: { name: "Pooja Patel", email, phone: MOBILE, locale: "en" } });
    const body = await res.json();
    const pay = await setPayment(body.razorpayOrderId, "captured");
    await verify(body.razorpayOrderId, pay);

    await expect.poll(async () => {
      const mails = await emailsTo(OWNER);
      return mails.some((m) => m.text.includes(body.orderId));
    }, { timeout: 10000 }).toBe(true);
    const ownerMails = await emailsTo(OWNER);
    const mail = ownerMails.find((m) => m.text.includes(body.orderId))!;
    expect(mail.text).toContain(body.orderId);
    expect(mail.text).toContain("Customer Delivery Email: Delivery failed (queued for retry)");
  });

  test("duplicate webhooks do not send duplicate owner notifications", async () => {
    const email = newEmail("no-dup-owner");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "captured");
    const entity = paymentEntity(pay, body.razorpayOrderId, "captured");

    const ownerCountBefore = (await emailsTo(OWNER)).filter((m) => m.text.includes(body.orderId)).length;
    expect(ownerCountBefore).toBe(0);

    // Send verify and multiple webhooks concurrently
    await Promise.all([
      verify(body.razorpayOrderId, pay),
      webhook("order.paid", entity),
      webhook("payment.captured", entity),
      webhook("order.paid", entity),
    ]);

    await new Promise((r) => setTimeout(r, 600));
    const ownerMails = (await emailsTo(OWNER)).filter((m) => m.text.includes(body.orderId));
    expect(ownerMails).toHaveLength(1);
  });

  test("unverified or failed payments never send owner notifications", async () => {
    const email = newEmail("unverified-owner");
    const { body } = await createOrder(email);
    const pay = await setPayment(body.razorpayOrderId, "failed");
    await webhook("payment.failed", paymentEntity(pay, body.razorpayOrderId, "failed"));

    await new Promise((r) => setTimeout(r, 400));
    const ownerMails = (await emailsTo(OWNER)).filter((m) => m.text.includes(body.orderId));
    expect(ownerMails).toHaveLength(0);
  });
});

test.describe("admin", () => {
  const auth = () => ({ authorization: `Basic ${Buffer.from(`${ADMIN.user}:${ADMIN.pass}`).toString("base64")}` });

  test("the dashboard needs credentials; wrong ones are refused", async () => {
    expect((await api.get("/admin/orders")).status()).toBe(401);
    const bad = Buffer.from(`${ADMIN.user}:wrong-password`).toString("base64");
    expect((await api.get("/admin/orders", { headers: { authorization: `Basic ${bad}` } })).status()).toBe(401);
    expect((await api.post("/admin/orders", { form: { action: "test-email", confirm: "yes" } })).status()).toBe(401);
  });

  test("every view renders real data under a script-free policy, without secrets", async () => {
    const email = newEmail("admin");
    const { body } = await createOrder(email);
    for (const view of ["overview", "orders", "customers", "payments", "ebook", "email"]) {
      const res = await api.get(`/admin/orders?view=${view}`, { headers: auth() });
      expect(res.status(), view).toBe(200);
      const csp = res.headers()["content-security-policy"];
      expect(csp).toContain("default-src 'none'");
      expect(csp).not.toContain("script-src");
      expect(res.headers()["x-robots-tag"]).toBe("noindex");
      const html = await res.text();
      expect(html).not.toMatch(/<script/i);
      for (const secret of [TEST_KEY_SECRET, TEST_WEBHOOK_SECRET, ADMIN.pass, "re_mock_not_real"]) expect(html, `${view} leaks a secret`).not.toContain(secret);
    }
    const search = await (await api.get(`/admin/orders?view=orders&q=${body.orderId}`, { headers: auth() })).text();
    expect(search).toContain(body.orderId);
    expect(search).toContain(email);
    expect(search).toContain("1 order(s)");
    const detail = await (await api.get(`/admin/orders?view=orders&id=${body.orderId}`, { headers: auth() })).text();
    for (const s of [body.razorpayOrderId, email, "+919000000001", "pending", "no access"]) expect(detail, s).toContain(s);
    expect(detail).not.toMatch(/mark (as )?paid/i);
    const filtered = await (await api.get(`/admin/orders?view=orders&status=refunded&q=${body.orderId}`, { headers: auth() })).text();
    expect(filtered).toContain("0 order(s)");
    const overview = await (await api.get("/admin/orders", { headers: auth() })).text();
    expect(overview).toContain("TEST");
    expect(overview).toContain("Total orders");
  });

  test("actions need confirmation, the same origin, and are rate-limited", async () => {
    const before = (await emailsTo("owner@buyers.test")).filter((m) => m.subject === "CRAFT & CODE — Email Integration Test").length;
    const noConfirm = await (await api.post("/admin/orders?view=email", { headers: auth(), form: { action: "test-email" } })).text();
    expect(noConfirm).toContain("please tick the confirmation box");
    expect((await api.post("/admin/orders", { headers: { ...auth(), origin: "https://evil.example" }, form: { action: "test-email", confirm: "yes" } })).status()).toBe(403);
    const first = await (await api.post("/admin/orders?view=email", { headers: auth(), form: { action: "test-email", confirm: "yes" } })).text();
    const second = await (await api.post("/admin/orders?view=email", { headers: auth(), form: { action: "test-email", confirm: "yes" } })).text();
    const sent = (await emailsTo("owner@buyers.test")).filter((m) => m.subject === "CRAFT & CODE — Email Integration Test");
    // Two browsers run this suite against one server: across both, exactly one test email may be sent per 10 minutes.
    expect(sent.length - before).toBeLessThanOrEqual(1);
    expect([first, second].some((h) => h.includes("in the last 10 minutes"))).toBe(true);
    if (sent.length > before) {
      expect(sent.at(-1)!.text).toContain("not a purchase confirmation");
      expect(sent.at(-1)!.attachments.map((a) => a.filename)).toEqual(["craft-and-code-logo.jpg"]);
    }
  });

  test("after 10 failed sign-ins an IP is locked out, even with the correct password", async () => {
    const wrong = { authorization: `Basic ${Buffer.from(`${ADMIN.user}:wrong-guess`).toString("base64")}` };
    for (let i = 0; i < 10; i++) expect((await api.get("/admin/orders", { headers: wrong })).status()).toBe(401);
    expect((await api.get("/admin/orders", { headers: wrong })).status()).toBe(429);
    const locked = await api.get("/admin/orders", { headers: auth() });
    expect(locked.status()).toBe(429);
    expect(await locked.text()).not.toContain("Overview");
    // A different client is unaffected.
    const other = await pwRequest.newContext({ baseURL: COMMERCE_URL, extraHTTPHeaders: { "x-forwarded-for": "10.250.1.1" } });
    expect((await other.get("/admin/orders", { headers: auth() })).status()).toBe(200);
    await other.dispose();
  });

  test("logout answers 401 so the browser drops its credentials", async () => {
    const res = await api.get("/admin/logout");
    expect(res.status()).toBe(401);
    expect(await res.text()).toContain("Signed out");
  });
});

test.describe("checkout in the browser", () => {
  test.describe.configure({ timeout: 90_000 });
  /** Stand-in for checkout.razorpay.com: behaves like Standard Checkout and signs with the test secret via the test runner. */
  const FAKE_CHECKOUT = `
    window.Razorpay = function (o) { this.o = o; this.h = {}; };
    Razorpay.prototype.on = function (e, cb) { this.h[e] = cb; };
    Razorpay.prototype.open = async function () {
      window.__rzpOptions = { key: this.o.key, amount: this.o.amount, currency: this.o.currency, order_id: this.o.order_id, prefill: this.o.prefill };
      if (window.__checkPrefill) await window.__checkPrefill(window.__rzpOptions);
      if (window.__rzpMode === "dismiss") return setTimeout(() => this.o.modal.ondismiss(), 100);
      if (window.__rzpMode === "fail") { this.h["payment.failed"] && this.h["payment.failed"]({ error: { code: "BAD_REQUEST_ERROR" } }); return setTimeout(() => this.o.modal.ondismiss(), 100); }
      const r = await window.__pay(this.o.order_id);
      setTimeout(() => this.o.handler(r), 100);
    };`;

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
    await page.route("https://checkout.razorpay.com/v1/checkout.js", (r) => r.fulfill({ contentType: "application/javascript", body: FAKE_CHECKOUT }));
    await page.exposeFunction("__pay", async (orderId: string) => {
      const id = `pay_${rid()}${rid()}`;
      await mock.post("/__control/payment", { data: { id, order_id: orderId, amount: 59900, currency: "INR", status: "captured" } });
      return { razorpay_order_id: orderId, razorpay_payment_id: id, razorpay_signature: checkoutSig(orderId, id) };
    });
  });

  for (const [label, viewport, prefix] of [["16. mobile checkout (390px, English)", { width: 390, height: 844 }, ""], ["desktop checkout (Hindi)", { width: 1280, height: 900 }, "/hi"]] as const) {
    test(`${label}: pay, verify, success page, download`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.goto(`${COMMERCE_URL}${prefix}/#pricing`);
      const buy = page.locator('#pricing [data-checkout="razorpay"]');
      await expect(buy).toBeVisible({ timeout: 15000 });
      await buy.click();
      const dialog = page.getByTestId("checkout-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId("test-mode-badge")).toBeVisible();
      // The dialog fits the phone screen.
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await dialog.locator('input[name="name"]').fill("Asha Test");
      await dialog.locator('input[name="email"]').fill(newEmail("ui"));
      // A wrong mobile number is caught before Razorpay opens…
      await dialog.locator('input[name="phone"]').fill("12345");
      await dialog.locator('button[type="submit"]').click();
      await expect(dialog.getByTestId("checkout-error")).toContainText("mobile number");
      // …and a valid one is passed to Razorpay, so its window doesn't ask again.
      let prefill: { name?: string; email?: string; contact?: string } = {};
      await page.exposeFunction("__checkPrefill", (o: { prefill: typeof prefill }) => void (prefill = o.prefill));
      await dialog.locator('input[name="phone"]').fill("90000 00001");
      await dialog.locator('button[type="submit"]').click();
      await page.waitForURL(new RegExp(`${prefix}/purchase/success`));
      expect(prefill).toMatchObject({ name: "Asha Test", contact: "+919000000001" });
      await expect(page.getByTestId("purchase-status")).toHaveAttribute("data-state", "paid", { timeout: 15000 });
      expect(page.url()).not.toContain("#t="); // token removed from the address bar
      if (prefix === "/hi") await expect(page.getByTestId("purchase-status")).toContainText("Payment confirm हो गया");
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-button").click()]);
      expect(download.suggestedFilename()).toBe("ZERO_TO_FIRST_CLIENT_2026.pdf");
      // Order summary and the protected receipt download.
      await expect(page.getByTestId("order-summary")).toContainText("₹599 INR");
      await expect(page.getByTestId("order-summary")).toContainText("ZERO TO FIRST CLIENT");
      const [receipt] = await Promise.all([page.waitForEvent("download"), page.getByTestId("receipt-button").click()]);
      expect(receipt.suggestedFilename()).toMatch(/^Payment-Receipt-CC-\d{8}-[A-F0-9]{8}\.pdf$/);
      // Reloading keeps working (token is held for this tab only).
      await page.reload();
      await expect(page.getByTestId("purchase-status")).toHaveAttribute("data-state", "paid", { timeout: 15000 });
    });
  }

  test("closing the payment window shows a cancelled message and charges nothing", async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __rzpMode: string }).__rzpMode = "dismiss"));
    await page.goto(`${COMMERCE_URL}/#pricing`);
    await page.locator('#pricing [data-checkout="razorpay"]').click();
    const dialog = page.getByTestId("checkout-dialog");
    await dialog.locator('input[name="name"]').fill("Asha Test");
    await dialog.locator('input[name="email"]').fill(newEmail("cancel"));
    await dialog.locator('input[name="phone"]').fill(MOBILE);
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByTestId("checkout-error")).toContainText("Payment cancelled", { timeout: 20000 });
    await expect(dialog.locator('button[type="submit"]')).toBeEnabled();
  });

  test("a failed payment shows a failure message", async ({ page }) => {
    await page.addInitScript(() => ((window as unknown as { __rzpMode: string }).__rzpMode = "fail"));
    await page.goto(`${COMMERCE_URL}/#pricing`);
    await page.locator('#pricing [data-checkout="razorpay"]').click();
    const dialog = page.getByTestId("checkout-dialog");
    await dialog.locator('input[name="name"]').fill("Asha Test");
    await dialog.locator('input[name="email"]').fill(newEmail("fail"));
    await dialog.locator('input[name="phone"]').fill(MOBILE);
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByTestId("checkout-error")).toContainText("didn't go through", { timeout: 20000 });
  });

  test("an email outside the test allowlist can't check out", async ({ page }) => {
    await page.goto(`${COMMERCE_URL}/#pricing`);
    await page.locator('#pricing [data-checkout="razorpay"]').click();
    const dialog = page.getByTestId("checkout-dialog");
    await dialog.locator('input[name="name"]').fill("Real Customer");
    await dialog.locator('input[name="email"]').fill("customer@gmail.com");
    await dialog.locator('input[name="phone"]').fill(MOBILE);
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByTestId("checkout-error")).toContainText("test mode", { timeout: 20000 });
  });

  test("success page without a valid link explains what to do", async ({ page }) => {
    await page.goto(`${COMMERCE_URL}/purchase/success`);
    await expect(page.getByTestId("purchase-status")).toHaveAttribute("data-state", "none");
    await page.goto(`${COMMERCE_URL}/purchase/success#t=${randomBytes(32).toString("base64url")}`);
    await expect(page.getByTestId("purchase-status")).toHaveAttribute("data-state", "invalid");
    await page.locator('input[name="email"]').fill(newEmail("lost"));
    await page.getByRole("button", { name: "Email me a new link" }).click();
    await expect(page.getByTestId("resend-message")).toBeVisible();
  });
});

test("public site keeps checkout closed: no Razorpay script, config disabled", async ({ page, request }) => {
  const cfg = await (await request.get("/api/checkout/config")).json();
  expect(cfg.enabled).toBe(false);
  expect(cfg.keyId).toBeUndefined();
  expect((await request.post("/api/checkout/create-order", { data: { name: "Test Buyer", email: "a@buyers.test", phone: MOBILE } })).status()).toBe(503);
  const scripts: string[] = [];
  page.on("request", (r) => scripts.push(r.url()));
  await page.goto("/#pricing");
  await page.locator("#pricing button", { hasText: "Get instant access" }).click();
  await expect(page.locator("#pricing").getByText("Checkout isn't open yet. Secure payment will be available here at launch.")).toBeVisible();
  expect(scripts.some((u) => u.includes("razorpay"))).toBe(false);
});
