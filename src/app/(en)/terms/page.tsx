import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("terms", "en");

export default function Page() {
  return <PolicyPage slug="terms" locale="en" />;
}
