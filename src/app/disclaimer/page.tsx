import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";
import { product } from "@/data/product";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "ZERO TO FIRST CLIENT is an educational toolkit: no guaranteed income or clients, not legal or tax advice, and AI output must be verified.",
  alternates: { canonical: "/disclaimer" },
};

export default function Disclaimer() {
  return (
    <LegalPage
      title="Disclaimer"
      summary={<>{product.name} is an educational and informational product. It teaches a process for starting an AI-assisted service business; it doesn&apos;t promise any particular outcome.</>}
    >
      <h2>No guarantee of income, clients or employment</h2>
      <p>The book doesn&apos;t promise clients, income, profit, employment or any timeline. Results depend on your skills, the effort you put in, your market, timing and many factors outside anyone&apos;s control. The people, businesses and numbers in the book&apos;s examples are hypothetical unless a source is given; they illustrate a method and are not benchmarks.</p>

      <h2>Not legal, tax or financial advice</h2>
      <p>Information about GST, income tax, FEMA, business registration, data protection and contracts is general education. Rules change and apply differently to different situations. Before a significant decision, consult a qualified Chartered Accountant, GST practitioner or advocate, and check the official source. Nothing in the book is investment advice: time and money put into a business are at risk.</p>

      <h2>AI output must be verified</h2>
      <p>The prompts are starting points. AI tools can produce incorrect facts, numbers, links or legal statements, sometimes confidently. Verify anything AI produces before relying on it or sending it to a client; you are responsible for what reaches your clients.</p>

      <h2>Third-party tools and platforms change</h2>
      <p>The book mentions third-party tools, platforms and services. Their features, prices, free plans and terms can change without notice, and the prices in the book are a snapshot as of {product.researchCutoff}. Mentions are for identification and education only; they don&apos;t imply partnership, sponsorship or endorsement. Follow each platform&apos;s rules: the book doesn&apos;t recommend scraping, bulk messaging or fake engagement.</p>

      <h2>Trademarks</h2>
      <p>Product names mentioned, such as ChatGPT, Claude, Gemini, Canva, Notion, Google, LinkedIn, Instagram, WhatsApp, Upwork and Fiverr, are trademarks of their respective owners.</p>
    </LegalPage>
  );
}
