import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("delivery", "en");

export default function Page() {
  return <PolicyPage slug="delivery" locale="en" />;
}
