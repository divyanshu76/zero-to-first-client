import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";
import { policies, product } from "@/data/product";

export const metadata: Metadata = { title: "Refund Policy", alternates: { canonical: "/refund" } };

export default function Refund() {
  return (
    <LegalPage title="Refund Policy" status={policies.refund ? undefined : "The refund policy has not been published yet. It will appear here before checkout opens."}>
      {policies.refund ? <p>{policies.refund}</p> : <p>Until then, nothing can be purchased on this site. For questions, contact <a href={product.contactUrl}>{product.publisher}</a>.</p>}
    </LegalPage>
  );
}
