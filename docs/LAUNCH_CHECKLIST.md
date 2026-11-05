# Launch checklist: details to confirm before checkout opens

Nothing on this list has been invented on the site. Until each item is supplied, the page shows a clearly marked placeholder ("… to be published before checkout opens") or keeps the feature switched off. All values are env vars; see `.env.example`.

## Business identity (needed for the policies, and by consumer-protection rules)
- [ ] **Legal name** of the business that operates CRAFT & CODE and DEADCODE LABS → `NEXT_PUBLIC_LEGAL_ENTITY`
- [ ] **City/state of jurisdiction** for the terms → `NEXT_PUBLIC_JURISDICTION`
- [ ] **Support email** → `NEXT_PUBLIC_SUPPORT_EMAIL`
- [ ] **Committed support response time** → `NEXT_PUBLIC_SUPPORT_RESPONSE_TIME`
- [ ] **Grievance officer name and email** → `NEXT_PUBLIC_GRIEVANCE_OFFICER`, `NEXT_PUBLIC_GRIEVANCE_EMAIL`
- [ ] Whether a **postal address** and **GSTIN** must be displayed. Have your CA or advocate confirm; neither is shown or invented.

## Pricing (₹599 launch / ₹999 regular)
- [ ] Confirm **₹999 is a genuine regular price**, i.e. one the product is or will actually be sold at. A strike-through "regular" price that was never charged can count as a misleading price under India's consumer-protection rules on dark patterns.
- [ ] Confirm whether ₹599 **includes GST** and set `NEXT_PUBLIC_PRICE_NOTE_INR` (e.g. "Inclusive of all taxes").
- [ ] When creating the Razorpay Payment Page, set the amount to **exactly ₹599**. The site can't enforce the hosted page's amount, so check it with a real test payment.
- [ ] No deadline, countdown or quantity limit is shown. Add one only if it's real and enforced.

## Checkout and delivery (see docs/PAYMENTS_AND_DELIVERY.md)
- [ ] Razorpay account live; Payment Page created at ₹599 → `NEXT_PUBLIC_CHECKOUT_URL_INR`
- [ ] Webhook `POST /api/webhooks/razorpay` configured with `RAZORPAY_WEBHOOK_SECRET`; signature verification is already implemented
- [ ] `fulfillOrder()` implemented: idempotent by payment id, a time-limited signed download link from private storage, and the email sent
- [ ] Paid files moved off the public resource hub
- [ ] End-to-end test with a real payment and a refund, then `NEXT_PUBLIC_DELIVERY_LIVE=true`. Only then does the site say "Instant access after verified payment."

## Legal review
- [ ] Have a qualified Indian legal professional review `/privacy`, `/terms`, `/refund`, `/delivery`, `/disclaimer`, `/copyright` and `/contact`, then set `NEXT_PUBLIC_LEGAL_REVIEWED=true`. Points to check specifically:
  - Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020: seller details to display, grievance-handling timelines, and refund handling for digital goods
  - Digital Personal Data Protection Act, 2023 and its rules, as they come into force: notice, consent and rights wording in the privacy policy
  - Guidelines on dark patterns: the launch-offer and regular-price presentation
  - The limitation-of-liability and jurisdiction clauses
  - Payment-provider (Razorpay) policy requirements for the refund and delivery pages
- [ ] Confirm the **update policy** for buyers → `NEXT_PUBLIC_UPDATES_POLICY`

## Hosting
- [ ] Nothing needs setting for SEO: the canonical URL now defaults to https://craftandcode.tech. Set `NEXT_PUBLIC_SITE_URL` only for a different domain.
