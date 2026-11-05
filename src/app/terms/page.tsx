import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Pending, SellerIdentity, SupportContact } from "@/components/landing/LegalPage";
import { brand, product } from "@/data/product";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms for using the ZERO TO FIRST CLIENT website and buying the digital ebook: pricing, payment, delivery, license, liability and governing law.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms and Conditions"
      summary={<>These terms apply when you use this website or buy {product.name}. By placing an order you agree to them, together with the policies linked below.</>}
    >
      <h2>1. About us</h2>
      <p><SellerIdentity /> Contact: <SupportContact />.</p>

      <h2>2. Using the website</h2>
      <p>You may browse the site for personal, lawful purposes. Don&apos;t attempt to disrupt it, access parts of it you aren&apos;t meant to, or scrape or copy its content and previews for redistribution.</p>

      <h2>3. Product description</h2>
      <p>{product.name} ({product.edition}, {product.editionNumber}) is a digital educational product: a 142-page ebook with companion templates, calculators and PDFs. Explanations are written in Hindi, with English business terms. The contents, previews and file list on the product page describe what you receive. Reasonable care is taken to describe it accurately; if something is materially different, the <Link href="/refund">Refund and Cancellation Policy</Link> applies.</p>

      <h2>4. Prices and taxes</h2>
      <p>Prices are shown in Indian rupees (INR) on the product page. Any launch offer is shown against the regular price it applies to. Whether the price includes taxes such as GST will be stated at checkout. The price you pay is the one confirmed by the payment provider at checkout, and is set on the server, not by your browser.</p>

      <h2>5. Payment</h2>
      <p>Payments are processed by a third-party payment service provider (Razorpay, once integrated). An order is accepted only when the provider confirms the payment. We may refuse or cancel an order, with a full refund of anything charged, if the payment can&apos;t be verified, it appears fraudulent, or the order was placed in breach of these terms.</p>

      <h2>6. Delivery</h2>
      <p>Files are delivered digitally after verified payment, as described in the <Link href="/delivery">Digital Delivery Policy</Link>.</p>

      <h2>7. Refunds and cancellation</h2>
      <p>Digital downloads are generally non-refundable once delivered or accessed, with the exceptions and statutory rights set out in the <Link href="/refund">Refund and Cancellation Policy</Link>.</p>

      <h2>8. License and intellectual property</h2>
      <p>The ebook and materials are protected by copyright and are licensed, not sold, to you for your own use. You may not copy, resell, share, upload or redistribute them. Full terms are on the <Link href="/copyright">Copyright and License</Link> page.</p>

      <h2>9. Misuse of orders</h2>
      <p>Sharing download links, reselling access, chargeback abuse or using someone else&apos;s payment method without permission may lead to access being withdrawn and, where appropriate, further action.</p>

      <h2>10. Educational content and no guarantee</h2>
      <p>The product teaches a process. It doesn&apos;t guarantee clients, income, profit or any timeline, and it isn&apos;t legal, tax or investment advice. See the <Link href="/disclaimer">Disclaimer</Link>.</p>

      <h2>11. Limitation of liability</h2>
      <p>To the extent permitted by applicable law, {brand.seller} and {brand.publisher} are not liable for indirect or consequential losses, such as lost profits or business opportunities, arising from use of the product. Total liability for any claim relating to an order is limited to the amount paid for that order. Nothing in these terms limits liability that can&apos;t legally be limited, or your rights as a consumer under applicable law.</p>

      <h2>12. Governing law and disputes</h2>
      <p>These terms are governed by the laws of India. Please contact support first so a problem can be resolved quickly. Subject to your rights to approach a consumer forum under the Consumer Protection Act, 2019, disputes are subject to the courts at {brand.jurisdiction ?? <Pending>the city of jurisdiction</Pending>}.</p>

      <h2>13. Changes</h2>
      <p>These terms may be updated from time to time. The version in force when you place an order applies to that order.</p>
    </LegalPage>
  );
}
