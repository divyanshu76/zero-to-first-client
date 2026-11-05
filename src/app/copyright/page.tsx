import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SupportContact } from "@/components/landing/LegalPage";
import { brand, product } from "@/data/product";

export const metadata: Metadata = {
  title: "Copyright and License",
  description: "Who owns ZERO TO FIRST CLIENT, what your license lets you do with the ebook, templates and calculators, and what isn't allowed.",
  alternates: { canonical: "/copyright" },
};

export default function Copyright() {
  return (
    <LegalPage
      title="Copyright and License"
      summary={<>{product.name}, its text, diagrams, templates, calculators and companion files are © 2026 {brand.publisher}. All rights reserved. Buying the product gives you a license to use it; it doesn&apos;t transfer ownership.</>}
    >
      <h2>Your license</h2>
      <p>When you buy {product.name}, you receive a personal, non-exclusive, non-transferable license to:</p>
      <ul>
        <li>read the ebook and keep copies on your own devices;</li>
        <li>use and edit the templates and calculators in your own business, including for your own client work;</li>
        <li>print pages for your own use.</li>
      </ul>
      <p>No other license is granted unless one is offered to you in writing.</p>

      <h2>What isn&apos;t allowed</h2>
      <ul>
        <li>Copying, reselling or redistributing the ebook or any file, in whole or in part.</li>
        <li>Sharing download links or files with others, or uploading them to any website, drive, group or marketplace.</li>
        <li>Selling the templates or calculators as a separate product, or repackaging the material into another course, ebook or product.</li>
        <li>Removing copyright notices.</li>
      </ul>

      <h2>Quotes and reviews</h2>
      <p>Short quotes may be used for review or education with credit to the source, as the book&apos;s copyright page allows.</p>

      <h2>Third-party material</h2>
      <p>The book&apos;s fonts are used under the SIL Open Font License. Product names mentioned belong to their owners (see the <Link href="/disclaimer">Disclaimer</Link>). The animated 3D book on this website uses the open-source ThreeUI &ldquo;Bestseller Books&rdquo; component under the MIT License; its notice is published with the site.</p>

      <h2>Reporting misuse</h2>
      <p>If you find the product being shared or sold without permission, please report it to <SupportContact />.</p>
    </LegalPage>
  );
}
