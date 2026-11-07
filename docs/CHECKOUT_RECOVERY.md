# Checkout Recovery — design, safeguards and operations

Status: implemented behind a switch that is **OFF by default**. Nothing is sent until the owner
turns automation on in `/admin/recovery`, and nothing reaches production without a separate,
explicit deployment approval.

## Agreed requirements (unchanged)

- Automation is **OFF** by default (`recovery_settings.automation_enabled = false`).
- Reminder emails go **only** to checkouts whose customer ticked the optional, unticked
  "email me reminders" box. The tick time and wording version are recorded on the order.
- WhatsApp is **manual only**: the admin opens a pre-filled `wa.me` chat and presses Send
  themselves, and only for customers who ticked the separate WhatsApp box. Nothing sends
  WhatsApp messages automatically, and no WhatsApp API or WhatsApp Web automation exists.
- Orders created before this feature (no recorded consent) are **never** contacted.
- No duplicate payment processing or ebook delivery: reminders reuse the existing atomic
  `mark_order_paid` and `ensureDelivered` (atomic email claims), and never change them.
- Razorpay stays the source of truth. A paid order never receives a reminder.

## Email classification

| Type | Examples | Consent |
|---|---|---|
| Transactional | purchase confirmation + download link, receipt, "new link" email, owner alert | Not needed (part of the purchase) |
| Checkout reminder | 30-minute and 24-hour reminders, manual admin reminder | **Opt-in required** (the Privacy Policy promises no marketing email without a separate choice) |
| Promotional | offers, discounts, other products, newsletters | Not built |

Reminders are kept non-promotional: they mention only the unfinished checkout, have no discounts,
urgency or earnings claims, carry an unsubscribe link and RFC 8058 one-click unsubscribe headers,
and stop permanently once the address unsubscribes.

## Schedule

A checkout is a candidate only if **all** of these hold:

- opted in to email reminders; address not on the suppression (unsubscribe) list;
- payment status `pending`, `cancelled` or `failed` (never `processing`, `paid` or `refunded`);
- it is the newest order for that email, and no order for that email is paid, refunded or processing;
- not a Test Mode order (unless the site itself runs in Test Mode, e.g. the automated tests).

| Reminder | Due | Window |
|---|---|---|
| 1st (`auto_1`) | 30 minutes after checkout | skipped if the checkout is over 23 hours old |
| 2nd (`auto_2`) | 24 hours after checkout | not sent after 72 hours |
| Manual (admin) | when the admin sends it | 15 minutes to 7 days after checkout |

Limits:
- **at most 2 reminder emails per checkout, automatic and manual together** (this is what the
  opt-in box promises: "up to 2 reminders about this checkout"); each email says "reminder n of 2";
- no reminder within 12 hours of a previous one to the same address;
- at most 3 reminder emails per address in 30 days (across checkouts);
- a rolling 24-hour cap (default 30) shared by all reminder sends, so purchase-delivery emails keep
  their Resend quota.

Unverified addresses: the checkout form can't prove an address belongs to the person typing it,
so one network address may record reminder consent for at most 3 checkouts per hour (beyond that,
the order is created without consent), and the greeting uses the typed first name only if it is
made of letters (any script); otherwise it says just "Hi,".

Stopping: an unsubscribe (link or one-click) or a "stop" request recorded by the admin in
`/admin/recovery` ("Record a stop request") blocks **every** channel for that address: no reminder
emails and no WhatsApp follow-up. Only a SHA-256 hash of the address is stored.

Concurrency and time limits: a manual send takes the scheduler's lock too, so a manual send and an
automatic run never email the same customer at once. A scheduler run stops starting new sends after
20 seconds and an admin send after 40 seconds (both functions are limited to 60 seconds); the rest
continue on the next run or submission. Reminder emails use a 15-second provider timeout.

Bulk sends: the preview page signs the exact recipient list (valid 15 minutes) with a key derived
from the admin credentials; the server refuses a send that wasn't previewed or whose list changed.

Retries: with `RECOVERY_CRON_SECRET` set, a reminder's links are derived from that secret and the
reminder's id, so a retry sends the identical email under the same Resend idempotency key. If the
first attempt was actually accepted (e.g. the response timed out), Resend de-duplicates it.

Unsubscribe links: the link in the email body carries its token after `#`, which browsers never
send, so it never appears in request logs. The List-Unsubscribe header (one-click) URL must carry
the token in the query; it is only requested when the customer unsubscribes, after which the token
can do nothing new.

