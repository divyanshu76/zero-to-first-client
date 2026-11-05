import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("contact", "en");

export default function Page() {
  return <PolicyPage slug="contact" locale="en" />;
}
