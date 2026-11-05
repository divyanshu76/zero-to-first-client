import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("contact", "hi");

export default function Page() {
  return <PolicyPage slug="contact" locale="hi" />;
}
