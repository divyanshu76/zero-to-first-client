import { createHmac, randomBytes } from "node:crypto";
import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";
import { ADMIN, COMMERCE_URL, MOCK, TEST_CRON_SECRET, TEST_KEY_SECRET, TEST_RECOVERY_SECRET } from "./commerce/env";

/**
 * Checkout Recovery, end to end against the local commerce server with mocked Razorpay and
 * Resend (tests/commerce/mock-server.mjs). No real email, WhatsApp message or payment is involved.
 * The recovery clock is moved forward with a test-only header (refused on Vercel and with live keys).
 *
 * Runs serially in one browser project: the tests share the automation switch.
 */
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, "recovery tests need the local mock servers");
test.describe.configure({ mode: "serial" });
test.skip(({ browserName }) => browserName !== "chromium", "shared automation state: one project is enough");

const MIN = 60_000;
const HOUR = 60 * MIN;
const rid = () => randomBytes(6).toString("hex");
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");
const newEmail = (tag: string) => `rcv-${tag}-${rid()}@buyers.test`;
const MOBILE = "9000000001";
const auth = () => ({ authorization: `Basic ${Buffer.from(`${ADMIN.user}:${ADMIN.pass}`).toString("base64")}` });
const ip = () => `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

let api: APIRequestContext;
let mock: APIRequestContext;
test.beforeEach(async () => {
  api = await pwRequest.newContext({ baseURL: COMMERCE_URL, extraHTTPHeaders: { "x-forwarded-for": ip() } });
  mock = await pwRequest.newContext({ baseURL: MOCK });
});
test.afterEach(async () => {
  await api.dispose();
  await mock.dispose();
});

async function adminCtx() {
  return pwRequest.newContext({ baseURL: COMMERCE_URL, extraHTTPHeaders: { "x-forwarded-for": ip(), ...auth() } });
}
test.beforeAll(async ({ browserName }) => {
  if (browserName !== "chromium") return;
  const a = await adminCtx();
  const forms: Record<string, string>[] = [{ action: "automation-on", confirm: "yes" }, { action: "resume", confirm: "yes" }, { action: "cap", cap: "500", confirm: "yes" }];
  for (const form of forms) expect((await a.post("/admin/recovery", { form })).status()).toBe(200);
  await a.dispose();
});
test.afterAll(async ({ browserName }) => {
  if (browserName !== "chromium") return;
  const a = await adminCtx();
  await a.post("/admin/recovery", { form: { action: "automation-off", confirm: "yes" } });
  await a.dispose();
});

type Created = { email: string; t0: number; orderId: string; razorpayOrderId: string };
async function order(tag: string, consent: { email?: unknown; whatsapp?: unknown } = { email: true }, extra: Record<string, unknown> = {}): Promise<Created> {
  const email = (extra.email as string) ?? newEmail(tag);
  const t0 = Date.now();
  const res = await api.post("/api/checkout/create-order", { data: { name: "Asha Verma", email, phone: MOBILE, locale: "en", remindEmail: consent.email ?? false, remindWhatsapp: consent.whatsapp ?? false, ...extra } });
  expect(res.status()).toBe(201);
  return { email, t0, ...((await res.json()) as { orderId: string; razorpayOrderId: string }) };
}
const signed = (opts: { nonce?: string; ts?: number; secret?: string } = {}) => {
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const nonce = opts.nonce ?? `n${rid()}${rid()}${rid()}`;
  return { "x-recovery-ts": ts, "x-recovery-nonce": nonce, "x-recovery-signature": hmac(opts.secret ?? TEST_RECOVERY_SECRET, `v1:${ts}:${nonce}`) };
};
type Run = { status: string; examined: number; sent: number; skipped: number; failed: number; recovered: number; note: string | null };
async function run(at: number, headers: Record<string, string> = signed()): Promise<Run> {
  const res = await api.post("/api/recovery/run", { headers: { ...headers, "x-recovery-test-now": String(at), "x-recovery-test-sync": "1" } });
  expect(res.status()).toBe(200);
  return res.json();
}
type Mail = { subject: string; text: string; html: string; key: string; headers: Record<string, string> | null };
const emailsTo = async (email: string) => (await (await mock.get(`/__control/emails?to=${encodeURIComponent(email)}`)).json()) as Mail[];
const reminders = async (email: string) => (await emailsTo(email)).filter((m) => m.subject.startsWith("Still interested"));
const deliveries = async (email: string) => (await emailsTo(email)).filter((m) => m.subject.includes("purchase is confirmed"));
const adminPost = (form: Record<string, string>, at?: number) => api.post("/admin/recovery", { headers: { ...auth(), ...(at ? { "x-recovery-test-now": String(at) } : {}) }, form });
async function setPayment(razorpayOrderId: string, status: string, id = `pay_${rid()}${rid()}`) {
  await mock.post("/__control/payment", { data: { id, entity: "payment", order_id: razorpayOrderId, amount: 59900, currency: "INR", status } });
  return id;
}
async function payAndVerify(o: Created) {
  const pay = await setPayment(o.razorpayOrderId, "captured");
  const res = await api.post("/api/checkout/verify", { data: { razorpay_order_id: o.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: hmac(TEST_KEY_SECRET, `${o.razorpayOrderId}|${pay}`) } });
  expect(res.status()).toBe(200);
}
const resumeToken = (text: string) => /#resume=([A-Za-z0-9_-]{43})/.exec(text)?.[1] ?? "";
/** The link in the email body: token after "#", never in the URL a browser requests. */
const unsubscribeLink = (text: string) => /(http:\/\/localhost:\d+\/api\/recovery\/unsubscribe(?:\?l=hi)?#t=([A-Za-z0-9_-]{43}))/.exec(text);
/** The List-Unsubscribe header target for one-click POSTs. */
const oneClickUrl = (m: Mail) => /^<(.+)>$/.exec(m.headers?.["List-Unsubscribe"] ?? "")?.[1] ?? "";
/** The hidden fields of the preview page's send form (recipient list + signed preview token). */
function previewForm(html: string) {
  const form = /<input type="hidden" name="action" value="send">([\s\S]*?)<label class="check">/.exec(html)?.[1] ?? "";
  const fields = [...form.matchAll(/name="([a-z_]+)" value="([^"]*)"/g)].map((m) => [m[1], m[2]] as [string, string]);
  return { fields, ids: fields.filter(([k]) => k === "ids").map(([, v]) => v) };
}
function postForm(pairs: [string, string][], at?: number, extra: Record<string, string> = {}) {
  return api.post("/admin/recovery", { headers: { ...auth(), "content-type": "application/x-www-form-urlencoded", ...(at ? { "x-recovery-test-now": String(at) } : {}), ...extra }, data: new URLSearchParams(pairs).toString() });
}

test("1. 30-minute and 24-hour reminders go to an opted-in checkout exactly once each", async () => {
  const o = await order("auto");
  await run(o.t0 + 10 * MIN);
  expect(await reminders(o.email)).toHaveLength(0); // not due yet

  const r = await run(o.t0 + 31 * MIN);
  expect(r.status).toBe("ok");
  let mails = await reminders(o.email);
  expect(mails).toHaveLength(1);
  const m = mails[0];
  expect(m.subject).toBe("Still interested in Zero to First Client? 🚀");
  for (const s of ["Hi Asha,", "ZERO TO FIRST CLIENT", "142-page PDF", "10 chapters", "141 AI prompts", "20 templates", "7 calculator sheets", "24 diagrams", "₹599", "reminder 1 of 2", "support@buyers.test"]) expect(m.text).toContain(s);
  expect(m.text).toMatch(/Continue checkout: http:\/\/localhost:3301\/#resume=[A-Za-z0-9_-]{43}/);
  expect(m.text).not.toMatch(/discount|guarantee|% off/i);
  expect(m.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  expect(m.headers?.["List-Unsubscribe"]).toMatch(/^<http:\/\/localhost:3301\/api\/recovery\/unsubscribe\?t=[A-Za-z0-9_-]{43}>$/);
  expect(m.html).toContain("Continue checkout");

  // Duplicate prevention: later runs before 24 h send nothing more.
  await run(o.t0 + 32 * MIN);
  await run(o.t0 + 6 * HOUR);
  expect(await reminders(o.email)).toHaveLength(1);

  await run(o.t0 + 24 * HOUR + MIN);
  mails = await reminders(o.email);
  expect(mails).toHaveLength(2);
  expect(mails[1].text).toContain("reminder 2 of 2");
  await run(o.t0 + 30 * HOUR);
  await run(o.t0 + 73 * HOUR);
  expect(await reminders(o.email)).toHaveLength(2);
});

test("2. without recorded opt-in nobody is contacted (including non-boolean 'consent')", async () => {
  const none = await order("noconsent", {});
  const waOnly = await order("waonly", { whatsapp: true });
  const fake = await order("stringconsent", { email: "yes", whatsapp: 1 });
  for (const at of [31 * MIN, 24 * HOUR + MIN]) await run(none.t0 + at);
  for (const o of [none, waOnly, fake]) expect(await reminders(o.email)).toHaveLength(0);
  const preview = await (await adminPost({ action: "preview", one: none.orderId }, none.t0 + 31 * MIN)).text();
  expect(preview).toContain("None of the selected checkouts can be emailed");
});

test("3. a paid order never gets a reminder", async () => {
  const o = await order("paid");
  await payAndVerify(o);
  await run(o.t0 + 31 * MIN);
  await run(o.t0 + 24 * HOUR + MIN);
  expect(await reminders(o.email)).toHaveLength(0);
  await expect.poll(async () => (await deliveries(o.email)).length, { timeout: 15000 }).toBe(1);
});

test("4. delayed webhook: a payment Razorpay already captured is found, delivered once, and no reminder is sent", async () => {
  const o = await order("delayed");
  await setPayment(o.razorpayOrderId, "captured"); // no verify, no webhook yet
  const r = await run(o.t0 + 31 * MIN);
  expect(r.recovered).toBeGreaterThanOrEqual(1);
  expect(await reminders(o.email)).toHaveLength(0);
  expect(await deliveries(o.email)).toHaveLength(1);
  await run(o.t0 + 36 * MIN);
  await run(o.t0 + 24 * HOUR + MIN);
  expect(await deliveries(o.email)).toHaveLength(1); // no duplicate delivery
  expect(await reminders(o.email)).toHaveLength(0);
});

test("5. a payment in progress, or a Razorpay lookup failure, blocks the reminder until it's resolved", async () => {
  const a = await order("inprogress");
  const pay = await setPayment(a.razorpayOrderId, "authorized");
  await run(a.t0 + 31 * MIN);
  expect(await reminders(a.email)).toHaveLength(0);
  await setPayment(a.razorpayOrderId, "failed", pay); // the attempt failed in the end
  await run(a.t0 + 36 * MIN);
  expect(await reminders(a.email)).toHaveLength(1);

  const b = await order("lookupfail");
  await mock.post("/__control/order-lookup-fail", { data: { orderId: b.razorpayOrderId, on: true } });
  const r = await run(b.t0 + 31 * MIN);
  expect(r.skipped).toBeGreaterThanOrEqual(1);
  expect(await reminders(b.email)).toHaveLength(0);
  await mock.post("/__control/order-lookup-fail", { data: { orderId: b.razorpayOrderId, on: false } });
  await run(b.t0 + 36 * MIN);
  expect(await reminders(b.email)).toHaveLength(1);
});

test("6. a failed reminder email is recorded and retried on the next run, then sent once", async () => {
  const o = await order("emailfail");
  await mock.post("/__control/email-fail", { data: { to: o.email, count: 1 } });
  const r = await run(o.t0 + 31 * MIN);
  expect(r.failed).toBeGreaterThanOrEqual(1);
  expect(await reminders(o.email)).toHaveLength(0);
  await run(o.t0 + 36 * MIN);
  expect(await reminders(o.email)).toHaveLength(1);
  await run(o.t0 + 41 * MIN);
  expect(await reminders(o.email)).toHaveLength(1);
});

test("7. individual email from the admin: preview, confirmation, one send, no duplicates", async () => {
  const o = await order("manual");
  const at = o.t0 + 20 * MIN;
  const preview = await (await adminPost({ action: "preview", one: o.orderId }, at)).text();
  expect(preview).toContain("Confirm: send 1 reminder email(s)");
  expect(preview).toContain("Still interested in Zero to First Client?");
  expect(preview).toContain(o.email);
  const { fields } = previewForm(preview);
  expect(fields.map(([k]) => k)).toEqual(["ids", "preview_exp", "preview_sig"]);
  expect(await (await postForm([["action", "send"], ...fields], at)).text()).toContain("tick the confirmation box");
  expect(await reminders(o.email)).toHaveLength(0);
  const sent = await (await postForm([["action", "send"], ["confirm", "yes"], ...fields], at)).text();
  expect(sent).toContain("1 sent");
  const mails = await reminders(o.email);
  expect(mails).toHaveLength(1);
  expect(mails[0].text).toContain("reminder 1 of 2"); // manual emails count toward the 2 per checkout
  const again = await (await postForm([["action", "send"], ["confirm", "yes"], ...fields], at)).text();
  expect(again).toContain("0 sent");
  await run(o.t0 + 31 * MIN); // the automatic 1st reminder respects the 12-hour gap
  expect(await reminders(o.email)).toHaveLength(1);
});

test("8. bulk: select all eligible, preview with count, concurrent submissions send each email once", async () => {
  const list = [await order("bulk-a"), await order("bulk-b"), await order("bulk-c")];
  const at = list[2].t0 + 20 * MIN;
  const preview = await (await adminPost({ action: "preview", all: "1" }, at)).text();
  expect(preview).toMatch(/Confirm: send \d+ reminder email\(s\)/);
  for (const o of list) expect(preview).toContain(o.email);
  const { fields, ids } = previewForm(preview);
  for (const o of list) expect(ids).toContain(o.orderId);
  // The exact previewed form, submitted twice at once (double click / two tabs).
  const post = () => postForm([["action", "send"], ["confirm", "yes"], ...fields], at);
  const [r1, r2] = await Promise.all([post(), post()]);
  expect(r1.status()).toBe(200);
  expect(r2.status()).toBe(200);
  for (const o of list) expect(await reminders(o.email)).toHaveLength(1);
});

test("9. WhatsApp is manual: a pre-filled wa.me link for opted-in customers only, opened from the admin page", async () => {
  const o = await order("wa", { whatsapp: true });
  const at = o.t0 + 20 * MIN;
  const page = await (await api.get(`/admin/recovery?show=all&q=${encodeURIComponent(o.email)}`, { headers: { ...auth(), "x-recovery-test-now": String(at) } })).text();
  expect(page).toContain(`/admin/recovery?whatsapp=${o.orderId}`);
  const open = (headers: Record<string, string>, when = at) => api.get(`/admin/recovery?whatsapp=${o.orderId}`, { headers: { ...auth(), "x-recovery-test-now": String(when), ...headers }, maxRedirects: 0 });
  expect((await open({ "sec-fetch-site": "cross-site" })).status()).toBe(403);
  const res = await open({ "sec-fetch-site": "same-origin" });
  expect(res.status()).toBe(303);
  const loc = res.headers()["location"];
  expect(loc.startsWith("https://wa.me/919000000001?text=")).toBe(true);
  expect(decodeURIComponent(loc.split("?text=")[1])).toBe(
    "Hi! You recently started checkout for ZERO TO FIRST CLIENT by CRAFT & CODE. Your checkout wasn't completed. If you're still interested, you can continue here: https://craftandcode.tech\n\nNeed any help? Just reply to this message.",
  );
  // Once per address: a day after it was first opened, the link is gone.
  expect((await open({ "sec-fetch-site": "same-origin" }, Date.now() + 25 * HOUR)).status()).toBe(404);
  // No WhatsApp consent → no link.
  const e = await order("wa-none");
  expect((await api.get(`/admin/recovery?whatsapp=${e.orderId}`, { headers: { ...auth(), "x-recovery-test-now": String(at) }, maxRedirects: 0 })).status()).toBe(404);
  expect(await reminders(o.email)).toHaveLength(0); // WhatsApp-only consent: no emails
});

test("10. authorization: admin pages and actions, and the scheduler's signed call", async () => {
  expect((await api.get("/admin/recovery")).status()).toBe(401);
  expect((await api.post("/admin/recovery", { form: { action: "automation-off", confirm: "yes" } })).status()).toBe(401);
  expect((await api.post("/admin/recovery", { headers: { ...auth(), origin: "https://evil.example" }, form: { action: "automation-off", confirm: "yes" } })).status()).toBe(403);
  const page = await api.get("/admin/recovery", { headers: auth() });
  expect(page.status()).toBe(200);
  expect(page.headers()["content-security-policy"]).toContain("default-src 'none'");
  expect(await page.text()).not.toContain(TEST_RECOVERY_SECRET);

  const call = (headers: Record<string, string>) => api.post("/api/recovery/run", { headers });
  expect((await call({})).status()).toBe(401);
  expect((await call(signed({ secret: "wrong-secret-wrong-secret-wrong-secret" }))).status()).toBe(401);
  expect((await call(signed({ ts: Math.floor(Date.now() / 1000) - 600 }))).status()).toBe(401);
  expect((await api.get("/api/recovery/run")).status()).toBe(405);
  const once = signed();
  expect((await run(Date.now(), once)).status).not.toBe("error");
  const replay = await run(Date.now(), once);
  expect(replay).toMatchObject({ status: "skipped", note: "replayed request" });

  expect((await api.get("/api/recovery/watchdog")).status()).toBe(401);
  expect((await api.get("/api/recovery/watchdog", { headers: { authorization: "Bearer nope" } })).status()).toBe(401);
  const wd = await api.get("/api/recovery/watchdog", { headers: { authorization: `Bearer ${TEST_CRON_SECRET}` } });
  expect(wd.status()).toBe(200);
});

test("11. the resume endpoint is rate-limited per IP", async () => {
  let last = 0;
  for (let i = 0; i < 11; i++) last = (await api.post("/api/recovery/resume", { data: { token: "x".repeat(43) } })).status();
  expect(last).toBe(429);
});

test("12. pause, resume and disable automation", async () => {
  const o = await order("pause");
  expect(await (await adminPost({ action: "pause", hours: "24", confirm: "yes" })).text()).toContain("Reminders paused until");
  expect(await run(o.t0 + 31 * MIN)).toMatchObject({ status: "skipped", note: "reminders are paused" });
  expect(await reminders(o.email)).toHaveLength(0);
  await adminPost({ action: "resume", confirm: "yes" });
  await run(o.t0 + 32 * MIN);
  expect(await reminders(o.email)).toHaveLength(1);
  await adminPost({ action: "automation-off", confirm: "yes" });
  expect(await run(o.t0 + 24 * HOUR + MIN)).toMatchObject({ status: "skipped", note: "automation is off" });
  expect(await reminders(o.email)).toHaveLength(1);
  await adminPost({ action: "automation-on", confirm: "yes" });
});

test("13. the dashboard warns when the scheduler stops, and shows the metrics and history", async () => {
  await run(Date.now());
  const fresh = await (await api.get("/admin/recovery", { headers: auth() })).text();
  expect(fresh).not.toContain("No scheduler run in the last 15 minutes");
  for (const label of ["Pending checkouts", "Eligible customers", "Emails sent", "Emails failed", "Recovered orders", "Potential revenue", "Recovery conversion", "Follow-up history", "Scheduler log", "Disable automation", "Select all eligible"]) expect(fresh).toContain(label);
  const later = await (await api.get("/admin/recovery", { headers: { ...auth(), "x-recovery-test-now": String(Date.now() + 2 * HOUR) } })).text();
  expect(later).toContain("No scheduler run in the last 15 minutes");
});

test("14. unsubscribe: the link page doesn't unsubscribe by itself; one-click does; no further reminders", async () => {
  const o = await order("unsub");
  await run(o.t0 + 31 * MIN);
  const [m] = await reminders(o.email);
  const link = unsubscribeLink(m.text);
  expect(link).not.toBeNull();
  const page = await api.get(link![1]); // the fragment isn't sent: the server never sees the token
  expect(page.status()).toBe(200);
  expect(await page.text()).toContain("Unsubscribe</button>");
  const url = oneClickUrl(m);
  expect(url).toContain(`?t=${link![2]}`); // one-click carries the same token, in the query
  // A GET of the one-click URL (some mail apps open it in a browser) only shows the page.
  expect(await (await api.get(url)).text()).toContain("Unsubscribe</button>");
  const oneClick = await api.post(url, { form: { "List-Unsubscribe": "One-Click" } });
  expect(oneClick.status()).toBe(200);
  expect(await oneClick.text()).toBe("unsubscribed");
  await run(o.t0 + 24 * HOUR + MIN);
  expect(await reminders(o.email)).toHaveLength(1);
  expect((await api.get("/api/recovery/unsubscribe?t=bad")).status()).toBe(400);
  expect((await api.post(`/api/recovery/unsubscribe?t=${"a".repeat(43)}`, { form: { x: "1" } })).status()).toBe(400);
});

test("15. Continue checkout: the link prefills, a new order is linked, and the link stops working after purchase", async () => {
  const o = await order("resume");
  await run(o.t0 + 31 * MIN);
  const token = resumeToken((await reminders(o.email))[0].text);
  const res = await api.post("/api/recovery/resume", { data: { token } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ name: "Asha Verma", email: o.email, phone: MOBILE });
  expect((await api.post("/api/recovery/resume", { data: { token: "b".repeat(43) } })).status()).toBe(404);
  const again = await order("resume", { email: false }, { email: o.email, resumeToken: token });
  await payAndVerify(again);
  expect((await api.post("/api/recovery/resume", { data: { token } })).status()).toBe(404);
  const dash = await (await api.get(`/admin/recovery?show=all&q=${encodeURIComponent(o.email)}`, { headers: auth() })).text();
  const recovered = Number(/Recovered orders<\/div><div class="v">(\d+)/.exec(dash)?.[1] ?? 0);
  expect(recovered).toBeGreaterThanOrEqual(1);
  await run(o.t0 + 24 * HOUR + MIN);
  expect(await reminders(o.email)).toHaveLength(1); // bought: no 2nd reminder
});

test("16. checkout dialog: opt-in boxes start unticked; a resume link opens it prefilled", async ({ page }) => {
  // Three page loads, two lazy-loaded dialogs and a server-side reminder pass: same budget as the
  // other browser checkout tests (commerce.spec.ts "checkout in the browser").
  test.setTimeout(90_000);
  // The test only needs the page's own HTML and scripts, not the 3D book, images or fonts, so it
  // waits for DOMContentLoaded and then for the specific elements it uses (auto-waiting expects).
  const open = (path: string) => page.goto(`${COMMERCE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip() });
  await page.route("https://checkout.razorpay.com/v1/checkout.js", (r) =>
    r.fulfill({ contentType: "application/javascript", body: `window.Razorpay=function(o){this.o=o};Razorpay.prototype.on=function(){};Razorpay.prototype.open=function(){setTimeout(()=>this.o.modal.ondismiss(),100)};` }),
  );
  // A normal checkout: boxes unticked; ticking the email box records consent.
  await open("/#pricing");
  // The on-site checkout button appears once /api/checkout/config has answered.
  const buy = page.locator('#pricing [data-checkout="razorpay"]');
  await expect(buy).toBeVisible({ timeout: 20000 });
  await buy.click();
  const dialog = page.getByTestId("checkout-dialog");
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await expect(dialog.getByTestId("consent-email")).not.toBeChecked();
  await expect(dialog.getByTestId("consent-whatsapp")).not.toBeChecked();
  const email = newEmail("ui");
  await dialog.locator('input[name="name"]').fill("Ravi Kumar");
  await dialog.locator('input[name="email"]').fill(email);
  await dialog.locator('input[name="phone"]').fill(MOBILE);
  await dialog.getByTestId("consent-email").check();
  const t0 = Date.now();
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByTestId("checkout-error")).toContainText("cancelled", { timeout: 20000 });
  await run(t0 + 31 * MIN);
  const [mail] = await reminders(email);
  expect(mail.text).toContain("Hi Ravi,");

  // The reminder's link opens the dialog prefilled, boxes still unticked, token removed from the address bar.
  await page.goto("about:blank"); // a hash-only change wouldn't reload the page
  await open(`/#resume=${resumeToken(mail.text)}`);
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await expect(dialog.getByTestId("resume-note")).toContainText("Welcome back");
  await expect(dialog.locator('input[name="email"]')).toHaveValue(email);
  await expect(dialog.locator('input[name="name"]')).toHaveValue("Ravi Kumar");
  await expect(dialog.locator('input[name="phone"]')).toHaveValue(MOBILE);
  await expect(dialog.getByTestId("consent-email")).not.toBeChecked();
  expect(new URL(page.url()).hash).toBe("#pricing");

  await page.goto("about:blank");
  await open(`/#resume=${"c".repeat(43)}`);
  await expect(page.getByTestId("resume-note")).toContainText("expired", { timeout: 20000 });
});

