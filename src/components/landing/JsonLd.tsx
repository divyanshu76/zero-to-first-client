import { brand, isPurchasable, pricing, product } from "@/data/product";
import { localePath, type Locale } from "@/i18n/config";

/**
 * Structured data from verified facts only. Offers are emitted only when buyers can
 * actually pay: a configured price and a live checkout URL. No ratings or reviews exist, so none are claimed.
 */
export function JsonLd({ locale, title, description, faqs }: { locale: Locale; title: string; description: string; faqs: { q: string; a: string }[] }) {
  const base = product.siteUrl.replace(/\/$/, "");
  const pageUrl = `${base}${localePath(locale, "/")}`.replace(/\/$/, "") + "/";
  const offers = Object.values(pricing)
    .filter(isPurchasable)
    .map((p) => ({
      "@type": "Offer",
      price: p.amount,
      priceCurrency: p.currency,
      url: `${base}/#pricing`,
      availability: "https://schema.org/InStock",
      seller: { "@id": `${base}/#seller` },
    }));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${base}/#seller`, name: brand.seller, url: brand.sellerUrl },
      { "@type": "Organization", "@id": `${base}/#publisher`, name: brand.publisher, url: brand.publisherUrl },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/`,
        name: `${product.displayName} by ${brand.seller}`,
        publisher: { "@id": `${base}/#seller` },
        inLanguage: ["en-IN", "hi-IN"],
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
        isPartOf: { "@id": `${base}/#website` },
        about: { "@id": `${base}/#book` },
      },
      {
        "@type": "Book",
        "@id": `${base}/#book`,
        name: `${product.name}: ${product.subtitle}`,
        alternateName: product.displayName,
        bookFormat: "https://schema.org/EBook",
        bookEdition: `${product.edition}, ${product.editionNumber}`,
        numberOfPages: product.pages,
        inLanguage: ["hi", "en"],
        datePublished: "2026-11-05",
        description: `${product.tagline} A practical handbook with 10 chapters, 141 AI prompts, 20 templates, 7 calculator sheets and 24 diagrams.`,
        image: `${base}/images/cover.webp`,
        url: `${base}/`,
        author: { "@id": `${base}/#publisher` },
        publisher: { "@id": `${base}/#publisher` },
        copyrightYear: 2026,
        ...(offers.length ? { offers } : {}),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />;
}
