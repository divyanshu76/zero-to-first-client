import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Pending, SellerIdentity } from "@/components/landing/LegalPage";
import { brand, support } from "@/data/product";

export const metadata: Metadata = {
  title: "Contact and Support",
  description: "How to contact CRAFT & CODE about ZERO TO FIRST CLIENT orders, delivery, files, payments and policy questions.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <LegalPage
      title="Contact and Support"
      summary="Questions before buying, a missing delivery email, a file that won't open, or a payment you don't recognise: this is where to reach us."
    >
      <h2>Support</h2>
      <ul>
        <li>
          Email:{" "}
          {support.email ? <a href={`mailto:${support.email}`}>{support.email}</a> : <Pending>Support email</Pending>}
        </li>
        <li>Response time: {support.responseTime ?? <Pending>Committed response time</Pending>}</li>
        <li>
          Publisher website:{" "}
          <a href={brand.publisherUrl} target="_blank" rel="noopener noreferrer">deadcode.space</a>
        </li>
      </ul>

      <h2>When you write, include</h2>
      <ul>
        <li>the email address used at checkout;</li>
        <li>the payment or order reference, if you have one;</li>
        <li>what you need help with, with a screenshot if relevant.</li>
      </ul>

      <h2>Grievance officer</h2>
      <p>
        {support.grievanceOfficer ? <strong>{support.grievanceOfficer}</strong> : <Pending>Grievance officer&apos;s name</Pending>}
        {" — "}
        {support.grievanceEmail ? <a href={`mailto:${support.grievanceEmail}`}>{support.grievanceEmail}</a> : <Pending>Grievance email</Pending>}
      </p>

      <h2>Business details</h2>
      <p><SellerIdentity /></p>

      <h2>Common questions</h2>
      <ul>
        <li>Delivery and download links: see the <Link href="/delivery">Digital Delivery Policy</Link>.</li>
        <li>Refunds, faulty files and duplicate charges: see the <Link href="/refund">Refund and Cancellation Policy</Link>.</li>
        <li>What you can do with the files: see <Link href="/copyright">Copyright and License</Link>.</li>
      </ul>
    </LegalPage>
  );
}