test("17. the Privacy Policy describes the opt-in reminders (English and Hindi)", async () => {
  const en = await (await api.get("/privacy")).text();
  expect(en).toContain("only if you opted in at checkout");
  expect(en).toContain("8 November 2026");
  const hi = await (await api.get("/hi/privacy")).text();
  expect(hi).toContain("सिर्फ़ तब, जब आपने checkout पर चुना हो");
});

/* ── Regression tests for the security-review fixes ─────────────────────── */

test("18. [H1] at most 2 reminder emails per checkout, manual ones included", async () => {
  const o = await order("percheckout");
  await run(o.t0 + 31 * MIN); // 1st automatic reminder
  expect(await reminders(o.email)).toHaveLength(1);
  const at = o.t0 + 12 * HOUR + 45 * MIN; // more than 12 h later: a manual send is allowed
  const { fields } = previewForm(await (await adminPost({ action: "preview", one: o.orderId }, at)).text());
  expect(await (await postForm([["action", "send"], ["confirm", "yes"], ...fields], at)).text()).toContain("1 sent");
  const mails = await reminders(o.email);
  expect(mails).toHaveLength(2);
  expect(mails[1].text).toContain("reminder 2 of 2");
  const later = o.t0 + 25 * HOUR + 30 * MIN; // the 2nd automatic reminder would be due, 12 h after the manual one
  await run(later);
  expect(await reminders(o.email)).toHaveLength(2);
  const page = await (await api.get(`/admin/recovery?show=all&q=${encodeURIComponent(o.email)}`, { headers: { ...auth(), "x-recovery-test-now": String(later) } })).text();
  expect(page).toContain("2 reminders already sent for this checkout");
});

