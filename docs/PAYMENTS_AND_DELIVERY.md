# Payments and buyer-only delivery (Razorpay Standard Checkout)

> **Status: built and tested in Razorpay Test Mode only. Not live.** The merchant account is under
> review, and the site is on Vercel Hobby, which doesn't allow commercial use. Checkout is OFF unless
> `CHECKOUT_ENABLED=true`; in Test Mode it also needs `CHECKOUT_TEST_EMAILS`, so the public can't use it.
> Live keys are refused unless `CHECKOUT_LIVE_APPROVED=true`.

## Flow
1. **Buy button** (`BuyButton`) asks `GET /api/checkout/config` at runtime. If checkout is off, it shows
   the existing "Checkout isn't open yet" notice and loads nothing from Razorpay.
2. **Checkout dialog** (`CheckoutDialog`) collects name, email and a 10-digit Indian mobile number (validated in the
   browser and on the server, stored as `+91…`, and prefilled into Razorpay so its window doesn't ask again) → `POST /api/checkout/create-order`.
   The server validates input, rate-limits, applies the test allowlist, and creates a Razorpay order for
   **59900 paise INR**, fixed in `src/lib/commerce/config.ts`. Any amount from the browser is ignored.
   Checkout answers every email the same way (no "already purchased" reply, which would reveal buyers); existing buyers use the "Get a fresh download link" form instead.
3. **Razorpay Standard Checkout** (`checkout.razorpay.com/v1/checkout.js`) opens with that `order_id`.
   Only the public Key ID reaches the browser.
4. **`POST /api/checkout/verify`** checks `HMAC_SHA256(order_id|payment_id, key_secret)` in constant time,
   then fetches the payment from Razorpay and requires the same order, ₹599, INR and `captured`.
   `authorized` → *processing* (the webhook finishes it); `failed` → *failed*, no token.
5. **`POST /api/webhooks/razorpay`** verifies the raw-body HMAC with `RAZORPAY_WEBHOOK_SECRET`, records the
   `x-razorpay-event-id` once (duplicates are acknowledged and skipped), and handles `order.paid`,
   `payment.captured`, `payment.authorized`, `payment.failed` and `refund.processed`. If the DB or email
   fails, it forgets the event and returns 500 so Razorpay retries.
6. **Delivery email** (Resend HTTP API, `src/lib/commerce/email.ts`), English or Hindi by the buyer's page
   language. It is sent only after the order is recorded as paid, and claimed atomically per order so verify +
   webhook + retries send it once (3 attempts per claim, 5 claims per order, idempotency key). Contents: thank-you,
   name, product and edition, order ID, receipt number, Razorpay payment reference, ₹599, payment date (IST), download
   instructions, support email (also Reply-To). Attachments:
   - **Payment Receipt PDF** (`src/lib/commerce/receipt.ts`): branded A4 with the official logo (header + 5% watermark),
     billed-to, order/payment details, item table, ₹ totals. Labelled a payment receipt, *not* a GST tax invoice
     (no GSTIN/tax configured). English only (standard PDF fonts); a non-Latin name prints as "as entered at checkout".
   - The logo as an inline (CID) image for the email header. Replace it with `node scripts/embed-logo.mjs <file>`.
   - The ebook PDF is **not** attached by default; the **secure link** `/purchase/success#t=<token>` is the delivery.
     `EMAIL_ATTACH_EBOOK=true` also attaches it (4.29 MB; Resend allows 40 MB after Base64).
   The success page also offers the receipt via `POST /api/purchase/receipt` (same token check as the ebook). An email failure never changes the payment
   status; it is recorded (`email_status`, last error) and retried by Razorpay's webhook retry or the admin
   "Retry email" button.
6b. **Owner notification email** (Resend HTTP API, `OWNER_EMAIL`). Whenever a payment is verified, an independent,
   separate notification is claimed and sent to `OWNER_EMAIL`. Subject: `New Purchase Received — CRAFT & CODE | ₹599`.
   Includes full customer details (name, email, phone, language), payment details (₹599, order ID, Razorpay payment ID,
   IST date), customer delivery email status, ebook attachment status, receipt status, and a link to `/admin/orders`.
   Never exposes internal credentials. Claimed atomically so retries and webhooks never produce duplicate notifications.
   If the customer email fails, the owner notification is still attempted and recorded independently.
7. **Success page** `/purchase/success` (and `/hi/purchase/success`) reads the token from the URL fragment
   (never sent to servers or logs), removes it from the address bar, and asks `POST /api/purchase/status`.
   A pending payment is reconciled directly with Razorpay (delayed webhook).
8. **Download**: `POST /api/download` checks the token (stored hashed, valid 30 days), that the order is
   **paid** (refunds revoke access). There is no per-order download cap; requests are throttled per IP against automated abuse. It then returns a **15-minute signed URL**
   (Supabase Storage private bucket, or the HMAC-signed local driver in development). Each click mints a new one.
9. **Lost link**: `POST /api/purchase/resend` emails a fresh link; the response is identical whether or not
   the email bought anything.
10. **Admin**: `/admin/orders` (Basic auth, `ADMIN_USER` / `ADMIN_PASSWORD`) lists order id, customer,
    amount, status, time, delivery-email status and downloads, with a "retry email" action.

Order statuses: `pending → processing → paid`, plus `failed`, `cancelled` (window closed) and `refunded`.
A late success always wins over `failed`/`cancelled`; nothing downgrades `paid` except a full refund.

## Going from Test Mode to production (needs your decisions and accounts)
1. **Supabase** (free tier): create a project, run `supabase/migrations/001_commerce.sql` in the SQL editor,
   then `node scripts/upload-ebook.mjs reference/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf`. The bucket is private.
2. **Resend** (free tier): add and verify the sending domain (DNS records), create an API key.
3. In Vercel → Environment Variables (Preview first): `COMMERCE_STORE=supabase`, `COMMERCE_STORAGE=supabase`,
   `COMMERCE_EMAIL=resend`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`,
   `OWNER_EMAIL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
   `RAZORPAY_WEBHOOK_SECRET` is already set.
4. Razorpay Dashboard (Test Mode) → Webhooks → URL `https://<domain>/api/webhooks/razorpay`, events
   `order.paid`, `payment.failed` (optionally `payment.captured`, `payment.authorized`, `refund.processed`).
5. Test with `CHECKOUT_ENABLED=true` and `CHECKOUT_TEST_EMAILS=<your email>` on a **Preview** deployment.
6. Only after merchant activation **and** a hosting plan that allows commercial use: switch to live keys,
   set `CHECKOUT_LIVE_APPROVED=true`, empty the allowlist requirement by going live, and set
   `NEXT_PUBLIC_DELIVERY_LIVE=true`.

The in-memory store and local file driver are for development and tests only. The local driver is refused
on Vercel, and the outbox email driver throws on Vercel, so a misconfigured deployment fails closed.

## Tests
`npm run build && npm run test:responsive` starts three servers. Port 3300 is the public site (checkout off).
Port 3399 is a mock of the Razorpay and Resend APIs (`tests/commerce/mock-server.mjs`). Port 3301 has Test Mode
checkout wired to that mock, with throwaway test secrets (`tests/commerce/env.ts`), never your real keys.
`tests/commerce.spec.ts` covers order creation, the fixed price, signatures, webhooks (valid, invalid,
duplicate, delayed), failed and unpaid access, signed-URL expiry and tampering, refunds, email retry and
duplicate prevention, admin auth, and the checkout UI on mobile and in Hindi.

## ⚠️ The resource hub is public
`https://ztfc-resources.vercel.app/` links straight to every bonus file under `/files/` (ZIP, XLSX, PDF), with no
login. The book prints this URL (p. xi). This integration delivers the **ebook PDF** only; the companion files
are still public there. Moving them behind the same token is a separate decision (it changes a site that buyers
already rely on).
