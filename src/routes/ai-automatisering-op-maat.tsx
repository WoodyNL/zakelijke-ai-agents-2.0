import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat is het verschil tussen de kant-en-klare agents en maatwerk?",
    a: "De drie kant-en-klare agents (AI Sales Assistant, Inbox Draft Assistant, WhatsApp Follow-up Agent) lossen de meest voorkomende knelpunten op en staan meestal binnen een week live. Heb je een proces dat net anders werkt, of moet het aansluiten op een specifiek systeem, dan bouwen we maatwerk — dat duurt doorgaans twee tot vier weken van start tot werkende pilot.",
  },
  {
    q: "We hebben al ChatGPT. Wat voegen jullie toe?",
    a: "ChatGPT is een goede assistent voor een individu. Het is geen bedrijfsproces. Het kent je klanten niet, staat niet in je CRM, doet 's nachts niets en laat geen spoor na. Wij bouwen de laag die dat wél doet — en zorgen dat het aansluit op hoe jullie werken.",
  },
  {
    q: "Moeten wij technisch zijn om dit te laten werken?",
    a: "Nee. Jij levert toegang tot de systemen en je manier van werken aan. Wij doen de rest, inclusief het inwerken van je team.",
  },
  {
    q: "Wat gebeurt er met onze data?",
    a: "Die blijft binnen de EU en we sluiten een verwerkersovereenkomst. Je bepaalt zelf welke data de AI mag zien en wat er buiten blijft. Alles wat de AI doet, staat in een activiteitenlog.",
  },
  {
    q: "Kan de Inbox Draft Assistant zelfstandig mails versturen?",
    a: "Standaard niet. Hij zet een concept-antwoord klaar in jouw toon; jij keurt goed en verstuurt. Hij leert van elke wijziging die je maakt, zodat concepten steeds beter aansluiten.",
  },
  {
    q: "Wat kost een agent of maatwerkautomatisering?",
    a: "Een kant-en-klare agent kost €795 eenmalig plus €495 per maand voor één agent op één kanaal. Maatwerk loopt via een AI-traject: vanaf €4.500 eenmalig plus €395 per maand beheer, met een vaste prijs die na de scan wordt bepaald. Losse expertise gaat per dagdeel à €695.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Drie agents die je binnen een week live hebt",
    body: "Niet elk bedrijf heeft maatwerk nodig. Deze drie lossen de meest voorkomende knelpunten op in sales, inbox en opvolging — en staan meestal binnen een week te draaien.",
    bullets: [
      "AI Sales Assistant — leest elke nieuwe lead, kwalificeert, reageert binnen een minuut, boekt zelf de afspraak",
      "Inbox Draft Assistant — concept-antwoorden in Gmail of Outlook, geen autosend, jij beslist",
      "WhatsApp Follow-up Agent — volgt leads op via WhatsApp, draagt over aan een mens zodra het complex wordt",
    ],
  },
  {
    heading: "Of volledig op maat gebouwd",
    body: "Werkt jouw proces net anders, of moet de automatisering aansluiten op een systeem dat niet standaard gekoppeld is? Dan bouwen we het op maat, gekoppeld aan wat je al gebruikt.",
    bullets: [
      "Koppelingen met CRM, agenda, inbox, WhatsApp en administratie",
      "Automatiseringen op maat voor jouw specifieke werkproces",
      "Monitoring, beheer en doorontwikkeling in een maandabonnement",
      "Live binnen een week per kant-en-klare agent, maatwerk binnen enkele weken",
    ],
  },
  {
    heading: "Jij houdt de controle",
    body: "Het grootste bezwaar tegen AI is niet de prijs — het is de angst dat er iets de deur uit gaat waar je niet achter staat. Daarom bepaal jij per proces wat de AI zelfstandig mag, wat eerst langs een mens gaat en wanneer er wordt overgedragen.",
    bullets: [
      "Jij bepaalt per proces wat automatisch mag en wat langs een mens gaat",
      "Data blijft binnen de EU, met een verwerkersovereenkomst",
      "Alles wat de AI doet is terug te zien in een activiteitenlog",
    ],
  },
];

export const Route = createFileRoute("/ai-automatisering-op-maat")({
  head: () => ({
    meta: [
      { title: "Maatwerk AI-automatisering voor het MKB — kant-en-klaar of op maat" },
      {
        name: "description",
        content:
          "Kant-en-klare AI-agents voor sales, inbox en WhatsApp binnen een week live, of volledig maatwerk gekoppeld aan je eigen systemen. Jij houdt de controle.",
      },
      { property: "og:title", content: "Maatwerk AI-automatisering voor het MKB" },
      {
        property: "og:description",
        content:
          "Van kant-en-klare AI-agent tot volledig maatwerk, gekoppeld aan je CRM, agenda, inbox en WhatsApp.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-automatisering-op-maat") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="Maatwerk AI-automatisering"
      title="Maatwerk AI-automatisering voor het MKB — van idee naar werkende agent"
      intro="Heb je al een concreet proces in gedachten dat je wilt automatiseren? Dan kies je uit drie kant-en-klare agents die meestal binnen een week live staan, of laat je iets op maat bouwen dat aansluit op jouw systemen."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
