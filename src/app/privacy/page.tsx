import type { Metadata } from "next";
import { LegalPage, Pending, SellerIdentity, SupportContact } from "@/components/landing/LegalPage";
import { brand, support } from "@/data/product";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information the ZERO TO FIRST CLIENT website and checkout collect, why, who processes it and how to exercise your rights.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This website collects very little. It sets no cookies and runs no analytics or advertising trackers. When checkout opens, the personal information needed to process and deliver your order is collected through the payment provider. This page explains what is collected, why, and your choices."
    >
      <h2>1. Who is responsible</h2>
      <p><SellerIdentity /> Contact: <SupportContact />.</p>

      <h2>2. What this website collects today</h2>
      <ul>
        <li><strong>No cookies, analytics or advertising trackers.</strong> The site doesn&apos;t set cookies or load third-party analytics. Fonts are served from this website, not from a third-party font service.</li>
        <li><strong>Server logs.</strong> Like any website, the hosting provider (Vercel) automatically processes technical request data such as IP address, browser type, the page requested and the time. This is used to deliver the site, keep it secure and diagnose errors.</li>
        <li><strong>No forms.</strong> The site has no newsletter, account or contact form that stores what you type.</li>
      </ul>

      <h2>3. What is collected when you buy</h2>
      <p>When checkout is live, purchases are processed by a payment service provider (Razorpay, once integration is complete). To complete and deliver your order, the following may be collected:</p>
      <ul>
        <li>your name, email address and phone number, as entered at checkout;</li>
        <li>the order and transaction references, amount, date and payment status;</li>
        <li>delivery records, such as when a download link was sent and used.</li>
      </ul>
      <p>Your card, UPI or bank details are entered on the payment provider&apos;s secure page and are handled by the provider under its own privacy policy. They are not stored by this website.</p>

      <h2>4. Why it is used</h2>
      <ul>
        <li>to process your payment and deliver the files you bought;</li>
        <li>to answer support requests and resolve delivery or payment problems;</li>
        <li>to prevent fraud and misuse, such as unauthorised redistribution;</li>
        <li>to keep the records that tax and accounting law requires.</li>
      </ul>
      <p>Your information is not sold. You won&apos;t receive marketing emails unless you separately choose to.</p>

      <h2>5. Who it is shared with</h2>
      <p>Only with service providers that help run the business, such as the hosting provider, the payment provider and an email-delivery service. Each receives only what it needs. Information is also disclosed where the law requires it.</p>

      <h2>6. How long it is kept</h2>
      <p>Order and transaction records are kept for as long as tax, accounting and other legal obligations require. Support correspondence is kept for as long as needed to resolve the request. Server logs are kept according to the hosting provider&apos;s standard retention.</p>

      <h2>7. Security</h2>
      <p>The site is served over HTTPS, and payment details are handled by the payment provider. When delivery opens, paid files will be released only through links issued after a verified payment, not through a public URL. No system is perfectly secure, but reasonable measures are taken to protect your information.</p>

      <h2>8. Your rights</h2>
      <p>Subject to applicable law, including India&apos;s Digital Personal Data Protection Act, 2023 as its provisions come into force, you can ask to access, correct or erase your personal information, withdraw consent where processing relies on it, and raise a grievance. Write to <SupportContact />.</p>
      <p>
        Grievance officer:{" "}
        {support.grievanceOfficer ? <strong>{support.grievanceOfficer}</strong> : <Pending>Name of the grievance officer</Pending>}
        {support.grievanceEmail ? <> (<a href={`mailto:${support.grievanceEmail}`}>{support.grievanceEmail}</a>)</> : null}.
      </p>

      <h2>9. Children</h2>
      <p>The product is intended for adults and older students. If you are under 18, please purchase with the involvement of a parent or guardian. Information about children isn&apos;t knowingly collected.</p>

      <h2>10. Changes</h2>
      <p>This policy will be updated when the site&apos;s practices change, for example when checkout or analytics are added. The date at the top shows the latest version. {brand.seller} will not start using cookies or analytics without updating this page first.</p>
    </LegalPage>
  );
}
