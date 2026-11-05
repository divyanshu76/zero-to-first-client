import { AnnouncementBar, Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { Inside } from "@/components/landing/Inside";
import { Applications, Audience, ChaptersSection, Deliverables, Different, Journey, Outcomes } from "@/components/landing/Sections";
import { Preview } from "@/components/landing/Preview";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer, MobileStickyCta } from "@/components/landing/Closing";
import { JsonLd } from "@/components/landing/JsonLd";

export default function Home() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <AnnouncementBar />
      <Navbar />
      <main id="main">
        <Hero />
        <Problem />
        <Inside />
        <ChaptersSection />
        <Applications />
        <Audience />
        <Different />
        <Preview />
        <Journey />
        <Outcomes />
        <Deliverables />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <MobileStickyCta />
      <JsonLd />
    </>
  );
}
