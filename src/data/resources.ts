/**
 * Included resources — verified against the book's "Download Your Resources"
 * pages (pp. xi–xii), Bonus A–D, and the file list on the resource hub.
 * File names are the actual published file names.
 */

export const promptBreakdown = [
  { count: 104, label: "Bonus A prompt library", detail: "#001–#104 across 18 business tasks" },
  { count: 25, label: "Essential copy-paste prompts", detail: "C01–C25 in Chapter 2" },
  { count: 12, label: "Chapter-specific prompts", detail: "C-A to C-L, placed where you need them" },
] as const;

export const promptCategories = [
  "Business idea discovery",
  "Market research",
  "Customer personas",
  "Competitor analysis",
  "Service creation",
  "Brand positioning",
  "Portfolio development",
  "Website copywriting",
  "Social media content",
  "Lead generation",
  "Cold outreach",
  "Discovery calls",
  "Proposal creation",
  "Pricing",
  "Project management",
  "Client communication",
  "Workflow automation",
  "Business improvement",
] as const;

export type Template = { n: number; name: string; format: "DOCX" | "XLSX"; group: TemplateGroup };
export type TemplateGroup = "Plan" | "Offer & proof" | "Sell" | "Deliver" | "Track";

export const templates: Template[] = [
  { n: 1, name: "Business Idea Worksheet", format: "DOCX", group: "Plan" },
  { n: 2, name: "Skill Assessment", format: "DOCX", group: "Plan" },
  { n: 3, name: "Customer Persona", format: "DOCX", group: "Plan" },
  { n: 4, name: "Competitor Analysis", format: "XLSX", group: "Plan" },
  { n: 5, name: "Market Validation", format: "DOCX", group: "Plan" },
  { n: 6, name: "Service Offer", format: "DOCX", group: "Offer & proof" },
  { n: 7, name: "Pricing Calculator", format: "XLSX", group: "Offer & proof" },
  { n: 8, name: "One-Page Business Plan", format: "DOCX", group: "Plan" },
  { n: 9, name: "Portfolio Outline", format: "DOCX", group: "Offer & proof" },
  { n: 10, name: "Case Study", format: "DOCX", group: "Offer & proof" },
  { n: 11, name: "Client Proposal", format: "DOCX", group: "Sell" },
  { n: 12, name: "Project Quotation", format: "DOCX", group: "Sell" },
  { n: 13, name: "Scope of Work", format: "DOCX", group: "Sell" },
  { n: 14, name: "Client Onboarding", format: "DOCX", group: "Deliver" },
  { n: 15, name: "Project Brief", format: "DOCX", group: "Deliver" },
  { n: 16, name: "Invoice", format: "DOCX", group: "Deliver" },
  { n: 17, name: "Outreach Tracker", format: "XLSX", group: "Track" },
  { n: 18, name: "Client CRM", format: "XLSX", group: "Track" },
  { n: 19, name: "Follow-Up Tracker", format: "XLSX", group: "Track" },
  { n: 20, name: "30-Day Business Planner", format: "XLSX", group: "Track" },
];

/** The 7 sheets of BUSINESS_CALCULATORS.xlsx (Bonus C, p. 120). */
export const calculators = [
  { name: "Hourly Rate", when: "Before you price anything", input: "Monthly need, costs, tax reserve, billable hours", output: "Your minimum hourly rate" },
  { name: "Project Pricing", when: "While writing a quote", input: "Hours, buffer, direct costs, margin", output: "Floor price and quote for all three packages" },
  { name: "Profit", when: "After a project", input: "Revenue, costs, fees, actual hours", output: "Take-home, effective hourly rate, true profit" },
  { name: "Monthly Target", when: "Monthly planning", input: "Target, average price, assumed rates", output: "Projects, proposals, calls and messages needed" },
  { name: "Lead Conversion", when: "Weekly review", input: "Messages, replies, calls, proposals, won", output: "Stage-by-stage rates and your weakest stage" },
  { name: "Client Tracker", when: "Daily", input: "Lead details and status", output: "Status counts, pipeline, suggested next date" },
  { name: "Demand Score", when: "During Chapter 4", input: "Five 0–5 scores and buyer signals", output: "Go, Refine or Drop" },
] as const;

export const directoryCategories = [
  "AI tools",
  "Design tools",
  "Website builders and hosting",
  "Domain registrars and lookup",
  "Productivity tools",
  "Research tools",
  "Portfolio platforms and freelance marketplaces",
  "Payment providers",
  "Indian government business resources",
  "Tax and compliance resources",
  "International business resources",
] as const;

/** Files available to buyers (names as published on the resource hub). */
export const deliverables = [
  {
    title: "The main ebook",
    file: "ZERO TO FIRST CLIENT — 2026 Edition (PDF)",
    format: "PDF · 142 pages",
    body: "Ten chapters, 24 diagrams, worked hypothetical examples, chapter checklists and next-step assignments, plus Bonus A–D, a sources appendix and a glossary. Clickable references and links.",
  },
  {
    title: "Editable templates",
    file: "01_business_idea_worksheet.docx … 20_30_day_business_planner.xlsx",
    format: "14 DOCX · 6 XLSX",
    body: "All 20 templates as separate files to edit in Word, Excel, Google Docs or Sheets. A printable version of each also appears in Bonus B.",
  },
  {
    title: "Business calculators workbook",
    file: "BUSINESS_CALCULATORS.xlsx",
    format: "XLSX · 7 sheets",
    body: "Yellow cells for your numbers, purple cells for formulas. Example values are illustrations only — not benchmarks or income promises.",
  },
  {
    title: "AI prompt library",
    file: "AI_PROMPTS.pdf",
    format: "PDF · 104 prompts",
    body: "The full Bonus A library as a standalone file, so you can keep it open next to your AI tool.",
  },
  {
    title: "Printable template collection",
    file: "TEMPLATES.pdf",
    format: "PDF",
    body: "Every template in one printable document.",
  },
  {
    title: "Business resource directory",
    file: "RESOURCE_DIRECTORY.pdf",
    format: "PDF · 11 categories",
    body: "Tools, platforms, payment providers and official Indian and international business resources, with status as checked on the research cutoff date.",
  },
  {
    title: "Everything in one download",
    file: "ZTFC_all_resources.zip",
    format: "ZIP",
    body: "All 20 templates and the calculators in a single archive.",
  },
] as const;
