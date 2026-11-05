import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("privacy", "hi");

export default function Page() {
  return <PolicyPage slug="privacy" locale="hi" />;
}