Right before every send: the order is re-read; Razorpay is asked for **that order's payments**
(`GET /v1/orders/{id}/payments`). A captured, matching payment marks the order paid through the
existing atomic path, delivers the ebook once, and cancels the reminder. An authorised or in-flight
payment, or any Razorpay error, means "don't send now" (retried on a later run). The reminder slot
is claimed atomically in the database (a unique key per order and stage), so a reminder can never
be sent twice, even by two overlapping runs.

## Safeguard 1 — Supabase Free plan inactivity pausing

**The risk, stated plainly.** The project is on the Supabase **Free** plan. Supabase pauses Free
projects after a period of inactivity (documented as about a week). Supabase does not publish an
exact definition of "activity", so **we do not assume that the 5-minute pg_cron job, the daily
watchdog, or site traffic prevents pausing.** If the project is paused:

- the **whole store** is affected, not just reminders: checkout cannot create orders, verify and
  webhooks cannot record payments (Razorpay keeps retrying webhooks for a while), and downloads stop;
- pg_cron stops with the database, so no reminders are sent;
- when the project is restored, scheduled jobs resume. Stale reminders are **not** sent in a burst:
  the 23-hour and 72-hour windows skip anything that became too old while paused.

**Monitoring (no paid services).**

1. **Daily watchdog** (Vercel Cron, once a day — allowed on Hobby): `GET /api/recovery/watchdog`.
   It checks that the database answers and, when automation is on, that the scheduler ran within
   the last 30 minutes. On a problem it emails `OWNER_EMAIL` through the existing Resend setup
   ("Database unreachable — the Supabase project may be paused" or "Recovery scheduler is
   stale"). It needs the `CRON_SECRET` environment variable, which Vercel sends as a bearer token
   on cron calls; without it the endpoint refuses every request.
2. **Admin dashboard**: `/admin/recovery` shows the last scheduler run and a red warning when no
   run happened in the last 15 minutes while automation is on. Any admin page shows "Database
   unavailable" if Supabase is down.
3. **Supabase emails**: Supabase normally notifies the organisation owner's email about pausing.
   Keep that mailbox (the Supabase account email) monitored; don't rely on it alone.

**Recovery procedure.**

1. Open the Supabase dashboard → project `craft-code-commerce`. If it shows "Paused", click
   **Restore project** and wait until it is healthy (a few minutes).
2. In `/admin/orders`, confirm orders load. In `/admin/payments`, compare the latest Razorpay
   payments in the Razorpay dashboard with the orders list. Razorpay retries failed webhooks, and
   any order a buyer paid during the outage is reconciled when its webhook is retried or when the
   buyer re-opens their purchase page. For a payment still not recorded, use the order's
   "Retry email" only after it shows as paid — never mark anything paid by hand.
3. In the SQL editor (read-only): `select jobname, schedule, active from cron.job;` — the
   `ztfc-recovery` job should be listed and active.
4. In `/admin/recovery`, wait for a new "Last run" entry (within 5 minutes).
5. If the project cannot be restored from the dashboard, contact Supabase support; do **not**
   create a new project without migrating data first.

**Reducing the chance of a pause (free options).** The watchdog and the scheduler both query the
database; normal store traffic does too. These may count as activity, but this is not guaranteed.
The only guaranteed option is a paid plan, which is **not** added.

## Safeguard 2 — pg_net authentication without exposing a secret

- **Dedicated secret.** pg_cron → pg_net uses `RECOVERY_CRON_SECRET`: a dedicated 32-byte random
  value used for nothing else. The Supabase service-role key is **never** used for this.
- **Where it lives.** Only in Supabase **Vault** (encrypted at rest, name `recovery_cron_secret`)
  and in the Vercel Production environment variable `RECOVERY_CRON_SECRET` (marked Sensitive).
  It is never in Git, never in `cron.job`'s command text, never in a NEXT_PUBLIC_ variable, never
  logged, and never shown in the admin UI.
- **The secret itself is never sent.** pg_net stores each request — including its headers — in
  `net.http_request_queue` until its worker sends it, and keeps responses in `net._http_response`
  for a few hours. So the request carries only a **short-lived HMAC signature**:
  `x-recovery-ts` (Unix seconds), `x-recovery-nonce` (random) and
  `x-recovery-signature = HMAC-SHA256(secret, "v1:" || ts || ":" || nonce)`. Anyone who could read
  the queue sees a signature that expires after 5 minutes and is single-use (the nonce is stored
  with the run and a repeat is refused). It cannot be turned back into the secret.
- **Server check.** `/api/recovery/run` recomputes the HMAC with the Vercel copy of the secret,
  compares in constant time, rejects timestamps more than 5 minutes off, and records the nonce.
  Failures return a bare 401 and log no header values.
- **Minimal responses.** The endpoint answers `{"accepted":true}` (202) and does the work after
  responding, so `net._http_response` never holds customer data.
- **Restricted access.** The cron command is only `select public.recovery_cron_tick();`. That
  function is `SECURITY DEFINER`, reads the secret from Vault at run time, and has `EXECUTE`
  revoked from `public`, `anon`, `authenticated` and `service_role`. The migration also tries to
  revoke `anon`/`authenticated` access to the `net` functions and tables (where the role has the
  privilege to do so; otherwise it reports a notice). Neither `cron`, `net` nor `vault` is exposed
  through the public API (only `public` and `graphql_public` are).
- **Rotation.** Generate a new value, update the Vault secret and the Vercel variable together,
  then redeploy. Until both match, runs are rejected (fail closed: no emails).

## Implementation stages

1. **Docs** — this file.
2. **Migration 003** (`supabase/migrations/003_checkout_recovery.sql`): additive only. New nullable
   consent columns on `orders`; new tables `recovery_messages`, `recovery_settings` (one row,
   automation off), `recovery_runs`, `email_suppressions` (hashed addresses), `recovery_tokens`
   (hashed). RLS on, no policies, privileges revoked from `anon`/`authenticated`.
3. **Server core**: store methods, Razorpay "payments for order" lookup, eligibility rules,
   reminder email template (English + Hindi), resume and unsubscribe tokens.
4. **Checkout**: two optional, unticked opt-in boxes; consent recorded after the order is created
   (a failure there never blocks checkout); "Continue checkout" resume links; unsubscribe page;
   Privacy Policy update (English + Hindi).
5. **Admin**: `/admin/recovery` — metrics, filters, table, individual and bulk email with preview
   and confirmation, retry failed, manual WhatsApp link, automation on/off and pause/resume,
   run log.
6. **Scheduler**: `/api/recovery/run` (HMAC-authenticated), `/api/recovery/watchdog` (daily Vercel
   cron), `supabase/migrations/004_recovery_cron.sql` (run by the owner only after deployment).
7. **Tests and checks**: mocked Razorpay/Resend tests, lint, typecheck, full suite, diff review.

## Setting up the scheduler (owner, after deployment approval)

1. Run `supabase/migrations/003_checkout_recovery.sql` in the SQL editor (additive; automation OFF).
   Then enable **pg_cron** and **pg_net** in Database → Extensions (the Supabase-recommended way;
   the `create extension if not exists` lines in 004 then do nothing).
2. Create the secret **inside the database** (it is generated there and never displayed by this):
   `select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'recovery_cron_secret', 'Checkout recovery scheduler HMAC key');`
3. Supabase → Integrations → Vault → Secrets → `recovery_cron_secret` → reveal and copy it **once**
   into Vercel → Settings → Environment Variables → Production → `RECOVERY_CRON_SECRET` (mark it
   Sensitive). Don't paste it anywhere else (chat, email, files, Git).
4. Also add `CRON_SECRET` in Vercel (Production, Sensitive): any random value of 32+ characters.
5. Deploy (only with approval), then run `supabase/migrations/004_recovery_cron.sql`.
6. Check (read-only), about 5 minutes later:
   `select status_code, created from net._http_response order by created desc limit 3;` → `202`.
   A `401` means the Vault and Vercel values differ (nothing is sent in that case).
   `/admin/recovery` → "Last scheduler run" shows the run with "automation is off".
7. Only then, in `/admin/recovery`, choose **Enable automation**.

## Environment variables (names only)

| Name | Where | Purpose |
|---|---|---|
| `RECOVERY_CRON_SECRET` | Vercel (Production) + Supabase Vault `recovery_cron_secret` | HMAC key for the scheduler call |
| `CRON_SECRET` | Vercel (Production) | Bearer token Vercel sends to the daily watchdog |

## Rollback

1. `/admin/recovery` → **Disable automation** (immediate; nothing more is sent).
2. SQL editor: run `supabase/migrations/004_recovery_cron_rollback.sql` (safe even if pg_cron isn't installed).
3. Vercel → Deployments → promote the previous deployment.
4. Migration 003 is additive and can stay in place; the old code ignores the new tables/columns.
