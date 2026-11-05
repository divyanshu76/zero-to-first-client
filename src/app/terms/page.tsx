import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";
import { product } from "@/data/product";

export const metadata: Metadata = { title: "Terms and Conditions", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms and Conditions" status="Full terms of sale will be published before checkout opens. The licence terms below are taken from the ebook's copyright page.">
      <h2>Licence</h2>
      <p>© 2026 {product.publisher}. All rights reserved. No part of the book may be copied, resold or redistributed without the publisher&apos;s written permission. Short quotes may be used for review or education with source credit.</p>
      <p>Buyers may use and edit the templates and calculators in their own business, but may not sell them as a separate product.</p>
      <h2>No guarantee</h2>
      <p>The book teaches a process. It does not promise clients, income, profit or any timeline. Results depend on your skill, market, effort, timing and other factors outside the publisher&apos;s control.</p>
      <h2>Not professional advice</h2>
      <p>Information about GST, income tax, FEMA, data protection and contracts is general education, not legal or tax advice. Rules change; consult a qualified Chartered Accountant, GST practitioner or advocate before making significant decisions. Tool prices and plans are a dated snapshot as of {product.researchCutoff}.</p>
      <h2>Trademarks</h2>
      <p>Product names mentioned in the book belong to their respective owners and are used for identification and education only. No partnership, sponsorship or endorsement is implied.</p>
    </LegalPage>
  );
}