test("19. [M1/M2] a stop request recorded by the admin blocks reminder emails and WhatsApp", async () => {
  const o = await order("stop", { email: true, whatsapp: true });
  const at = o.t0 + 20 * MIN;
  const dashboard = async () => (await api.get(`/admin/recovery?show=all&q=${encodeURIComponent(o.email)}`, { headers: { ...auth(), "x-recovery-test-now": String(at) } })).text();
  expect(await dashboard()).toContain(`?whatsapp=${o.orderId}`);
  expect(await (await adminPost({ action: "stop", email: "not-an-email", confirm: "yes" })).text()).toContain("Enter a valid email address");
  expect(await (await adminPost({ action: "stop", email: o.email })).text()).toContain("tick the confirmation box");
  expect(await (await adminPost({ action: "stop", email: `  ${o.email.toUpperCase()} `, confirm: "yes" })).text()).toContain("no more reminder emails or WhatsApp");
  const after = await dashboard();
  expect(after).not.toContain(`?whatsapp=${o.orderId}`);
  expect(after).toContain("stop request recorded (all channels)"); // shown as Stopped (admin), not Unsubscribed (link)
  expect((await api.get(`/admin/recovery?whatsapp=${o.orderId}`, { headers: { ...auth(), "sec-fetch-site": "same-origin", "x-recovery-test-now": String(at) }, maxRedirects: 0 })).status()).toBe(404);
  expect(await (await adminPost({ action: "preview", one: o.orderId }, at)).text()).toContain("None of the selected checkouts can be emailed");
  await run(o.t0 + 31 * MIN);
  await run(o.t0 + 24 * HOUR + MIN);
  expect(await reminders(o.email)).toHaveLength(0);
});

