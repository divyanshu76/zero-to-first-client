/**
 * Included resources: verified against the book's "Download Your Resources" pages
 * (pp. xi–xii), Bonus A–D, and the file list on the resource hub. Template and sheet
 * names are the product's actual file/sheet names, so they're the same in every language.
 * Descriptions are in the dictionaries.
 */

/** Prompt counts, in the order of `inside.prompts.breakdown`. */
export const promptCounts = [104, 25, 12] as const;

export type Template = { n: number; name: string; format: "DOCX" | "XLSX" };

export const templates: Template[] = [
  { n: 1, name: "Business Idea Worksheet", format: "DOCX" },
  { n: 2, name: "Skill Assessment", format: "DOCX" },
  { n: 3, name: "Customer Persona", format: "DOCX" },
  { n: 4, name: "Competitor Analysis", format: "XLSX" },
  { n: 5, name: "Market Validation", format: "DOCX" },
  { n: 6, name: "Service Offer", format: "DOCX" },
  { n: 7, name: "Pricing Calculator", format: "XLSX" },
  { n: 8, name: "One-Page Business Plan", format: "DOCX" },
  { n: 9, name: "Portfolio Outline", format: "DOCX" },
  { n: 10, name: "Case Study", format: "DOCX" },
  { n: 11, name: "Client Proposal", format: "DOCX" },
  { n: 12, name: "Project Quotation", format: "DOCX" },
  { n: 13, name: "Scope of Work", format: "DOCX" },
  { n: 14, name: "Client Onboarding", format: "DOCX" },
  { n: 15, name: "Project Brief", format: "DOCX" },
  { n: 16, name: "Invoice", format: "DOCX" },
  { n: 17, name: "Outreach Tracker", format: "XLSX" },
  { n: 18, name: "Client CRM", format: "XLSX" },
  { n: 19, name: "Follow-Up Tracker", format: "XLSX" },
  { n: 20, name: "30-Day Business Planner", format: "XLSX" },
];

/** The 7 sheets of BUSINESS_CALCULATORS.xlsx (Bonus C, p. 120), in the order of `inside.calculators.when`. */
export const calculatorSheets = ["Hourly Rate", "Project Pricing", "Profit", "Monthly Target", "Lead Conversion", "Client Tracker", "Demand Score"] as const;

/** Diagram crops, in the order of `inside.diagrams.figures`. */
export const diagramFigures = [
  { n: 1, src: "/images/figures/figure-01.webp" },
  { n: 5, src: "/images/figures/figure-05.webp" },
  { n: 8, src: "/images/figures/figure-08.webp" },
  { n: 19, src: "/images/figures/figure-19.webp" },
] as const;

/** Files available to buyers (names as published on the resource hub), in the order of `pricing.files`. */
export const deliverableFiles = [
  "ZERO TO FIRST CLIENT — 2026 Edition (PDF)",
  "01_business_idea_worksheet.docx … 20_30_day_business_planner.xlsx",
  "BUSINESS_CALCULATORS.xlsx",
  "AI_PROMPTS.pdf",
  "TEMPLATES.pdf",
  "RESOURCE_DIRECTORY.pdf",
  "ZTFC_all_resources.zip",
] as const;
