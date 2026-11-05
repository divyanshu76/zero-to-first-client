import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("disclaimer", "en");

export default function Page() {
  return <PolicyPage slug="disclaimer" locale="en" />;
}
