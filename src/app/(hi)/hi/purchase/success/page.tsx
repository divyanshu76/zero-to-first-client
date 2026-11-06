import { PurchasePage, purchaseMetadata } from "@/components/commerce/PurchasePage";

export const metadata = purchaseMetadata("hi");

export default function Page() {
  return <PurchasePage locale="hi" />;
}