test("20. [M3] a manual send and a scheduler run at the same moment email a customer only once", async () => {
  for (const tag of ["race-a", "race-b", "race-c"]) {
    const o = await order(tag);
    const at = o.t0 + 31 * MIN; // both the automatic 1st reminder and a manual one are possible now
    const { fields } = previewForm(await (await adminPost({ action: "preview", one: o.orderId }, at)).text());
    const [manual] = await Promise.all([postForm([["action", "send"], ["confirm", "yes"], ...fields], at), run(at)]);
    expect(manual.status()).toBe(200);
    expect(await reminders(o.email)).toHaveLength(1);
  }
});

test("21. [M4] runs and manual sends stop starting sends once their time budget is used", async () => {
  const o = await order("budget");
  const r = await run(o.t0 + 31 * MIN, { ...signed(), "x-recovery-test-budget-ms": "0" });
  expect(r).toMatchObject({ sent: 0, note: "time budget reached; the rest continue next run" });
  const at = o.t0 + 32 * MIN;
  const { fields } = previewForm(await (await adminPost({ action: "preview", one: o.orderId }, at)).text());
  const res = await (await postForm([["action", "send"], ["confirm", "yes"], ...fields], at, { "x-recovery-test-budget-ms": "0" })).text();
  expect(res).toContain("not sent yet: time limit");
  expect(await reminders(o.email)).toHaveLength(0);
  await run(o.t0 + 33 * MIN); // next run, normal budget: sent
  expect(await reminders(o.email)).toHaveLength(1);
});

