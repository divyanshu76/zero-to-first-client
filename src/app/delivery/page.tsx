import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SellerIdentity, SupportContact } from "@/components/landing/LegalPage";
import { deliveryLive, product } from "@/data/product";

export const metadata: Metadata = {
  title: "Digital Delivery Policy",
  description: "How the ZERO TO FIRST CLIENT ebook and its files are delivered after a verified payment, and what to do if a link doesn't arrive or expires.",
  alternates: { canonical: "/delivery" },
};

export default function Delivery() {
  return (
    <LegalPage
      title="Digital Delivery Policy"
      summary={<>{product.name} is delivered digitally, only after your payment has been verified by the payment provider. Nothing is shipped, and the files are never offered through a permanent public download link.</>}
    >
      {!deliveryLive ? (
        <p className="rounded-2xl bg-violet-soft/60 px-5 py-4 text-ink">
          <strong>Current status:</strong> checkout and delivery are not open yet. No orders are being taken. This page describes how delivery will work at launch.
        </p>
      ) : null}

      <h2>1. Who delivers</h2>
      <p><SellerIdentity /></p>

      <h2>2. What you receive</h2>
      <ul>
        <li>The 142-page ebook (PDF).</li>
        <li>20 editable templates (14 DOCX, 6 XLSX) and the BUSINESS_CALCULATORS.xlsx workbook with 7 sheets.</li>
        <li>The AI prompt library, the printable template collection and the business resource directory (PDF).</li>
      </ul>

      <h2>3. When and how delivery happens</h2>
      <ul>
        <li>Delivery starts only after the payment provider confirms your payment to our server. A browser &ldquo;payment successful&rdquo; screen alone doesn&apos;t trigger delivery.</li>
        <li>You&apos;ll receive an email, at the address you entered at checkout, with secure links to download the files.</li>
        <li>Links are tied to your order and may expire after a set time or number of downloads, to prevent unauthorised sharing. Please download and save the files to your device when you receive them.</li>
      </ul>

      <h2>4. If the email doesn&apos;t arrive</h2>
      <ul>
        <li>Check your spam, promotions and updates folders for the delivery email.</li>
        <li>Make sure the email address you entered at checkout was correct.</li>
        <li>If it still hasn&apos;t arrived, contact support with your payment reference and the email used at checkout.</li>
      </ul>

      <h2>5. If a link has expired or a file won&apos;t open</h2>
      <p>Contact support with your order details. Once the purchase is confirmed, fresh links or replacement files will be issued. Corrupted, incomplete or incorrect files are covered by the <Link href="/refund">Refund and Cancellation Policy</Link>.</p>

      <h2>6. Support</h2>
      <p>Write to <SupportContact />. The response time will be published on the <Link href="/contact">contact page</Link>.</p>

      <h2>7. Using the files</h2>
      <p>The files are licensed for your own use. See the <Link href="/copyright">Copyright and License</Link> page for what is and isn&apos;t allowed.</p>
    </LegalPage>
  );
}
