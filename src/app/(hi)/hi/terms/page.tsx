import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("terms", "hi");

export default function Page() {
  return <PolicyPage slug="terms" locale="hi" />;
}
