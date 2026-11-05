import { policies, product } from "./product";

export type Faq = { q: string; a: string };

const PENDING = "This will be confirmed here before checkout opens.";

export const faqs: Faq[] = [
  {
    q: "What is ZERO TO FIRST CLIENT?",
    a: "A 142-page practical handbook from DEADCODE LABS that walks you from choosing an AI-assisted service to building an offer, finding prospects, sending proposals and running your first 30 days. It comes with 141 prompts, 20 templates, a 7-sheet calculator workbook and 24 diagrams.",
  },
  {
    q: "What language is the ebook written in?",
    a: "Explanations are written in Hindi (Devanagari script). Business terms like lead, proposal and invoice stay in English because that's what you'll see with clients and tools. AI prompts and message scripts are in English or Roman Hinglish so you can copy and use them directly. It's best suited to readers who are comfortable reading Hindi.",
  },
  {
    q: "Is this ebook suitable for complete beginners?",
    a: "Yes. It's written for students, beginners and first-time freelancers. Concepts are explained simply, examples are worked through, and every chapter ends with exercises and a checklist. The book does assume you have at least one skill you're willing to develop — for many first clients, a solid working level plus a small, clear scope can be enough.",
  },
  {
    q: "What exactly will I learn?",
    a: "How to pick a focused service, use AI tools responsibly, package your offer, research demand, build a portfolio without clients, price and write proposals, understand Indian business-setup basics, market yourself without spam, approach and follow up with prospects, run discovery calls, deliver and get paid, and run a 30-day plan with weekly reviews.",
  },
  { q: "How many chapters are included?", a: "Ten chapters, grouped into four stages: Find, Build, Get your first client, and Execute and grow. They're followed by four bonus sections (prompt library, templates, calculators and a resource directory), a sources appendix and a glossary." },
  {
    q: "Are the 141 prompts included?",
    a: "Yes. That's 25 essential prompts in Chapter 2, 12 chapter-specific prompts, and a 104-prompt library in Bonus A across 18 business tasks. The library is also provided as a separate PDF. Every prompt lists its purpose, expected output and what you should verify.",
  },
  {
    q: "Are the 20 templates included?",
    a: "Yes — printable versions inside the book (Bonus B) and editable files: 14 DOCX and 6 XLSX. They cover idea scoring, personas, competitor analysis, offers, proposals, quotations, scope of work, onboarding, invoices, trackers, a CRM and a 30-day planner. You can use and edit them in your own business, but you can't resell them as a separate product.",
  },
  {
    q: "What are the calculator sheets used for?",
    a: "BUSINESS_CALCULATORS.xlsx has seven sheets: Hourly Rate, Project Pricing, Profit, Monthly Target, Lead Conversion, Client Tracker and Demand Score. They help you find a minimum rate, price packages, check real profit, plan monthly activity, find your weakest funnel stage and make a Go/Refine/Drop decision. The example values are illustrations, not benchmarks.",
  },
  { q: "Is this a physical book or a digital product?", a: "Digital only. The ebook is a PDF, and the bonus files are DOCX, XLSX and PDF." },
  {
    q: "How will I receive the ebook?",
    a: policies.delivery ?? `Access is delivered after your payment is confirmed. The exact delivery method (email link or buyer download page) is being finalised. ${PENDING}`,
  },
  {
    q: "Can I access it on my phone?",
    a: "Yes — the PDF opens in any PDF reader on phone, tablet or computer, and its references and links are clickable. Editing the DOCX and XLSX templates is easier on a laptop, though they also open in the Google Docs and Sheets apps.",
  },
  {
    q: "Do I need paid AI tools?",
    a: "No. The book's suggested starter stack uses free plans: one AI chat tool, Google Docs and Sheets, Canva's free plan, Notion or Sheets, and a portfolio option. Its advice is to buy a paid tool only when a client deliverable genuinely needs it. Prices in the book are dated to " +
      product.researchCutoff +
      " and may change.",
  },
  {
    q: "Does this guarantee my first client?",
    a: "No. The book teaches a process. It doesn't promise clients, income, profit or any timeline — results depend on your skill, market, effort, timing and factors outside anyone's control. What it does focus on is the part you control: your offer, proof, pipeline and data.",
  },
  {
    q: "Is this useful for people in India?",
    a: "It's written India-first. Every chapter has an Indian market application, and Chapter 6 covers Udyam, GST and income-tax basics as general education — with a clear reminder to confirm your own situation with a CA or GST practitioner. Examples include local visits, regional-language communication and UPI advances.",
  },
  {
    q: "Is it useful internationally?",
    a: "Every chapter includes an international context note, and Chapter 6 covers working with foreign clients. That said, it's built around the Indian market, and explanations are in Hindi, so it's most useful to Hindi readers — in India or working with clients abroad.",
  },
  { q: "Will I need previous freelancing experience?", a: "No. It starts from zero: no service and no proof. You'll build demo projects, a portfolio and your first outreach as part of the exercises." },
  { q: "Are updates included?", a: policies.updates ?? `This is Edition 1.0 of the 2026 Edition, researched up to ${product.researchCutoff}. The update policy for buyers hasn't been announced yet. ${PENDING}` },
  { q: "What is the refund policy?", a: policies.refund ?? `The refund policy hasn't been published yet. ${PENDING}` },
];