test("22. [L1] a bulk send is refused unless it matches a fresh preview", async () => {
  const a = await order("l1-a");
  const b = await order("l1-b");
  const at = b.t0 + 20 * MIN;
  const refused = "open the preview first";
  expect(await (await postForm([["action", "send"], ["confirm", "yes"], ["ids", a.orderId]], at)).text()).toContain(refused);
  const { fields } = previewForm(await (await adminPost({ action: "preview", one: a.orderId }, at)).text());
  const send = (f: [string, string][], when = at) => postForm([["action", "send"], ["confirm", "yes"], ...f], when).then((r) => r.text());
  expect(await send([...fields, ["ids", b.orderId]])).toContain(refused); // recipient added after the preview
  expect(await send(fields.map(([k, v]) => [k, k === "preview_sig" ? "0".repeat(64) : v] as [string, string]))).toContain(refused); // forged
  expect(await send(fields, at + 16 * MIN)).toContain(refused); // preview expired
  expect(await reminders(a.email)).toHaveLength(0);
  expect(await reminders(b.email)).toHaveLength(0);
  expect(await send(fields)).toContain("1 sent"); // the genuine preview still works
  expect(await reminders(b.email)).toHaveLength(0);
});

test("23. [L2] a retry after a lost provider response doesn't deliver the reminder twice", async () => {
  const o = await order("l2");
  await mock.post("/__control/email-accept-fail", { data: { to: o.email, count: 1 } });
  const r1 = await run(o.t0 + 31 * MIN);
  expect(r1.failed).toBeGreaterThanOrEqual(1);
  const first = await reminders(o.email);
  expect(first).toHaveLength(1); // the provider delivered it, but we saw an error
  expect(first[0].key).toMatch(/^rcv-ord_[a-f0-9]{24}-auto_1$/);
  await run(o.t0 + 36 * MIN); // retry: identical email, same idempotency key
  expect(await reminders(o.email)).toHaveLength(1);
  const dedupes = (await (await mock.get(`/__control/dedupes?to=${encodeURIComponent(o.email)}`)).json()) as { key: string }[];
  expect(dedupes.map((d) => d.key)).toEqual([first[0].key]);
  await run(o.t0 + 41 * MIN); // recorded as sent now: nothing further
  expect(await reminders(o.email)).toHaveLength(1);
  expect((await (await mock.get(`/__control/dedupes?to=${encodeURIComponent(o.email)}`)).json()) as unknown[]).toHaveLength(1);
});

