import { faqs } from "@/data/faq";
import { pricing, product } from "@/data/product";

/** Structured data built only from verified product facts. Offers are emitted only once a real price + checkout exist. */
export function JsonLd() {
  const offers = Object.values(pricing)
    .filter((p) => p.amount !== null && p.checkoutUrl !== null)
    .map((p) => ({
      "@type": "Offer",
      price: p.amount,
      priceCurrency: p.currency,
      url: p.checkoutUrl,
      availability: "https://schema.org/InStock",
    }));

  const book = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: `${product.name}: ${product.subtitle}`,
    alternateName: product.displayName,
    bookFormat: "https://schema.org/EBook",
    bookEdition: `${product.edition}, ${product.editionNumber}`,
    numberOfPages: product.pages,
    inLanguage: ["hi", "en"],
    datePublished: "2026-11-05",
    description: `${product.tagline} A practical handbook with 10 chapters, 141 AI prompts, 20 templates, 7 calculator sheets and 24 diagrams.`,
    image: new URL("/images/cover.webp", product.siteUrl).toString(),
    url: product.siteUrl,
    author: { "@type": "Organization", name: product.publisher, url: product.publisherUrl },
    publisher: { "@type": "Organization", name: product.publisher, url: product.publisherUrl },
    copyrightYear: 2026,
    ...(offers.length ? { offers } : {}),
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const json = (o: object) => JSON.stringify(o).replace(/</g, "\\u003c");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(book) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(faq) }} />
    </>
  );
}
