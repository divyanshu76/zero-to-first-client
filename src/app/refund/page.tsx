import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SellerIdentity, SupportContact } from "@/components/landing/LegalPage";
import { product } from "@/data/product";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description: "When refunds and cancellations apply to the ZERO TO FIRST CLIENT digital ebook, and how to report delivery, file or payment problems.",
  alternates: { canonical: "/refund" },
};

export default function Refund() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      summary={<>{product.name} is a digital product. Purchases are generally non-refundable and non-cancellable once the files have been successfully delivered or accessed. Delivery failures, faulty files, duplicate charges and unauthorised payments are handled differently, as set out below.</>}
    >
      <h2>1. Who this applies to</h2>
      <p><SellerIdentity /> This policy covers purchases of the {product.name} ebook and its companion files made through this website.</p>

      <h2>2. Please review before you buy</h2>
      <p>Because a digital download can&apos;t be returned once delivered, please check the product details first: the table of contents, the page previews, the list of included files, the language (Hindi explanations with English business terms) and the FAQ. If something is unclear, contact support before purchasing.</p>

      <h2>3. The general position</h2>
      <p>Once your files have been <strong>successfully delivered or accessed</strong>, the purchase is generally non-refundable and can&apos;t be cancelled. Change of mind, not having time to read it, or not getting the results you hoped for are not, on their own, grounds for a refund. The ebook is an educational toolkit and doesn&apos;t promise clients or income.</p>

      <h2>4. When we will put things right</h2>
      <p>The general position never applies where the product wasn&apos;t properly supplied. Contact support if:</p>
      <ul>
        <li><strong>You paid but didn&apos;t receive the files</strong>, or the download link didn&apos;t work.</li>
        <li><strong>A file is corrupted, won&apos;t open, or is incomplete.</strong></li>
        <li><strong>You received the wrong files</strong>, or the product is materially different from its description.</li>
        <li><strong>You were charged more than once</strong> for the same order.</li>
        <li><strong>You don&apos;t recognise a payment</strong> (an unauthorised transaction).</li>
      </ul>
      <p>We&apos;ll first try to fix the problem: by re-sending or replacing the files, or by correcting the order. If it can&apos;t be fixed, or a charge was duplicated or unauthorised, the affected amount will be refunded to the original payment method. Each report is reviewed on its own facts; a refund isn&apos;t automatic for every complaint.</p>

      <h2>5. Unauthorised transactions</h2>
      <p>If you don&apos;t recognise a payment, contact your bank or card issuer straight away as well as us. Your bank&apos;s dispute and chargeback rights are unaffected by this policy.</p>

      <h2>6. How to report a problem</h2>
      <p>Contact support at <SupportContact />. Include:</p>
      <ul>
        <li>the email address used at checkout;</li>
        <li>the payment or order reference;</li>
        <li>what went wrong, with a screenshot if relevant.</li>
      </ul>
      <p>Please report delivery or file problems as soon as you notice them. The support response time will be published on the <Link href="/contact">contact page</Link>.</p>

      <h2>7. How refunds are paid</h2>
      <p>Approved refunds are returned to the original payment method through the payment provider. How long the money takes to appear depends on your bank and payment method.</p>

      <h2>8. Your rights under the law</h2>
      <p>Nothing in this policy excludes or limits any remedy you have under applicable law, including the Consumer Protection Act, 2019 and the rules made under it. Where the law gives you a right to a refund, repair or replacement, that right applies.</p>
    </LegalPage>
  );
}
