import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AgentsSection, PricingSection } from "@/components/sections/agents-pricing";
import { ChatbotSection } from "@/components/sections/chatbot";
import { ContactSection, SiteFooter } from "@/components/sections/contact";
import { FaqSection } from "@/components/sections/faq";
import { GovernanceSection, PersonSection } from "@/components/sections/governance";
import { Hero, TrustBar } from "@/components/sections/hero";
import { ProblemSection, ReasonsSection } from "@/components/sections/problem";
import { BranchesSection, ScanSection } from "@/components/sections/scan";
import { MethodSection, ServicesSection } from "@/components/sections/services";
import { SiteHeader } from "@/components/sections/site-header";
import { FAQ, SITE } from "@/content/site";

const TITLE = "AI-agency voor het MKB | Zakelijke AI Agents";
const DESCRIPTION =
  "95% van de AI-pilots levert niets op. Wij zorgen dat het bij jou wél werkt: AI-scan, consultancy, projectondersteuning en maatwerk automatiseringen voor het Nederlandse mkb.";
const URL = "https://zakelijkeaiagents.nl/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: SITE.name,
          description: DESCRIPTION,
          url: URL,
          areaServed: "NL",
          telephone: SITE.phone,
          serviceType: ["AI-consultancy", "AI-automatisering", "AI-implementatie"],
        }),
      },
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
