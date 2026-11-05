import { brand, deliveryLive, policies, product } from "./product";

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "What is ZERO TO FIRST CLIENT?",
    a: `A 142-page practical handbook, published by ${brand.publisher} and sold by ${brand.seller}. It walks you from choosing an AI-assisted service to building an offer, finding prospects, sending proposals and running your first 30 days. It comes with 141 prompts, 20 templates, a 7-sheet calculator workbook and 24 diagrams.`,
  },
  {
    q: "What language is it written in?",
    a: "Explanations are in Hindi (Devanagari script), with business terms like lead, proposal and invoice in English. AI prompts and message scripts are in English or Roman Hinglish, ready to copy. It suits readers who are comfortable reading Hindi.",
  },
  {
    q: "Is it suitable for complete beginners?",
    a: "Yes. It's written for students, beginners and first-time freelancers: plain explanations, worked examples, and exercises plus a checklist in every chapter. You'll need at least one skill you're willing to develop.",
  },
  {
    q: "What exactly is included?",
    a: "The 142-page ebook (PDF), 141 AI prompts (the 104-prompt library is also a separate PDF), 20 templates as editable files (14 Word, 6 Excel), the 7-sheet BUSINESS_CALCULATORS.xlsx workbook, 24 diagrams inside the book, a printable template collection and a business resource directory.",
  },
  {
    q: "What are the calculator sheets for?",
    a: "Hourly Rate, Project Pricing, Profit, Monthly Target, Lead Conversion, Client Tracker and Demand Score. They help you find a minimum rate, price packages, check real profit, plan activity, find your weakest funnel stage, and make a Go / Refine / Drop decision. Example values are illustrations, not benchmarks.",
  },
  {
    q: "Is this a physical book?",
    a: "No. It's a digital product: a PDF ebook plus DOCX, XLSX and PDF companion files. It works on phone, tablet and computer; editing the templates is easiest on a laptop.",
  },
  {
    q: "How will I receive it?",
    a: deliveryLive
      ? "After your payment is verified, you receive a secure download link by email. See the Digital Delivery Policy for details."
      : "Files are delivered only after your payment has been verified by the payment provider, never from a public link. Checkout and delivery are still being set up; the Digital Delivery Policy explains the process.",
  },
  {
    q: "Do I need paid AI tools?",
    a: `No. The book's starter stack uses free plans, and it advises buying a paid tool only when a client deliverable genuinely needs it. Prices in the book are dated to ${product.researchCutoff}.`,
  },
  {
    q: "Does this guarantee my first client or any income?",
    a: "No. The book teaches a process. Results depend on your skills, effort, market and timing. It focuses on what you control: your offer, proof, pipeline and data.",
  },
  {
    q: "Is it useful in India and internationally?",
    a: "It's written India-first: every chapter has an Indian market note, and Chapter 6 covers Udyam, GST and income-tax basics as general education. Every chapter also has an international note, and Chapter 6 covers working with foreign clients.",
  },
  {
    q: "Can I get a refund?",
    a: "Digital downloads are generally non-refundable once successfully delivered or accessed, so please review the contents and previews first. If a file is missing, corrupted, inaccessible, charged twice or not what was described, contact support so it can be put right. The Refund and Cancellation Policy has the full details.",
  },
  {
    q: "Are updates included?",
    a: policies.updates ?? `This is Edition 1.0 of the 2026 Edition, researched up to ${product.researchCutoff}. An update policy for buyers hasn't been announced yet.`,
  },
];
