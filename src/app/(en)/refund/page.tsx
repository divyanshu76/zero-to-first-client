import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("refund", "en");

export default function Page() {
  return <PolicyPage slug="refund" locale="en" />;
}
