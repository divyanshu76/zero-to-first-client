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
npx tsc --noEmit
```

## Structure

```
reference/                     Source PDF (git-ignored, never served)
docs/CONTENT_AUDIT.md          Product facts checked against the PDF
docs/PAYMENTS_AND_DELIVERY.md  Checkout status and secure delivery plan
public/images/cover.webp       Cover rendered from PDF page 1
public/images/pages/*.webp     12 preview pages rendered from the PDF
public/images/figures/*.webp   6 diagrams cropped from the PDF
src/app/                       layout (metadata, fonts), page, privacy/terms/refund,
                               sitemap.ts, robots.ts, icon.svg, OG/Twitter images,
                               api/webhooks/razorpay
src/data/product.ts            ★ Product facts, pricing, checkout and policy config
src/data/chapters.ts           10 chapters and 4 stages
src/data/resources.ts          Prompts, templates, calculators, deliverables
src/data/content.ts            Section copy, applications, previews
src/data/faq.ts                FAQ (also emitted as FAQPage JSON-LD)
src/components/landing/        Page sections
src/components/ui/             BuyButton, BookMockup, Reveal, Counter, SectionHeader
src/lib/payments.ts            Webhook signature check + fulfilment stub (server-only)
src/components/landing/ThreeDEbookShowcase.tsx   Hero 3D book (poster → 3D, auto-open, fallback)
src/components/threeui/        Vendored ThreeUI BestsellerBooks + BookAssetHost (unmodified, MIT)
public/3d-assets/books/        ThreeUI book runtime + the ZTFC edition (cover and PDF pages 2–4)
                               Changes are listed in public/3d-assets/books/THREEUI-NOTICE.md
```

The hero book runs inside an iframe sandboxed with `allow-scripts` only. `next.config.ts` sends
`Access-Control-Allow-Origin: *` for `/3d-assets/*`, because without it the browser blocks the
book's module scripts.

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
