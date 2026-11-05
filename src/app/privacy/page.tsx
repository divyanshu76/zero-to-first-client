import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";
import { product } from "@/data/product";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" status="The full privacy policy will be published before checkout opens. This page describes how the site works today.">
      <h2>This website today</h2>
      <p>This landing page does not set cookies, does not run analytics or advertising trackers, and has no forms that collect personal information.</p>
      <h2>Purchases</h2>
      <p>Checkout is not open yet. When it opens, payments will be handled by a third-party payment provider, and this policy will explain what information is collected, why, and how long it is kept.</p>
      <h2>Contact</h2>
      <p>Questions: <a href={product.contactUrl}>{product.contactUrl.replace(/^https?:\/\//, "")}</a></p>
    </LegalPage>
  );
}