test("24. [L5/M1] unsubscribing from the email link never puts the token in a URL, and stops WhatsApp too", async ({ page }) => {
  const o = await order("l5", { email: true, whatsapp: true });
  await run(o.t0 + 31 * MIN);
  const [m] = await reminders(o.email);
  const link = unsubscribeLink(m.text)!;
  expect(link).not.toBeNull();
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.goto(link[1]);
  expect(page.url()).not.toContain(link[2]); // removed from the address bar
  await page.getByRole("button", { name: "Unsubscribe" }).click(); // the form only appears if the CSP-hashed script ran
  await expect(page.locator("main")).toContainText("You're unsubscribed");
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.filter((u) => u.includes(link[2]))).toEqual([]);
  const at = o.t0 + 40 * MIN;
  expect((await api.get(`/admin/recovery?whatsapp=${o.orderId}`, { headers: { ...auth(), "sec-fetch-site": "same-origin", "x-recovery-test-now": String(at) }, maxRedirects: 0 })).status()).toBe(404);
  await run(o.t0 + 24 * HOUR + MIN);
  expect(await reminders(o.email)).toHaveLength(1);
});

test("25. [review] a stop request also blocks WhatsApp for a WhatsApp-only customer", async () => {
  const o = await order("wa-only-stop", { whatsapp: true });
  const at = o.t0 + 20 * MIN;
  const dashboard = async () => (await api.get(`/admin/recovery?show=all&q=${encodeURIComponent(o.email)}`, { headers: { ...auth(), "x-recovery-test-now": String(at) } })).text();
  expect(await dashboard()).toContain(`?whatsapp=${o.orderId}`);
  expect(await (await adminPost({ action: "stop", email: o.email, confirm: "yes" })).text()).toContain("no more reminder emails or WhatsApp");
  expect(await dashboard()).not.toContain(`?whatsapp=${o.orderId}`);
  const res = await api.get(`/admin/recovery?whatsapp=${o.orderId}`, { headers: { ...auth(), "sec-fetch-site": "same-origin", "x-recovery-test-now": String(at) }, maxRedirects: 0 });
  expect(res.status()).toBe(404);
  expect(res.headers()["location"]).toBeUndefined();
});

