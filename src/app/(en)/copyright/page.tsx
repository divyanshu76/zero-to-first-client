import { PolicyPage, policyMetadata } from "@/components/landing/PolicyPage";

export const metadata = policyMetadata("copyright", "en");

export default function Page() {
  return <PolicyPage slug="copyright" locale="en" />;
}
