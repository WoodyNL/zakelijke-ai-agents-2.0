import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AgentsSection, PricingSection } from "@/components/sections/agents-pricing";
import { ChatbotSection } from "@/components/sections/chatbot";
import { PortalSection } from "@/components/sections/portal";
import { ContactSection, SiteFooter } from "@/components/sections/contact";
import { FaqSection } from "@/components/sections/faq";
import { GovernanceSection, PersonSection } from "@/components/sections/governance";
import { Hero, TrustBar } from "@/components/sections/hero";
import { ProblemSection, ReasonsSection } from "@/components/sections/problem";
import { BranchesSection, ScanSection } from "@/components/sections/scan";
import { MethodSection, ServicesSection } from "@/components/sections/services";
import { SiteHeader } from "@/components/sections/site-header";
import { FAQ, PRICING } from "@/content/site";
import { canoniek, offerCatalogJsonLd, paginaMeta } from "@/lib/seo";

const TITLE = "AI-agency voor het MKB | Zakelijke AI Agents";
const DESCRIPTION =
  "95% van de AI-pilots levert niets op. Wij zorgen dat het bij jou wél werkt: AI-scan, consultancy en maatwerk AI-automatisering voor het Nederlandse mkb.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: paginaMeta({ pad: "/", titel: TITLE, beschrijving: DESCRIPTION }),
    links: [canoniek("/")],
    scripts: [
      // Het bedrijf zelf wordt één keer beschreven, in de root. Hier stond
      // daarnaast een tweede beschrijving als ProfessionalService zonder
      // `@id`, en dan ziet een zoekmachine twee bedrijven die toevallig
      // dezelfde naam hebben. De aanbiedingen hieronder verwijzen nu met
      // `@id` naar die ene beschrijving in plaats van hem over te schrijven.
      { type: "application/ld+json", children: offerCatalogJsonLd(PRICING.cards) },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.items.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="theme-dark surface-gradient min-h-screen w-full overflow-x-hidden font-sans text-ink antialiased">
      <SiteHeader />
      <main>
        <Hero />
        <TrustBar />
        <ServicesSection />
        <ProblemSection />
        <ReasonsSection />
        <MethodSection />
        <ScanSection />
        <BranchesSection />
        <AgentsSection />
        <ChatbotSection />
        <PortalSection />
        <PricingSection />
        <GovernanceSection />
        <PersonSection />
        <FaqSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
