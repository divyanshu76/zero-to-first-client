/**
 * Chapter data verified against the PDF table of contents (pp. ix–x) and each
 * chapter's "Learning objectives", "Completion checklist" and
 * "Next-step assignment" boxes. Titles are the book's exact chapter titles.
 * Descriptions are original summaries — not translations of the book text.
 */

export type StageId = "find" | "build" | "get-client" | "execute";

export type Chapter = {
  number: number;
  title: string;
  stage: StageId;
  /** Book page where the chapter starts. */
  page: number;
  hook: string;
  summary: string;
  learn: string[];
  application: string;
  outcome: string;
  /** Section headings from the book's table of contents. */
  sections: string[];
  prompts: string;
  figures: number[];
};

export const stages: { id: StageId; label: string; title: string; chapters: number[]; builds: string }[] = [
  { id: "find", label: "Stage 01", title: "Find your business", chapters: [1, 2, 3], builds: "Idea, AI toolkit, offer and packages" },
  { id: "build", label: "Stage 02", title: "Build your business", chapters: [4, 5, 6], builds: "Validation data, portfolio, pricing, proposal, business setup" },
  { id: "get-client", label: "Stage 03", title: "Get your first client", chapters: [7, 8, 9], builds: "Content, outreach system, calls, delivery and retention" },
  { id: "execute", label: "Stage 04", title: "Execute and grow", chapters: [10], builds: "30-day plan, tracker, weekly review" },
];