test("26. [review] the greeting uses the typed name only when it looks like a name", async () => {
  const cases: [string, string][] = [
    ["Asha Verma", "Hi Asha,"],
    ["José-María López", "Hi José-María,"],
    ["राहुल शर्मा", "Hi राहुल,"],
    ["evil.com promo", "Hi,"],
    ["Win₹500 now", "Hi,"],
    ["Asha2 Verma", "Hi,"],
  ];
  for (const [name, greeting] of cases) {
    const email = newEmail("name");
    const t0 = Date.now();
    const res = await api.post("/api/checkout/create-order", { data: { name, email, phone: MOBILE, locale: "en", remindEmail: true }, headers: { "x-forwarded-for": ip() } });
    expect(res.status()).toBe(201);
    await run(t0 + 31 * MIN);
    const [m] = await reminders(email);
    expect(m.text.split("\n")[0]).toBe(greeting);
    expect(m.html).not.toContain("evil.com");
  }
});

test("27. [review] one network address can record reminder consent for at most 3 checkouts an hour", async () => {
  const shared = { "x-forwarded-for": ip() };
  const made: { email: string; t0: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const email = newEmail(`iplimit-${i}`);
    const t0 = Date.now();
    const res = await api.post("/api/checkout/create-order", { data: { name: "Asha Verma", email, phone: MOBILE, locale: "en", remindEmail: true }, headers: shared });
    expect(res.status()).toBe(201); // checkout itself is never blocked by this limit
    made.push({ email, t0 });
  }
  await run(made[3].t0 + 31 * MIN);
  for (const m of made.slice(0, 3)) expect(await reminders(m.email)).toHaveLength(1);
  expect(await reminders(made[3].email)).toHaveLength(0); // 4th opt-in from the same address wasn't recorded
});

/* ── Channel eligibility (email and WhatsApp are independent) ──────────── */

/** The dashboard row for one order, and its Email / WhatsApp cells. */
async function channelRow(o: Created, at: number) {
  const html = await (await api.get(`/admin/recovery?show=all&q=${encodeURIComponent(o.email)}`, { headers: { ...auth(), "x-recovery-test-now": String(at) } })).text();
  const row = html.split("<tr>").find((r) => r.includes(`id=${o.orderId}"`)) ?? "";
  const cell = (ch: string) => new RegExp(`data-channel="${ch}">([\\s\\S]*?)</td>`).exec(row)?.[1] ?? "";
  return { row, email: cell("email"), wa: cell("whatsapp") };
}

test("28. each channel shows its own status: consent on one channel never enables the other", async () => {
  const emailOnly = await order("ch-email", { email: true });
  const waOnly = await order("ch-wa", { whatsapp: true });
  const both = await order("ch-both", { email: true, whatsapp: true });
  const none = await order("ch-none", {}); // like an order placed before the opt-in boxes existed
  const at = none.t0 + 20 * MIN;

  const e = await channelRow(emailOnly, at);
  expect(e.email).toContain("Email eligible");
  expect(e.wa).toContain("Consent required");
  expect(e.wa).toContain("customer didn&#39;t opt in to WhatsApp");
  expect(e.row).not.toContain("?whatsapp=");
  expect(e.row).not.toContain(">Email + WhatsApp<");
  expect(e.row).toContain(`?consent=${emailOnly.orderId}`);

  const w = await channelRow(waOnly, at);
  expect(w.email).toContain("Consent required");
  expect(w.email).toContain("customer didn&#39;t opt in to email reminders");
  expect(w.wa).toContain("WhatsApp eligible");
  expect(w.wa).toContain(`?whatsapp=${waOnly.orderId}`);
  expect(w.email).not.toContain('name="one"');

  const b = await channelRow(both, at);
  expect(b.email).toContain("Email eligible");
  expect(b.wa).toContain("WhatsApp eligible");
  expect(b.row).toContain(`name="both" value="${both.orderId}"`);
  expect(b.row).not.toContain("?consent=");

  const n = await channelRow(none, at);
  expect(n.email).toContain("Consent required");
  expect(n.wa).toContain("Consent required");
  expect(n.row).not.toContain('name="one"');
  expect(n.row).not.toContain("?whatsapp=");
  expect(n.row).toContain(`?consent=${none.orderId}`); // shown, not silently hidden
  expect((await api.get(`/admin/recovery?whatsapp=${none.orderId}`, { headers: { ...auth(), "sec-fetch-site": "same-origin", "x-recovery-test-now": String(at) }, maxRedirects: 0 })).status()).toBe(404);
  await run(none.t0 + 31 * MIN);
  expect(await reminders(none.email)).toHaveLength(0);
  expect(await reminders(waOnly.email)).toHaveLength(0); // WhatsApp consent never enables email
  expect(await reminders(emailOnly.email)).toHaveLength(1);
});

