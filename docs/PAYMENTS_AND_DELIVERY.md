# Payments and buyer-only delivery

## Current status
- **No live checkout.** Every buy button shows "Checkout isn't open yet" until both a price and a checkout URL are configured.
- Prices, discounts and checkout links are read from `NEXT_PUBLIC_*` env vars through `src/data/product.ts`.
- `POST /api/webhooks/razorpay` is a Razorpay webhook endpoint:
  - It returns 503 if `RAZORPAY_WEBHOOK_SECRET` is not set.
  - It returns 401 if the HMAC signature is invalid.
  - It calls `fulfillOrder()` only for a verified `payment.captured` event.
- `fulfillOrder()` in `src/lib/payments.ts` is a stub. It logs the event and delivers nothing.
- JSON-LD `Offer` data is only added once a real price and checkout URL exist.

## ⚠️ The resource hub is public
`https://ztfc-resources.vercel.app/` links straight to every bonus file under `/files/`, with no login. Examples are `files/ZTFC_all_resources.zip`, `files/BUSINESS_CALCULATORS.xlsx` and `files/AI_PROMPTS.pdf`. Anyone who has the URL can download everything.

The book itself prints this URL (p. xi), so buyers rely on it. Because of that, the landing page **doesn't** link to it by default (`NEXT_PUBLIC_SHOW_RESOURCE_HUB=false`).

## Recommended delivery approach
1. **Easiest:** sell through a hosted checkout that handles digital delivery itself, then put its URL in `NEXT_PUBLIC_CHECKOUT_URL_INR` / `_USD`. Options:
   - a Razorpay Payment Page with a post-payment redirect to a private download
   - Lemon Squeezy, Gumroad or Paddle, which deliver files and handle international VAT
2. **Own delivery** (uses the webhook that's already in place):
   - Move the PDF and ZIP to private storage, such as Vercel Blob (private), S3 or Cloudflare R2.
   - In `fulfillOrder()`, record the payment idempotently by payment id. Then create a short-lived signed URL, or a tokenised `/download/[token]` route, and email it to the buyer.
   - Never trust a frontend "payment success" callback. Only the verified webhook (or a server-side signature check) should trigger delivery.
3. **Resource hub:** consider moving the files behind a buyer token, or rotating the file paths. The URL printed in Edition 1.0 will keep working for anyone who has a copy.

None of this changes production resources. Please approve it before anything is deployed.
