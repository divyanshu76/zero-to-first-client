import { expect, request as pwRequest, test } from "@playwright/test";
import { ADMIN, COMMERCE_URL } from "./commerce/env";

/**
 * Admin layout at phone, tablet, laptop and desktop widths, on every admin page.
 * Guards against the "tiny, zoomed-out admin on a phone" problem: any element wider than the
 * viewport makes mobile browsers shrink the whole page.
 */
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, "admin tests need the local commerce server");

const PAGES = ["/admin/orders", "/admin/orders?view=orders", "/admin/customers", "/admin/payments", "/admin/ebook", "/admin/email", "/admin/recovery"];
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
let detailPath = "";

test.beforeAll(async () => {
  // One real (mock) order, so tables, the order page and the consent page have content.
  const api = await pwRequest.newContext({ baseURL: COMMERCE_URL, extraHTTPHeaders: { "x-forwarded-for": `10.88.${Math.floor(Math.random() * 250)}.1` } });
  const res = await api.post("/api/checkout/create-order", { data: { name: "Layout Check Customer With A Long Name", email: `layout-${Date.now()}@buyers.test`, phone: "9000000001", locale: "en" } });
  const { orderId } = (await res.json()) as { orderId: string };
  detailPath = `/admin/orders?view=orders&id=${orderId}`;
  await api.dispose();
});

for (const width of WIDTHS) {
  test(`admin pages fit and stay readable at ${width}px`, async ({ browser }) => {
    test.setTimeout(90_000);
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, httpCredentials: { username: ADMIN.user, password: ADMIN.pass } });
    const page = await context.newPage();
    for (const path of [...PAGES, detailPath]) {
      const res = await page.goto(`${COMMERCE_URL}${path}`);
      expect(res?.status(), path).toBe(200);
      const m = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        // Elements outside the viewport that no scrolling/clipping ancestor contains.
        const escapes = [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || (r.right <= W + 1 && r.left >= -1)) return false;
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(a).overflowX)) return false;
            return true;
          })
          .map((el) => `${el.tagName}.${el.className}`.slice(0, 60));
        const texts = [...document.querySelectorAll<HTMLElement>("main *, aside *, header *")].filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) && el.getBoundingClientRect().width > 0);
        const minFont = Math.min(...texts.map((el) => parseFloat(getComputedStyle(el).fontSize)));
        const buttons = [...document.querySelectorAll<HTMLElement>(".btn, .nav a, button, select, input:not([type=checkbox]):not([type=hidden])")].filter((el) => el.getBoundingClientRect().width > 0);
        const minTap = Math.min(...buttons.map((el) => el.getBoundingClientRect().height));
        const cards = [...document.querySelectorAll<HTMLElement>(".grid > .card")].map((el) => el.getBoundingClientRect().width);
        const wrap = document.querySelector<HTMLElement>(".wrap")?.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth - W, escapes: [...new Set(escapes)].slice(0, 5), minFont, minTap, cards, wrapWidth: wrap?.width ?? 0, W, bodyFont: parseFloat(getComputedStyle(document.body).fontSize) };
      });
      expect(m.escapes, `${path}: elements escaping the viewport`).toEqual([]);
      expect(m.overflow, `${path}: page wider than the viewport`).toBeLessThanOrEqual(0);
      expect(m.minFont, `${path}: text too small`).toBeGreaterThanOrEqual(12);
      if (mobile) {
        expect(m.bodyFont, `${path}: base text size on phones`).toBeGreaterThanOrEqual(15);
        expect(m.minTap, `${path}: controls too small to tap`).toBeGreaterThanOrEqual(40);
        // Stat cards stack: one per row on phones.
        for (const w of m.cards) expect(w, `${path}: stat cards should stack`).toBeGreaterThanOrEqual(m.wrapWidth - 48);
      } else {
        expect(m.minTap, `${path}: controls too small`).toBeGreaterThanOrEqual(34);
      }
      // Large screens: content is a centred, readable column, not a stretched strip.
      if (width >= 1440) expect(m.wrapWidth, `${path}: content too wide on large screens`).toBeLessThanOrEqual(1440);
    }
    await context.close();
  });
}