test("29. stop requests per channel: an email stop leaves WhatsApp, a WhatsApp stop leaves email", async () => {
  const a = await order("stop-email", { email: true, whatsapp: true });
  const b = await order("stop-wa", { email: true, whatsapp: true });
  const at = b.t0 + 20 * MIN;
  expect(await (await adminPost({ action: "stop", email: a.email, scope: "email", confirm: "yes" })).text()).toContain("no more reminder emails to that address");
  expect(await (await adminPost({ action: "stop", email: b.email, scope: "whatsapp", confirm: "yes" })).text()).toContain("no more WhatsApp follow-ups to that address");
  const ra = await channelRow(a, at);
  expect(ra.email).toContain("Stopped");
  expect(ra.email).toContain("email stop request recorded");
  expect(ra.wa).toContain("WhatsApp eligible");
  const rb = await channelRow(b, at);
  expect(rb.wa).toContain("Stopped");
  expect(rb.wa).toContain("WhatsApp stop request recorded");
  expect(rb.email).toContain("Email eligible");
  const open = (o: Created) => api.get(`/admin/recovery?whatsapp=${o.orderId}`, { headers: { ...auth(), "sec-fetch-site": "same-origin", "x-recovery-test-now": String(at) }, maxRedirects: 0 });
  expect((await open(a)).status()).toBe(303);
  expect((await open(b)).status()).toBe(404);
  await run(b.t0 + 31 * MIN);
  expect(await reminders(a.email)).toHaveLength(0);
  expect(await reminders(b.email)).toHaveLength(1);
});

test("30. the unsubscribe link marks both channels Unsubscribed; a global admin stop marks both Stopped", async () => {
  const u = await order("unsub-both", { email: true, whatsapp: true });
  await run(u.t0 + 31 * MIN);
  const [m] = await reminders(u.email);
  expect((await api.post(oneClickUrl(m), { form: { "List-Unsubscribe": "One-Click" } })).status()).toBe(200);
  const ru = await channelRow(u, u.t0 + 40 * MIN);
  expect(ru.email).toContain("Unsubscribed");
  expect(ru.wa).toContain("Unsubscribed");
  const g = await order("global-stop", { email: true, whatsapp: true });
  await adminPost({ action: "stop", email: g.email, scope: "all", confirm: "yes" });
  const rg = await channelRow(g, g.t0 + 20 * MIN);
  expect(rg.email).toContain("Stopped");
  expect(rg.wa).toContain("Stopped");
});

test("31. recording consent: per channel, with source and evidence, server time only, never for paid orders", async () => {
  const o = await order("record", {});
  const page = await (await api.get(`/admin/recovery?consent=${o.orderId}`, { headers: auth() })).text();
  expect(page).toContain("Record consent for Asha Verma");
  expect(page).toContain("admin-whatsapp-2026-11-08.v1");
  expect(page).not.toMatch(/type="(date|datetime-local|time)"/); // no way to choose a date
  const record = (f: Record<string, string>) => adminPost({ action: "record-consent", id: o.orderId, channel: "whatsapp", source: "whatsapp_message", evidence: "WhatsApp 8 Nov: please send me the link here", ...f });
  expect(await (await record({})).text()).toContain("tick the confirmation box");
  expect(await (await record({ confirm: "yes", evidence: "hi" })).text()).toContain("5–300 characters");
  expect(await (await record({ confirm: "yes", source: "guess" })).text()).toContain("Choose how the customer gave consent");
  const ok = await (await record({ confirm: "yes", recorded_at: "2020-01-01T00:00:00Z" })).text(); // an extra date field is ignored
  expect(ok).toContain("Consent for WhatsApp recorded at");
  expect(ok).toContain("by admin");
  expect(await (await record({ confirm: "yes" })).text()).toContain("already has consent for that channel");
  const r = await channelRow(o, o.t0 + 20 * MIN);
  expect(r.wa).toContain("WhatsApp eligible");
  expect(r.email).toContain("Consent required"); // WhatsApp consent doesn't enable email
  await run(o.t0 + 31 * MIN);
  expect(await reminders(o.email)).toHaveLength(0);

  const paid = await order("record-paid", {});
  await payAndVerify(paid);
  expect(await (await api.get(`/admin/recovery?consent=${paid.orderId}`, { headers: auth() })).text()).toContain("checkout recovery doesn&#39;t apply");
  expect(await (await adminPost({ action: "record-consent", id: paid.orderId, channel: "email", source: "email_reply", evidence: "Customer replied by email", confirm: "yes" })).text()).toContain("Not recorded: this order is paid");
});

test("32. Email + WhatsApp only when both channels are eligible; WhatsApp stays a manual button", async () => {
  const both = await order("combo", { email: true, whatsapp: true });
  const emailOnly = await order("combo-email", { email: true });
  const at = emailOnly.t0 + 20 * MIN;
  expect(await (await adminPost({ action: "preview", both: emailOnly.orderId }, at)).text()).toContain("needs both channels to be eligible");
  const preview = await (await adminPost({ action: "preview", both: both.orderId }, at)).text();
  expect(preview).toContain("after the email is sent, the results page shows a WhatsApp button");
  const { fields } = previewForm(preview);
  expect(fields.map(([k]) => k)).toContain("with_wa");
  const results = await (await postForm([["action", "send"], ["confirm", "yes"], ...fields], at)).text();
  expect(results).toContain("1 sent");
  expect(results).toContain(`/admin/recovery?whatsapp=${both.orderId}`);
  expect(await reminders(both.email)).toHaveLength(1);
});

test("33. paid customers show Paid on both channels; stops are re-checked right before sending", async () => {
  const early = await order("paid-later", { email: true, whatsapp: true });
  const later = await order("paid-later", { email: false }, { email: early.email });
  await payAndVerify(later);
  const r = await channelRow(early, early.t0 + 20 * MIN);
  expect(r.email).toContain("Paid");
  expect(r.wa).toContain("Paid");
  expect(r.row).not.toContain("?whatsapp=");

  const o = await order("recheck", { email: true, whatsapp: true });
  const at = o.t0 + 20 * MIN;
  const { fields } = previewForm(await (await adminPost({ action: "preview", one: o.orderId }, at)).text());
  await adminPost({ action: "stop", email: o.email, scope: "email", confirm: "yes" }); // after the preview, before sending
  const res = await (await postForm([["action", "send"], ["confirm", "yes"], ...fields], at)).text();
  expect(res).toContain("0 sent");
  expect(res).toContain("email stop request recorded");
  expect(await reminders(o.email)).toHaveLength(0);
});
