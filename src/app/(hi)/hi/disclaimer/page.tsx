import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("disclaimer", "hi");

export default function Page() {
  return <PolicyPage slug="disclaimer" locale="hi" />;
}
