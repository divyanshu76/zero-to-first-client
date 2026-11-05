/** Landing-page copy grounded in the PDF. Scenario examples come from the book's own hypothetical scenarios. */

export const navLinks = [
  { href: "#inside", label: "What's inside" },
  { href: "#preview", label: "Preview" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export const tickerItems = [
  "The 2026 Edition",
  "A practical starter kit for your first client journey",
  "142 pages · 10 chapters · 141 AI prompts",
  "20 templates · 7 calculator sheets · 24 diagrams",
] as const;

export const painPoints = [
  "I don't know which service I can actually sell.",
  "I know about AI, but not how to use it commercially.",
  "I don't know how to find potential clients.",
  "I don't know how much to charge.",
  "I don't know how to approach a business.",
  "I want a roadmap, not random videos.",
] as const;

export const beforeAfter = [
  { before: "Offering “everything” to everyone", after: "One service, picked with a scoring matrix and a minimum-demand rule" },
  { before: "Prompting at random, sending unchecked AI output", after: "RCTFV prompting and a fact-check step before anything reaches a client" },
  { before: "A skill with no buyer, package or price", after: "Basic, Standard and Premium packages with scope, revisions and exclusions" },
  { before: "Ten messages, then silence — or 500 copy-pastes", after: "A warm list, qualified prospects and one real observation per message" },
  { before: "A price guessed on the spot", after: "A floor price from the calculators and a one-page proposal" },
] as const;

export const differentiators = [
  { title: "Build as you read", body: "Each chapter ends with exercises, a checklist and an assignment. Its output feeds the next chapter." },
  { title: "Workflow cards", body: "Key tasks are laid out as What, Why, How, Tool, Output, Verify and Mistakes." },
  { title: "Prompts that tell you what to check", body: "All 141 prompts state their purpose, the expected output and what to verify." },
  { title: "Honest about limits", body: "Hypothetical examples are labelled, prices are dated, and the unverified points are listed." },
] as const;

export const applications = [
  { tag: "Local café", title: "Monthly social posts", output: "A one-page offer sheet (e.g. 8 designs + captions a month) and a small paid pilot.", chapters: "Ch. 1 & 3" },
  { tag: "Dental clinic", title: "A mobile-friendly website", output: "A labelled demo site, a 300–500 word case study and a first email built on one real observation.", chapters: "Ch. 5 & 8" },
  { tag: "Coaching centre", title: "Short-form video editing", output: "A package table by Reels, length, revisions and turnaround, plus sample edits.", chapters: "Ch. 3" },
  { tag: "Small office", title: "An AI workflow setup", output: "A workflow audit with a prompt pack, or two automations with a written SOP.", chapters: "Ch. 2 & 3" },
  { tag: "First enquiry", title: "From call to proposal", output: "A proposal with deliverables, timeline, 50% advance terms and a “not included” list.", chapters: "Ch. 6 & 8" },
  { tag: "Your pipeline", title: "Outreach you can measure", output: "Reply, call and close rates by stage, and one change to test next week.", chapters: "Ch. 10" },
] as const;

export const audience = [
  { title: "Students", body: "A small, focused service alongside your studies." },
  { title: "Complete beginners", body: "Plain explanations, worked examples and a checklist per chapter." },
  { title: "Aspiring freelancers", body: "From random gigs to a clear offer that can earn repeat work." },
  { title: "AI enthusiasts", body: "Turn tool knowledge into deliverables someone would pay for." },
  { title: "Career changers", body: "Test a service idea with limited investment, without quitting first." },
  { title: "Small business owners", body: "Understand practical AI workflows for a new service line." },
] as const;

export const notFor = [
  "You want quick money without learning or doing the work.",
  "You're looking for shortcuts: fake reviews, bought lists or bulk spam.",
  "You expect a business that runs itself.",
  "You want to sell regulated advice (legal, medical, investment) without the qualification.",
] as const;

export const journey = [
  { step: "Understand", chapters: "Ch. 1–2", body: "What a service business is, and what AI can and can't do." },
  { step: "Choose", chapters: "Ch. 1 & 4", body: "Score ideas, pick one buyer, test real demand." },
  { step: "Build", chapters: "Ch. 3 & 5", body: "Three packages, a pilot offer and labelled demo work." },
  { step: "Present", chapters: "Ch. 6–7", body: "A price floor, a one-page proposal, trust-building content." },
  { step: "Reach out", chapters: "Ch. 8", body: "Warm list, qualified prospects, personal messages, calls." },
  { step: "Improve", chapters: "Ch. 9–10", body: "Deliver well, review weekly, decide on Day 30 with data." },
] as const;

export type Preview = { src: string; title: string; caption: string; page: string };

export const previews: Preview[] = [
  { src: "/images/pages/contents.webp", title: "Table of contents", caption: "Four stages, ten chapters and four bonus sections.", page: "p. ix" },
  { src: "/images/pages/roadmap.webp", title: "Learning roadmap", caption: "Figure 1 — the whole journey across ten chapters.", page: "p. viii" },
  { src: "/images/pages/chapter-01.webp", title: "Chapter opener", caption: "Every chapter opens with an introduction and learning objectives.", page: "p. 1" },
  { src: "/images/pages/prompt-framework.webp", title: "Prompt framework", caption: "Figure 5 — RCTFV, followed by the first essential prompts.", page: "p. 13" },
  { src: "/images/pages/packages.webp", title: "Packages diagram", caption: "Figure 7 — tiers that differ in scope, not just price.", page: "p. 22" },
  { src: "/images/pages/market-research.webp", title: "Research decision rule", caption: "Figure 8 — five research steps ending in Go, Refine or Drop.", page: "p. 30" },
  { src: "/images/pages/pricing.webp", title: "Pricing", caption: "Figures 13–14 — floor, range and ceiling, with a hypothetical calculation.", page: "p. 47" },
  { src: "/images/pages/prompt-library.webp", title: "Prompt library", caption: "Bonus A — each prompt has a purpose, output and verify step.", page: "p. 90" },
  { src: "/images/pages/templates.webp", title: "Template", caption: "Bonus B — printable templates with fictional example rows.", page: "p. 106" },
  { src: "/images/pages/calculators.webp", title: "Calculators", caption: "Bonus C — what each of the 7 sheets takes in and gives back.", page: "p. 120" },
  { src: "/images/pages/thirty-days.webp", title: "Your first 30 days", caption: "Figure 24 — four weekly milestones and their outputs.", page: "p. 83" },
];

export const policyLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms and Conditions" },
  { href: "/refund", label: "Refund and Cancellation" },
  { href: "/delivery", label: "Digital Delivery" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/copyright", label: "Copyright and License" },
] as const;
