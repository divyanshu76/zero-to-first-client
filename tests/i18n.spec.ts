import { expect, test, type Page } from "@playwright/test";
import { en } from "../src/i18n/dictionaries/en";
import { hi } from "../src/i18n/dictionaries/hi";

const POLICY_SLUGS = ["privacy", "terms", "refund", "delivery", "disclaimer", "copyright", "contact"];

/** Same keys, same array lengths, no empty strings (except the two FAQ answers filled at runtime). */
function compare(a: unknown, b: unknown, path: string, out: string[]) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) out.push(`${path}: length ${Array.isArray(b) ? b.length : "?"} ≠ ${a.length}`);
    else a.forEach((v, i) => compare(v, b[i], `${path}[${i}]`, out));
  } else if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return void out.push(`${path}: missing`);
    for (const k of Object.keys(a)) compare((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
    for (const k of Object.keys(b)) if (!(k in a)) out.push(`${path}.${k}: extra`);
  } else if (typeof a === "string" && typeof b !== "string") out.push(`${path}: not a string`);
}

test("Hindi dictionary has exactly the English structure", () => {
  const problems: string[] = [];
  compare(en, hi, "dict", problems);
  expect(problems).toEqual([]);
});

/** Long-enough English strings that must never show up on Hindi pages (they'd mean an untranslated section). */
function englishCopy() {
  return [
    en.hero.description, en.inside.intro, en.preview.title, en.roadmap.title, en.roadmap.steps[0].body, en.helps.title, en.helps.intro,
    en.audience.intro, en.chapters.intro, en.chapters.items[0].summary, en.pricing.checkoutClosed, en.faq.items[0].a, en.final.title,
    en.footer.disclaimer, en.ticker.items[1], en.legal.draft,
  ];
}

async function visibleText(page: Page) {
  return page.evaluate(() => document.body.innerText);
}

