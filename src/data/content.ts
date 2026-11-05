/** Landing-page copy grounded in the PDF. Examples marked hypothetical come from the book's own hypothetical scenarios. */

export const navLinks = [
  { href: "#overview", label: "Overview" },
  { href: "#inside", label: "What's Inside" },
  { href: "#chapters", label: "Chapters" },
  { href: "#benefits", label: "Benefits" },
  { href: "#faq", label: "FAQ" },
] as const;

export const painPoints = [
  "I want to start something but don't know where to begin.",
  "I don't know which service I can actually sell.",
  "I know about AI, but not how to use it commercially.",
  "I don't know how to find potential clients.",
  "I don't know how much to charge.",
  "I struggle to explain my service professionally.",
  "I don't know how to approach a potential customer.",
  "I want a practical roadmap, not random YouTube videos.",
] as const;

export const beforeAfter = {
  before: [
    { title: "Confused about what to offer", body: "“Website, logo, social media, video — everything.” Nothing stands out to any one buyer." },
    { title: "Random AI tool usage", body: "Prompting without a brief, and sending output nobody has fact-checked." },
    { title: "No clear positioning", body: "A skill, but no specific buyer, result or package anyone can say yes to." },
    { title: "Unstructured outreach", body: "Either ten messages and then giving up, or five hundred copy-pasted ones." },
    { title: "Unclear pricing", body: "A number guessed on the spot, then a discount before anyone has even asked." },
  ],
  after: [
    { title: "A service chosen by scoring", body: "A weighted matrix and a minimum-demand rule help you pick one focused service to test." },
    { title: "A verify-first AI habit", body: "The RCTFV framework, 141 prompts and a fact-check workflow before anything reaches a client." },
    { title: "A clearly defined offer", body: "Basic, Standard and Premium packages with scope, revisions, timelines and exclusions written down." },
    { title: "A repeatable outreach routine", body: "A warm list, qualified prospects, one real observation per message and polite follow-ups." },
    { title: "A price you can explain", body: "A floor price from the calculators, a one-page proposal and payment terms from day one." },
  ],
} as const;

export const applications = [
  {
    tag: "Local café",
    title: "Monthly social posts for neighbourhood cafés",
    problem: "Posts go up irregularly and the café owner doesn't have time to plan them.",
    apply: "Score social media design against your other options (Ch. 1), then turn it into a three-tier monthly package with a batch deadline and a revision limit (Ch. 3).",
    output: "A one-page offer sheet — for example, 8 designs with captions per month — plus a small paid pilot.",
    why: "The owner can see exactly what they get, by when and for how much, without having to brief you from scratch.",
  },
  {
    tag: "Dental clinic",
    title: "Simple, mobile-friendly websites for clinics",
    problem: "On a phone, the appointment number is hard to find without scrolling.",
    apply: "Build a clearly labelled demo for a fictional clinic (Ch. 5), then send a short message naming that one real observation (Ch. 8).",
    output: "A demo project, a 300–500 word case study and a personalised first email.",
    why: "It shows a clinic owner a specific fix for their own site — not a generic pitch.",
  },
  {
    tag: "Coaching centre",
    title: "Short-form video editing for coaches",
    problem: "Coaches want to post consistently but don't want to spend weekends editing.",
    apply: "Define a package by number of Reels, length, revision rounds and turnaround, and write down music-licence and raw-footage rules (Ch. 3).",
    output: "A package table and sample Reels built from stock footage.",
    why: "Clear limits reduce back-and-forth and make the monthly cost easy to approve.",
  },
  {
    tag: "Small team",
    title: "AI workflow setup for a small office",
    problem: "The team repeats the same admin steps every week and isn't sure what's safe to automate.",
    apply: "Map the process, separate steps that need human review, and run it manually ten times before automating (Ch. 2 and 3).",
    output: "A workflow audit with a prompt pack, or two automations with a written SOP.",
    why: "The client sees where their data goes, what stays human-reviewed, and what each tool costs.",
  },
  {
    tag: "Proposal",
    title: "Turning a discovery call into a proposal",
    problem: "A prospect is interested but asks for “a quote” — and you don't know what to put in it.",
    apply: "Run the 30-minute call structure (Ch. 8), then price with the Project Pricing sheet and the one-page proposal format (Ch. 6).",
    output: "A proposal with deliverables, timeline, investment, 50% advance terms and a “not included” list.",
    why: "It reads as considered and professional, and protects both sides from scope creep.",
  },
  {
    tag: "Your pipeline",
    title: "Organising outreach with real numbers",
    problem: "You've sent messages, but you can't tell what's working or what to change.",
    apply: "Track every lead in the Outreach Tracker and Client CRM, then use the Lead Conversion sheet in your weekly review (Ch. 10).",
    output: "Stage-by-stage reply, call, proposal and close rates — and one change to test next week.",
    why: "You stop guessing and change one thing at a time, based on your own data.",
  },
] as const;

