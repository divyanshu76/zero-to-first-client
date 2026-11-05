import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("privacy", "en");

export default function Page() {
  return <PolicyPage slug="privacy" locale="en" />;
}
