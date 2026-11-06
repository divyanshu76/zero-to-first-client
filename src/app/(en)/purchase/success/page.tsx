import { PurchasePage, purchaseMetadata } from "@/components/commerce/PurchasePage";

export const metadata = purchaseMetadata("en");

export default function Page() {
  return <PurchasePage locale="en" />;
}
