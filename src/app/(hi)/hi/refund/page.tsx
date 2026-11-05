import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("refund", "hi");

export default function Page() {
  return <PolicyPage slug="refund" locale="hi" />;
}