export const chapters: Chapter[] = [
  {
    number: 1,
    title: "Find Your First Business Idea",
    stage: "find",
    page: 1,
    hook: "Pick one service from ten — by scoring, not by feeling.",
    summary:
      "Replaces “what's the most profitable business?” with a better question: which paid service can you test this month with the skill, budget and contacts you already have? You score your options and commit to one focused service as a test, not a life decision.",
    learn: [
      "The difference between a skill, a service and a business model",
      "The realities of 10 low-investment services — likely buyers, starting tools and the biggest challenge of each",
      "Scoring three ideas on a weighted matrix (max 65) with a minimum-demand safety rule",
      "A 45-minute first check of demand and paid competitors",
      "Choosing a target customer specific enough to name 20 of them",
    ],
    application:
      "A student with Canva skills scores social media design against video editing and lead generation, then narrows it to “monthly posts for cafés” because the buyers are within walking distance.",
    outcome: "A chosen service, a target customer, a one-line business statement and a sheet of 20 possible buyers.",
    sections: [
      "What is a service business?",
      "Ten realistic low-investment services",
      "Skill assessment",
      "Business idea evaluation matrix",
      "Starting competitor research",
      "Choosing a target customer",
      "Writing your business statement",
      "Three hypothetical scenarios",
    ],
    prompts: "2 chapter prompts",
    figures: [2],
  },
  {
    number: 2,
    title: "Build Your AI Toolkit",
    stage: "find",
    page: 9,
    hook: "Where AI saves time, where it gets things wrong — and 25 prompts you can use today.",
    summary:
      "Sets up a small, low-cost toolkit and one habit that runs through the whole book: AI drafts, you verify. Covers hallucinations, client-data privacy, copyright and disclosure before handing you a prompt framework and a 25-prompt starter set.",
    learn: [
      "What AI does well — and what it can't be trusted with (current prices, laws, citations)",
      "A fact-check workflow to run before any AI output reaches a client",
      "Three responsible-use rules: privacy and client data, copyright, disclosure",
      "The RCTFV prompt framework: Role, Context, Task, Format, Verify",
      "A tool comparison of free and low-cost plans, dated to the research cutoff",
    ],
    application:
      "Before sending a client blog draft, you run the claim-extractor prompt, list every number and link, and check each against its original source.",
    outcome: "A chosen tool stack, a personal prompt document, written AI and client-data rules, and one completed sales-call role-play.",
    sections: [
      "What AI can and cannot do",
      "AI-assisted workflow",
      "Responsible AI use: three rules",
      "Tool comparison",
      "Prompt engineering fundamentals",
      "25 essential copy-paste prompts",
      "Basic automation: what to automate first",
    ],
    prompts: "25 essential prompts (C01–C25)",
    figures: [3, 4, 5],
  },
  {
    number: 3,
    title: "Turn Your Skill Into a Service",
    stage: "find",
    page: 21,
    hook: "Turn a skill into an offer a client can read once, understand and decide on.",
    summary:
      "“I make websites, tell me what you need” puts all the thinking on the client. This chapter removes that burden by defining who it's for, the result, the deliverables, the timeline and the terms — then packaging it into three clear tiers.",
    learn: [
      "Turning a skill into a specific offer: Buyer + Outcome + Deliverables + Timeline + Terms",
      "Building Basic, Standard and Premium packages that differ in scope, not just price",
      "Writing scope, revision limits and timeline triggers that protect both sides",
      "Designing a small paid pilot — and politely declining unpaid “test” work",
      "Four worked service examples: websites, social media, video editing, AI automation",
    ],
    application:
      "A video editor turns “I can edit video” into “8 Reels a month for clinics” with a fixed price, two revision rounds and three sample Reels built from stock footage.",
    outcome: "Three written packages, a revision definition, a pilot offer and a one-page offer sheet ready to test.",
    sections: [
      "Skill-to-service transformation",
      "Deliverables and packages",
      "Scope, revisions and timelines",
      "Pilot project: lower risk, real payment",
      "Professional service description",
      "Four detailed service examples",
      "Service Offer Worksheet",
    ],
    prompts: "2 chapter prompts",
    figures: [6, 7],
  },
  {
    number: 4,
    title: "Market Research",
    stage: "build",
    page: 30,
    hook: "Find out who will pay, how much and why — without paid tools.",
    summary:
      "Market research for a beginner isn't a big report. It's evidence-based answers to three questions: is the problem real, who pays for it, and will they buy from you? Five research steps end in a clear Go, Refine or Drop decision.",
    learn: [
      "Gathering evidence from Google Search, Google Trends, Instagram, LinkedIn and communities",
      "Building an evidence-backed customer persona and a competitor positioning map",
      "Running five customer interviews that ask about past behaviour, not opinions",
      "Testing willingness to pay before investing time or money",
      "Using a demand score to decide Go, Refine or Drop",
    ],
    application:
      "A web designer collects 20 real buyer phrases from search results and Maps reviews, interviews five clinic owners, and adds three of their exact lines to the offer.",
    outcome: "Search and Trends notes, a competitor sheet, five interviews, an updated persona and a written demand-score decision.",
    sections: [
      "Customer problems: finding the real language",
      "Customer persona",
      "Competitor analysis",
      "Customer interviews",
      "Willingness to pay",
      "Testing offers before investing",
    ],
    prompts: "1 chapter prompt, plus library #011–#020",
    figures: [8, 9, 10],
  },
  {
    number: 5,
    title: "Brand, Identity and Portfolio",
    stage: "build",
    page: 38,
    hook: "You can build trust without clients — and without lying.",
    summary:
      "A client's real question is “can this person do my job properly?” You don't need a big logo or a fancy site; you need clarity, proof and professional basics. Where you have no proof yet, you fill the gap with clearly labelled demo work, never with fake claims.",
    learn: [
      "Choosing a business name and domain, with naming and availability checks",
      "A basic brand identity and a professional email",
      "Building three labelled demo projects and writing them up as case studies",
      "Publishing a simple portfolio page",
      "Optimising your social profiles for the buyer you chose",
    ],
    application:
      "With no clients yet, you build a site for a fictional “Sunrise Dental” clinic, label it “Fictional brand”, and write a 300–500 word case study about the decisions behind it.",
    outcome: "A name, domain and email decision, a brand sheet, three projects with case studies, a live portfolio and updated profiles.",
    sections: [
      "Business name",
      "Basic brand identity",
      "Portfolio without clients",
      "Ethical credibility building",
      "Landing page and copy templates",
      "Social media optimisation",
    ],
    prompts: "1 chapter prompt",
    figures: [11, 12],
  },
  {
    number: 6,
    title: "Pricing, Proposals and Business Setup",
    stage: "build",
    page: 46,
    hook: "How to set a price, write a proposal, and which paperwork actually matters at the start.",
    summary:
      "Simplifies the two things that scare beginners most: “will anyone pay this?” and “what's GST and registration?” Price comes from your costs, the market and the client's value. The legal and tax material is general education, with conditional rules flagged clearly.",
    learn: [
      "Four pricing models — hourly, project, package and value-based — and when each fits",
      "Working out a minimum price from cost, time and margin",
      "The difference between a quotation and a proposal, with a one-page proposal structure",
      "Payment milestones and written agreements",
      "India basics: Udyam, GST and income tax — plus first steps for cross-border payments",
    ],
    application:
      "Before quoting a five-page website, you put your hours, a buffer and direct costs into the Project Pricing sheet, then send a proposal with 50% advance and a clear “not included” list.",
    outcome: "A calculated price floor, a proposal format and payment terms you can send with confidence.",
    sections: [
      "Pricing models",
      "Cost and rate calculation",
      "Quotation vs proposal",
      "Scope, milestones and agreements",
      "India: business setup basics",
      "International clients",
    ],
    prompts: "2 chapter prompts",
    figures: [13, 14, 15, 16],
  },
  {
    number: 7,
    title: "Marketing and Client Acquisition",
    stage: "get-client",
    page: 56,
    hook: "Not followers — trust and conversations. Organic marketing one person can run.",
    summary:
      "For a beginner, the goal of marketing isn't going viral. It's making sure that when a prospect looks you up, they understand what you do and see that your work is thoughtful. One primary channel, one support channel, weekly batching.",
    learn: [
      "Comparing organic channels and choosing just two",
      "Creating educational content that builds trust: teach, show, prove, invite",
      "Writing a CTA, a lead magnet and a simple funnel",
      "Running a beginner-friendly 30-day content calendar",
      "Tracking and outreach workflows without spam",
    ],
    application:
      "Instead of “DM for services!”, you offer to send two specific suggestions to three people who share their website link this week — a small commitment with real value.",
    outcome: "Two chosen channels, an updated profile, a 30-day calendar, your first content batch, a lead-magnet draft and a tracker.",
    sections: [
      "Channel selection",
      "Content that builds trust",
      "Simple marketing funnel",
      "30 social media content ideas",
      "15 LinkedIn post ideas",
      "10 Instagram Reel scripts",
      "10 short-video hooks",
      "Beginner-friendly content calendar",
      "Outreach tracking workflow",
    ],
    prompts: "1 chapter prompt",
    figures: [17],
  },
  {
    number: 8,
    title: "How to Get Your First Paying Client",
    stage: "get-client",
    page: 63,
    hook: "The full system from finding prospects to a “yes” — one you can repeat daily.",
    summary:
      "“Go find clients” is useless advice, so this chapter breaks it into small daily tasks: which ten businesses to look at today, what to write, what to do when nobody replies, what to ask on a call and what to say when you hear “it's too expensive”.",
    learn: [
      "Starting with a warm list before any cold outreach",
      "Finding and qualifying prospects through Maps, directories, Instagram and LinkedIn — manually",
      "Writing personalised messages built on one real observation, plus polite follow-ups",
      "Running a 30-minute discovery call and handling common objections",
      "Moving from proposal to payment, and spotting scams and bad clients",
    ],
    application:
      "You open a clinic's site on your phone, notice the appointment number is hard to find, and send a short email that names that one issue and links a labelled demo.",
    outcome: "A warm list, a 50-prospect target with qualification scoring, personalised scripts, call questions, objection responses and a 90-minute daily routine.",
    sections: [
      "Start with a warm list",
      "Where to find clients",
      "Personalised outreach",
      "Discovery call",
      "Handling objections",
      "Proposal and closing",
      "Avoiding scams and bad clients",
      "Fictional case study",
      "The First Client Acquisition System",
    ],
    prompts: "1 chapter prompt, plus library #050–#069",
    figures: [18, 19, 20],
  },
  {
    number: 9,
    title: "Client Delivery, Payment and Retention",
    stage: "get-client",
    page: 74,
    hook: "You got the first “yes”. Now do the work that earns a second project and a referral.",
    summary:
      "On a first project, communication matters more than skill. Clients often fear you'll vanish, run late or take the money. Good onboarding, regular updates and a limited revision loop reduce that fear — and set up repeat work.",
    learn: [
      "A 48-hour onboarding sequence, including safe handling of client access",
      "Writing requirements and a project plan",
      "Handling self-QA, revisions and final delivery",
      "Payment follow-ups and invoice management",
      "Ethical testimonials, referrals, retainers, complaint handling and a simple CRM",
    ],
    application:
      "After handover you send the invoice, check in on day 7 with a short feedback form, and only publish a testimonial once the client approves the exact wording in writing.",
    outcome: "An onboarding system, a delivery checklist, a payment-reminder ladder and a retention routine.",
    sections: [
      "Client onboarding",
      "Project planning and communication",
      "Deliverable management and QA",
      "Revisions",
      "Final delivery and payment",
      "Client satisfaction, testimonials and referrals",
      "Repeat business, retainers and CRM",
      "Complaint handling",
    ],
    prompts: "1 chapter prompt",
    figures: [21, 22, 23],
  },
  {
    number: 10,
    title: "Your First 30 Days",
    stage: "execute",
    page: 83,
    hook: "A realistic roadmap. No client guarantee — but a complete process and honest numbers.",
    summary:
      "Everything so far comes together in a day-by-day plan written for roughly 2–3 hours a day. It can't promise a client. What it does make sure of is that you've tested seriously, and that your next decision is based on data rather than feeling.",
    learn: [
      "Running a 30-day daily plan across four weekly milestones",
      "Measuring leads and conversion at each stage of your funnel",
      "Running a weekly review and changing one thing at a time",
      "Learning from rejection and from no response at all",
      "Making a written Day 30 decision about the next 30 days",
    ],
    application:
      "At the end of week 3 you see plenty of replies but no calls, so instead of switching niches you test a smaller ask — a free two-tip review — for one week.",
    outcome: "A calendar-blocked plan, a tracker, completed weekly reviews, 50 qualified leads, 20+ personal messages and a written Day 30 decision.",
    sections: [
      "Week 1: Choose and validate a service",
      "Week 2: Build portfolio and offer",
      "Week 3: Find and approach prospects",
      "Week 4: Conversations, proposals, closing",
      "Daily tracker and weekly review",
      "Performance metrics and conversion calculation",
      "Troubleshooting and what to do if nobody responds",
      "Day 30 decision",
    ],
    prompts: "1 chapter prompt",
    figures: [24],
  },
];
