# ZERO TO FIRST CLIENT — landing page

The sales page for *ZERO TO FIRST CLIENT: The AI-Powered Business Starter Kit* (2026 Edition) by DEADCODE LABS.
Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 and lucide-react. There's no animation library: motion uses CSS plus IntersectionObserver.

## Run it

```bash
npm install
cp .env.example .env.local   # optional — the site works without it
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
npm run lint
npm run typecheck
```

### Responsive tests

```bash
npx playwright install chromium webkit   # once
npm run build && npm run test:responsive
```

The suite in `tests/responsive.spec.ts` covers 19 device widths (320–2560 px) and 22 browser-zoom
levels (50–200% at 1366 and 1920). It runs in Chromium and WebKit, and fails if:
- any element makes the page wider than the viewport, checked with the `body` safety net off
- the visual viewport scale drops below 1 on mobile
- the hero CTAs overlap or misalign
- the 3D book leaves the viewport, or a section is missing

Set `PLAYWRIGHT_BASE_URL` to test a deployed URL instead.

## Structure

```
reference/                     Source PDF (git-ignored, never served)
docs/CONTENT_AUDIT.md          Product facts checked against the PDF
docs/PAYMENTS_AND_DELIVERY.md  Checkout status and secure delivery plan
docs/LAUNCH_CHECKLIST.md       ★ Business, pricing and legal details to confirm before launch
docs/screenshots/              Desktop / tablet / mobile captures of the current build
public/images/book/            Renders of the real 3D book (pricing + final CTA)
public/images/cover.webp       Cover rendered from PDF page 1
public/images/pages/*.webp     12 preview pages rendered from the PDF
public/images/figures/*.webp   6 diagrams cropped from the PDF
src/app/                       layout (metadata, fonts), page, not-found, and the policy pages
                               privacy, terms, refund, delivery, disclaimer, copyright, contact;
                               sitemap.ts, robots.ts, icon.svg, OG/Twitter images,
                               api/webhooks/razorpay
src/data/product.ts            ★ Brand, product facts, pricing (₹599 / ₹999), checkout and support config
src/data/chapters.ts           10 chapters and 4 stages
src/data/resources.ts          Prompts, templates, calculators, deliverables
src/data/content.ts            Section copy, applications, previews
src/data/faq.ts                FAQ (also emitted as FAQPage JSON-LD)
src/components/landing/        Page sections
src/components/ui/             BuyButton, BookMockup, Reveal, SectionHeader
src/lib/payments.ts            Webhook signature check + fulfilment stub (server-only)
src/components/landing/BookShowcase.tsx   The 3D book in all three places: hero, pricing, final CTA
src/i18n/                      Languages: config, en/hi dictionaries, faq helper, policies/<slug>.tsx
src/app/(en)/ · src/app/(hi)/hi/  English at /, Hindi at /hi (one root layout per language)
src/components/threeui/        Vendored ThreeUI BestsellerBooks + BookAssetHost (unmodified, MIT)
public/3d-assets/books/        ThreeUI book runtime + the ZTFC edition (cover and PDF pages 2–4)
                               Changes are listed in public/3d-assets/books/THREEUI-NOTICE.md
```

The book runs inside an iframe sandboxed with `allow-scripts` only. `next.config.ts` sends
`Access-Control-Allow-Origin: *` for `/3d-assets/*`, because without it the browser blocks the
book's module scripts.

## Languages (English and Hindi)

- English is served at `/` and Hindi at `/hi`, for the home page and all 7 policy pages. Each language has its own root layout, so `<html lang>`, canonical and hreflang tags are correct in the static HTML.
- All copy lives in `src/i18n/dictionaries/en.ts`. `hi.ts` is typed as the same `Dictionary`, so a missing key fails the build, and `tests/i18n.spec.ts` checks that array lengths match.
- Product facts, prices and page references are in `src/data` and shared between languages, so a translation can't change them.
- Policy text is in `src/i18n/policies/<slug>.tsx`, with one `en` and one `hi` entry per policy.
- The EN | हिन्दी switcher links to the same page in the other language and keeps the current `#section`. The choice is remembered in the visitor's browser:
  - a visitor who picked Hindi goes back to Hindi when they open an English URL
  - picking English explicitly always wins
- To add a language:
  - add it to `locales` in `src/i18n/config.ts`
  - add a dictionary and policy entries
  - add an `app/(xx)/xx/` route group

## Configuration
Everything you need to decide lives in `.env.example`:
- price per currency
- optional genuine discount
- hosted checkout URL
- refund, updates and delivery wording
- site URL and contact link
- whether to show the public resource hub
- Razorpay webhook secret

A buy button goes live only when **both** a price and a checkout URL are set.

## Deploy (Vercel)
1. Push to a **private** repo. `reference/` is git-ignored; keep it that way.
2. Import the repo into Vercel and set the env vars, at least `NEXT_PUBLIC_SITE_URL`.
3. Redeploy after you change any `NEXT_PUBLIC_*` value. They're inlined at build time.