export const audience = [
  { title: "Students", body: "A way to start a small, focused service alongside your studies." },
  { title: "Complete beginners", body: "Plain explanations, worked examples, and a checklist at the end of every chapter." },
  { title: "Aspiring freelancers", body: "Move from random gigs towards a clear offer and the habits that lead to repeat clients." },
  { title: "AI enthusiasts", body: "Turn what you know about AI tools into a deliverable someone would pay for — with a verification habit built in." },
  { title: "People exploring digital services", body: "Ten low-investment services compared, with likely buyers and starting tools for each." },
  { title: "Small business-minded individuals", body: "Test a business idea with limited investment — or understand AI workflows for a new service line." },
] as const;

export const notFor = [
  "You want quick money without learning or doing the work.",
  "You're looking for shortcuts like fake reviews, bought lists or bulk spam.",
  "You expect an automated business that runs without effort.",
  "You want to sell regulated work — legal, medical or investment advice — without the required qualification.",
  "You're an advanced practitioner looking for technical AI research. This is a practical business handbook.",
] as const;

export const differentiators = [
  { title: "A structured journey", body: "Four stages and ten chapters in order. Each chapter's output feeds the next, so you're building one system rather than collecting tips." },
  { title: "Build-as-you-read", body: "Every chapter ends with practical exercises, a completion checklist and a next-step assignment — a matrix, an offer, a portfolio page, a prospect list, a proposal." },
  { title: "Workflow cards", body: "Key tasks are laid out as What, Why, How, Tool, Tool use, Output, Verify and Mistakes — the whole job in one place." },
  { title: "Prompts with a verify step", body: "Every one of the 141 prompts states its purpose and expected output, and tells you what to check before you trust it." },
  { title: "Honest about limits", body: "Hypothetical examples are labelled, prices are dated to the research cutoff, and the appendix lists what couldn't be fully verified." },
  { title: "India-first, world-aware", body: "Indian market notes in every chapter — local visits, regional language, UPI, GST and Udyam basics — alongside international context for foreign clients." },
] as const;

export const journey = [
  { step: "Understand", chapters: "Ch. 1–2", body: "What a service business is, and what AI can and can't do for you." },
  { step: "Choose", chapters: "Ch. 1 & 4", body: "Score your ideas, pick one buyer and test real demand." },
  { step: "Build", chapters: "Ch. 3 & 5", body: "Three packages, a pilot offer and labelled demo work." },
  { step: "Present", chapters: "Ch. 6–7", body: "A price floor, a one-page proposal and trust-building content." },
  { step: "Reach out", chapters: "Ch. 8", body: "Warm list, qualified prospects, personal messages and calls." },
  { step: "Improve", chapters: "Ch. 9–10", body: "Deliver well, review weekly, and decide on Day 30 with data." },
] as const;

export const outcomes = [
  { title: "Identify a service opportunity", body: "You'll learn how to score ideas on skill, demand and feasibility." },
  { title: "Understand your target customer", body: "Work towards an evidence-backed persona built from real conversations." },
  { title: "Create a clearer service offer", body: "Learn how to write packages with scope, revisions and timelines." },
  { title: "Use AI prompts more effectively", body: "Practise RCTFV prompting and a fact-check habit." },
  { title: "Prepare client-facing materials", body: "Work towards a portfolio, case studies, a proposal and an invoice." },
  { title: "Understand basic pricing", body: "Learn how to calculate a minimum rate and explain your price." },
  { title: "Organise your outreach", body: "Build a tracker, a follow-up rhythm and a 90-minute daily routine." },
  { title: "Approach your first client more confidently", body: "Rehearse discovery calls and objections before the real ones." },
] as const;

export type Preview = { src: string; title: string; caption: string; page: string };

export const previews: Preview[] = [
  { src: "/images/pages/cover.webp", title: "Cover", caption: "The 2026 Edition cover.", page: "Cover" },
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