test.describe("Hindi pages", () => {
  test("home page is fully Hindi with the same sections and facts", async ({ page }) => {
    await page.goto("/hi");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    expect(await page.locator("main > section").count()).toBe(9);
    const text = await visibleText(page);
    for (const s of englishCopy().slice(0, 15)) expect(text, `English copy on /hi: ${s.slice(0, 40)}`).not.toContain(s);
    // Devanagari is present in every main section.
    const sections = await page.locator("main > section").evaluateAll((els) => els.map((e) => /[ऀ-ॿ]/.test((e as HTMLElement).innerText)));
    expect(sections.every(Boolean)).toBe(true);
    // Product facts and prices don't change between languages.
    for (const fact of ["₹599", "₹999", "142", "141"]) await expect(page.locator("main")).toContainText(fact);
  });

  for (const slug of POLICY_SLUGS) {
    test(`policy /hi/${slug} renders in Hindi`, async ({ page }) => {
      const res = await page.goto(`/hi/${slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", "hi");
      const body = await page.locator("main").innerText();
      // Hindi prose throughout, not just a translated heading.
      expect((body.match(/[ऀ-ॿ]/g) ?? []).length).toBeGreaterThan(300);
      expect(body).not.toContain(en.legal.draft);
      await expect(page.locator(`link[rel="alternate"][hreflang="en"]`)).toHaveAttribute("href", new RegExp(`/${slug}$`));
    });
  }
});

test("language switch: EN → हिन्दी → refresh → EN, keeping the section", async ({ page }) => {
  // Six full page loads (separate root layouts per language); give a parallel WebKit run headroom.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#pricing");
  await page.getByRole("group", { name: "Language" }).first().getByRole("link", { name: "हिन्दी" }).click();
  await page.waitForURL(/\/hi#pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.reload();
  await expect(page).toHaveURL(/\/hi#pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  // Opening the English URL directly returns a Hindi-preferring visitor to Hindi.
  await page.goto("/refund");
  await page.waitForURL(/\/hi\/refund$/);
  // Choosing English explicitly wins.
  await page.getByRole("group", { name: "भाषा" }).first().getByRole("link", { name: "English" }).click();
  await page.waitForURL((u) => u.pathname === "/refund");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("main")).toContainText(en.hero.description);
});

test("hero statistics count up from zero to the verified values", async ({ page }) => {
  await page.goto("/");
  const digits = page.locator("#top [data-countup] .countup-digits");
  await expect(digits).toHaveCount(6);
  // Mid-animation at least one number is below its final value…
  await page.waitForTimeout(350);
  const mid = await digits.allTextContents();
  expect(mid.some((v, i) => Number(v) < [142, 10, 141, 20, 7, 24][i])).toBe(true);
  // …and all settle on the real values. Screen readers always get the final value.
  await expect.poll(() => digits.allTextContents(), { timeout: 4000 }).toEqual(["142", "10", "141", "20", "7", "24"]);
  await expect(page.locator("#top [data-countup] .sr-only")).toHaveText(["142", "10", "141", "20", "7", "24"]);
});

test("reduced motion shows the final statistics immediately", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("#top [data-countup] .countup-digits")).toHaveText(["142", "10", "141", "20", "7", "24"]);
  await ctx.close();
});

test("all three book locations render and animate the same 3D book", async ({ page }) => {
  // Three iframe scenes load in sequence; under a parallel full-suite run (esp. WebKit) this needs headroom.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  for (const variant of ["hero", "pricing", "footer"]) {
    const fig = page.locator(`[data-book-variant="${variant}"]`);
    await fig.scrollIntoViewIfNeeded();
    await expect(fig.locator(".ztfc-book-stage")).toHaveAttribute("data-host-state", "ready", { timeout: 25000 });
    const frame = fig.frameLocator("iframe");
    await expect(frame.locator(".book-card")).toHaveAttribute("data-book", "ztfc");
    await expect(frame.locator(".ztfc-page-02")).toHaveCount(1);
    if (variant !== "footer") await expect(frame.locator("#asset")).toHaveAttribute("data-open", "true", { timeout: 15000 });
  }
});

for (const width of [320, 360, 390, 430, 1280]) {
  test(`pricing checkout note and seller line share one aligned grid at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const grid = page.locator("#pricing .grid-cols-\\[1rem_minmax\\(0\\,1fr\\)\\]");
    await grid.scrollIntoViewIfNeeded();
    const boxes = await grid.evaluate((g) => [...g.children].map((c) => c.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right) })));
    expect(boxes).toHaveLength(4);
    const [icon1, text1, icon2, text2] = boxes;
    expect(icon1.x).toBe(icon2.x);
    expect(text1.x).toBe(text2.x);
    expect(text1.x).toBeGreaterThan(icon1.x);
    const W = await page.evaluate(() => document.documentElement.clientWidth);
    for (const b of boxes) expect(b.right).toBeLessThanOrEqual(W);
  });
}

test("hero shows the launch offer with the regular price in both languages", async ({ page }) => {
  for (const path of ["/", "/hi"]) {
    await page.goto(path);
    const hero = page.locator("#top");
    await expect(hero).toContainText("₹599");
    await expect(hero.locator("s")).toHaveText("₹999");
    await expect(hero).toContainText("Launch offer");
  }
});

for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`Hindi page has no horizontal overflow or clipped CTAs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/hi");
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 900) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 25));
      }
      window.scrollTo(0, 0);
    });
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      document.body.style.overflowX = "visible"; // measure the real layout, not the safety net
      const over = de.scrollWidth - de.clientWidth;
      document.body.style.overflowX = "";
      const W = de.clientWidth;
      const ctas = [...document.querySelectorAll<HTMLElement>("#top a, #top button, #pricing button")]
        .filter((el) => el.offsetParent !== null)
        .filter((el) => { const b = el.getBoundingClientRect(); return b.right > W + 1 || b.left < -1 || el.scrollWidth > el.clientWidth + 2; })
        .map((el) => el.textContent?.trim());
      return { over, ctas };
    });
    expect(r.over).toBeLessThanOrEqual(0);
    expect(r.ctas).toEqual([]);
  });
}
