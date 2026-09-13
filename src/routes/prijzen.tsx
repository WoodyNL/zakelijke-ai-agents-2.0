import { createFileRoute } from "@tanstack/react-router";
import { PricingTiers } from "@/components/pricing-tiers";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat kost een AI agent bij Zakelijke AI Agents?",
    a: "Drie vaste pakketten: Start vanaf €495 per maand (plus €795 eenmalige setup) voor één agent, Groei vanaf €895 per maand voor twee agents, en Compleet vanaf €1.395 per maand voor alle drie agents. Prijzen zijn ex. btw.",
  },
  {
    q: "Zit ik vast aan een jaarcontract?",
    a: "Nee. Elk pakket kent een minimum van 3 maanden, daarna is het maandelijks opzegbaar met één maand opzegtermijn. Vergelijkbare AI-agentplatforms vragen vrijwel altijd een jaarcontract.",
  },
  {
    q: "Wat als ik meer leads of gesprekken heb dan mijn bundel?",
    a: "Extra leads of WhatsApp-gesprekken boven je bundel kosten €1,00 per stuk. WhatsApp-gesprekskosten die Meta rekent, rekenen wij kosteloos door — geen opslag.",
  },
  {
    q: "Hoe snel ben ik live na het kiezen van een pakket?",
    a: "Binnen een dag per agent. We koppelen je formulier, inbox, CRM en agenda tijdens de intake — geen technisch team aan jouw kant nodig.",
  },
  {
    q: "Kan ik later upgraden naar een groter pakket?",
    a: "Ja. Veel klanten starten met Start voor één agent en stappen later over naar Groei of Compleet zodra ze het effect zien. We rekenen dan alleen het verschil door.",
  },
  {
    q: "Zitten er verborgen kosten in de prijs?",
    a: "Nee. De genoemde bedragen zijn compleet: koppeling met je formulier of inbox, CRM- en agendakoppeling (vanaf Groei) en support zijn inbegrepen. Alleen leads/gesprekken boven je bundel en Meta's eigen WhatsApp-kosten worden apart doorbelast, tegen kostprijs.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Wat je voor die prijs krijgt",
    body: "Elk pakket bevat de volledige inrichting: koppeling met je formulier of inbox, training van de agent op jouw tone-of-voice en content, en een live-gang binnen een dag per agent. Groei en Compleet voegen CRM- en agendakoppeling, meerdere agents en meer capaciteit toe.",
    bullets: [
      "Setup, koppeling en training inbegrepen",
      "Geen apart implementatietraject van maanden",
      "Eigen klantportaal met live resultaten per agent",
      "Nederlandse ondersteuning tijdens en na de opzet",
    ],
  },
  {
    heading: "Waarom geen jaarcontract",
    body: "De meeste AI-agentplatforms binden je een heel jaar vast voordat je weet of het werkt. Wij kiezen voor een minimum van 3 maanden — genoeg om resultaat te zien — en daarna maandelijks opzegbaar. Zo blijft de investering laag risico.",
    bullets: [
      "3 maanden minimum, daarna maandelijks opzegbaar",
      "Eén maand opzegtermijn",
      "Geen boeteclausules bij tussentijds stoppen",
      "Upgraden naar een groter pakket kan op elk moment",
    ],
  },
];

export const Route = createFileRoute("/prijzen")({
  head: () => ({
    meta: [
      { title: "Prijzen — wat kost een AI agent voor sales of klantenservice?" },
      {
        name: "description",
        content:
          "Vaste prijzen voor AI agents die sales en klantenservice automatiseren: vanaf €495 per maand, geen jaarcontract. Bekijk de pakketten Start, Groei en Compleet.",
      },
      { property: "og:title", content: "Prijzen AI agents — vanaf €495 per maand" },
      {
        property: "og:description",
        content:
          "Drie vaste pakketten voor AI agents die leads kwalificeren, e-mail beantwoorden en opvolgen via WhatsApp. Geen jaarcontract.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/prijzen") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="Prijzen"
      title="Wat kost een AI agent voor sales of klantenservice?"
      intro="Drie vaste pakketten, geen verrassingen achteraf. Van één agent op één kanaal tot alle drie agents op onbeperkte kanalen — jij kiest, wij zetten het binnen een dag live."
      sections={SECTIONS}
      faqs={FAQS}
    >
      <div className="mt-8">
        <PricingTiers />
        <p className="mt-3 text-[11px]/[1.6] text-ink/55">
          Extra leads of WhatsApp-gesprekken boven je bundel: €1,00 per stuk.
          WhatsApp-gesprekskosten van Meta rekenen we kosteloos door. Prijzen ex. btw, 3 maanden
          minimum, daarna maandelijks opzegbaar.
        </p>
      </div>
    </SeoPage>
  );
}
