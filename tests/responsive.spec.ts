import { expect, test, type Page } from "@playwright/test";

/**
 * Guards against horizontal overflow. On iOS Safari, any element wider than the
 * viewport makes the browser zoom the page out to fit it, which squeezes the whole
 * site into a narrow column with blank space on the right. Browser zoom changes the
 * effective CSS viewport width, so the zoom cases below are covered by testing at
 * base width ÷ zoom with a matching device pixel ratio.
 */

type Case = { name: string; width: number; height: number; dpr?: number; mobile?: boolean };

const devicesMatrix: Case[] = [
  { name: "mobile-320", width: 320, height: 640, mobile: true },
  { name: "android-360", width: 360, height: 780, mobile: true },
  { name: "iphone-375", width: 375, height: 812, mobile: true },
  { name: "iphone-390", width: 390, height: 844, mobile: true },
  { name: "pixel-393", width: 393, height: 852, mobile: true },
  { name: "mobile-414", width: 414, height: 896, mobile: true },
  { name: "iphone-430", width: 430, height: 932, mobile: true },
  { name: "tablet-600", width: 600, height: 960 },
  { name: "tablet-640", width: 640, height: 960 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-912", width: 912, height: 1368 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1600", width: 1600, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-2560", width: 2560, height: 1440 },
];

const zoomLevels = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const zoomMatrix: Case[] = [1366, 1920].flatMap((base) =>
  zoomLevels.map((z) => ({
    name: `zoom-${base}@${Math.round(z * 100)}%`,
    width: Math.round(base / z),
    height: Math.round((base === 1366 ? 768 : 1080) / z),
    dpr: z,
  })),
);

async function settle(page: Page) {
  await page.waitForLoadState("load");
  // Scroll through once so lazy images and scroll-reveal content all render.
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    for (let y = 0; y < document.body.scrollHeight; y += 900) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
  });
}

/** Overflow measurements, with the body overflow safety net turned off so a real root cause can't hide behind it. */
async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const W = de.clientWidth;
    const guarded = de.scrollWidth - W;
    document.body.style.overflowX = "visible";
    const unguarded = de.scrollWidth - W;
    // Elements outside the viewport horizontally that no ancestor clips.
    const escapes = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || (r.right <= W + 1 && r.left >= -1)) return false;
        if (getComputedStyle(el).position === "fixed") return false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          if (["hidden", "clip", "auto", "scroll"].includes(getComputedStyle(a).overflowX)) return false;
        }
        return true;
      })
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 50)}`);
    document.body.style.overflowX = "";
    return { guarded, unguarded, escapes: [...new Set(escapes)].slice(0, 10), width: W };
  });
}

for (const c of [...devicesMatrix, ...zoomMatrix]) {
  test.describe(c.name, () => {
    test.use({
      viewport: { width: c.width, height: c.height },
      deviceScaleFactor: c.dpr ?? (c.mobile ? 3 : 1),
      isMobile: c.mobile ?? false,
      hasTouch: c.mobile ?? false,
    });

    test("no horizontal overflow and layout uses the viewport", async ({ page }, info) => {
      // isMobile is Chromium-only; WebKit runs the same widths without it.
      test.skip(!!c.mobile && info.project.name === "webkit", "mobile emulation is Chromium-only");
      await page.goto("/");
      await settle(page);

      const report = await overflowReport(page);
      expect(report.escapes, "elements escaping the viewport").toEqual([]);
      expect(report.unguarded, "document wider than viewport (root cause)").toBeLessThanOrEqual(0);
      expect(report.guarded).toBeLessThanOrEqual(0);

      // On mobile, an overflow-driven zoom-out shows up as a visual viewport scale below 1.
      if (c.mobile) expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);

      // The main content box should use the viewport: at least 80% of the width, or the 1280 px max.
      const container = await page.locator("#inside .container-page").first().boundingBox();
      expect(container).not.toBeNull();
      expect(container!.width).toBeGreaterThanOrEqual(Math.min(report.width, 1280) * 0.8);
      expect(container!.x + container!.width).toBeLessThanOrEqual(report.width + 1);

      // Navigation: links inline from 1024 px, the menu button below that.
      if (report.width >= 1024) await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "How it works" })).toBeVisible();
      else await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();

      // Hero CTAs are fully on screen and don't overlap.
      const buy = await page.locator("#top").getByRole("button", { name: /get instant access/i }).boundingBox();
      const explore = await page.locator("#top").getByRole("link", { name: /look inside the book/i }).boundingBox();
      for (const b of [buy, explore]) {
        expect(b).not.toBeNull();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(report.width + 1);
      }
      const overlap = !(buy!.x + buy!.width <= explore!.x || explore!.x + explore!.width <= buy!.x || buy!.y + buy!.height <= explore!.y || explore!.y + explore!.height <= buy!.y);
      expect(overlap, "hero CTAs overlap").toBe(false);
      // Side by side (from 640 px), the two CTAs share a vertical centre.
      if (Math.abs(buy!.y - explore!.y) < buy!.height) {
        expect(Math.abs(buy!.y + buy!.height / 2 - (explore!.y + explore!.height / 2)), "hero CTAs misaligned").toBeLessThanOrEqual(1);
      }

      // 3D book stage stays inside the viewport.
      const stage = await page.locator("#top .ztfc-book-stage").boundingBox();
      expect(stage).not.toBeNull();
      expect(stage!.x).toBeGreaterThanOrEqual(-1);
      expect(stage!.x + stage!.width).toBeLessThanOrEqual(report.width + 1);

      // All 9 main sections are present.
      expect(await page.locator("main > section").count()).toBe(9);

      await page.screenshot({ path: info.outputPath(`${c.name}.png`) });
    });
  });
}

test("mobile menu opens, lists every section link and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-menu");
  for (const name of ["What's inside", "Preview", "How it works", "Pricing", "FAQ"]) await expect(menu.getByRole("link", { name })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("pinch-zoom is not disabled by the viewport meta tag", async ({ page }) => {
  await page.goto("/");
  const metas = await page.locator('meta[name="viewport"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));
  expect(metas).toHaveLength(1);
  expect(metas[0]).toContain("width=device-width");
  expect(metas[0]).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/);
});

test("ticker loops seamlessly and isn't announced twice", async ({ page }) => {
  await page.goto("/");
  const track = page.locator(".ticker-track");
  await expect(track).toHaveAttribute("aria-hidden", "true");
  const halves = await track.evaluate((el) => [...el.children].map((c) => ({ text: c.textContent, w: Math.round(c.getBoundingClientRect().width) })));
  expect(halves).toHaveLength(2);
  expect(halves[0]).toEqual(halves[1]); // identical halves + a -50% loop = no visible jump
  await expect(page.locator(".ticker .sr-only")).toHaveCount(1);
  expect(await track.evaluate((el) => el.querySelectorAll("a,button,[tabindex]").length)).toBe(0);
});

test("pricing shows the ₹599 launch price against the ₹999 regular price", async ({ page }) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await expect(pricing).toContainText("₹599");
  await expect(pricing.locator("s")).toHaveText("₹999");
  await expect(pricing).toContainText("Launch offer");
  await expect(page.locator("#top")).toContainText("₹599");
});

test("every footer link resolves and policy pages render", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("footer a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs.length).toBeGreaterThanOrEqual(7);
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
  }
  await page.goto("/refund");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Refund and Cancellation Policy");
});

test("unknown routes render the 404 page", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
});
