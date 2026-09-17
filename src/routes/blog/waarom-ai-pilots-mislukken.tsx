import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Hoeveel AI-pilots leveren daadwerkelijk iets op?",
    a: "95% van de generatieve-AI-pilots levert geen meetbaar resultaat op de winst-en-verliesrekening (MIT NANDA, The GenAI Divide, augustus 2025). Slechts 6% van de organisaties haalt meer dan 5% EBIT-impact uit AI, en 37% ziet überhaupt enig effect (McKinsey, State of AI 2026).",
  },
  {
    q: "Is het probleem de techniek?",
    a: "Bijna nooit. De vijf oorzaken die in elk onderzoek terugkomen gaan over proces, meting, tooloverload, wie het bouwt en beleid — niet over of de AI zelf goed genoeg is.",
  },
  {
    q: "Wat is de belangrijkste maatregel om een pilot te laten slagen?",
    a: "Eén harde KPI en een nulmeting, vooraf vastgelegd. Zonder meting kan niemand na de eerste bezuinigingsronde bewijzen wat het project opleverde, en sneuvelt het.",
  },
  {
    q: "Loont het om een specialist in te huren in plaats van zelf te bouwen?",
    a: "De cijfers zijn duidelijk: interne AI-bouwprojecten slagen in ongeveer 33% van de gevallen, samenwerken met een gespecialiseerde partij in 67% (MIT NANDA, 2025).",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Het cijfer waar niemand omheen kan",
    body: "95% van de generatieve-AI-pilots levert geen meetbaar resultaat op de winst-en-verliesrekening (MIT NANDA, The GenAI Divide, augustus 2025). 42% van de bedrijven schrapte in 2025 de meeste AI-initiatieven — een jaar eerder was dat nog 17% (S&P Global Market Intelligence, 2025). En 46% van de proofs-of-concept haalt de productiefase niet (S&P Global, 2025). Gartner voorspelt dat 40%+ van de agentic-AI-projecten vóór eind 2027 wordt geschrapt: oplopende kosten, onduidelijke waarde, gebrekkige risicobeheersing (Gartner, juni 2025). En van de duizenden aanbieders die zich 'AI-agents' noemen, zijn er volgens Gartner ongeveer 130 die het écht zijn — de rest plakt een etiket op oude software.",
  },
  {
    heading: "Reden 1 — de tool wordt op een kapot proces geplakt",
    body: "Bedrijven die AI succesvol opschalen hebben hun werkprocessen fundamenteel herontworpen: 73% van hen, tegenover 25% van de rest (McKinsey, State of AI 2026). De meesten automatiseren gewoon de bestaande rommel. Begin bij het proces, niet bij de tool: teken eerst uit hoe het werk nu écht loopt. Vaak blijkt de helft van de stappen overbodig — en dat is winst voordat er ook maar iets is geautomatiseerd. Dat uittekenen is precies wat de [AI-scan](/ai-scan) doet.",
  },
  {
    heading: "Reden 2 — niemand meet iets",
    body: "Geen nulmeting, geen KPI, dus geen bewijs. Bij de eerste bezuinigingsronde sneuvelt het project omdat niemand kan aantonen wat het opleverde. De oplossing is ongemakkelijk simpel: één harde KPI per automatisering, vooraf vastgelegd, met een nulmeting voordat er iets live gaat. Na 30 dagen zie je zwart op wit wat het scheelde in uren, doorlooptijd of omzet.",
  },
  {
    heading: "Reden 3 — twaalf losse tools die niet met elkaar praten",
    body: "Mkb'ers die met AI werken hebben gemiddeld 7 tot 12 verschillende AI-abonnementen, nauwelijks gekoppeld (Nafite, 2026). De rekening loopt op, het overzicht is weg. Eén architectuur met één beheerpunt verdient de sanering vaak al terug voordat er iets nieuws wordt gebouwd.",
  },
  {
    heading: "Reden 4 — zelf bouwen loopt drie keer zo vaak vast",
    body: "Interne AI-bouwprojecten slagen in ongeveer 33% van de gevallen. Samenwerken met een gespecialiseerde partij: 67% (MIT NANDA, 2025). Dat is geen kwestie van motivatie — het is ervaring die je koopt in plaats van zelf voor het eerst moet opdoen, met alle fouten die daarbij horen. Loopt jouw project al vast, dan is er meestal [meer te redden dan mensen denken](/ai-project-vastgelopen).",
  },
  {
    heading: "Reden 5 — geen beleid, geen naleving",
    body: "Gebrekkige risicobeheersing is een van de drie hoofdredenen waarom Gartner verwacht dat 40% van de agentic-AI-projecten sneuvelt. Sinds 2 augustus 2026 moet bovendien elke chatbot zich in de EU kenbaar maken als AI, en sinds 2 februari 2025 is AI-geletterdheidstraining al verplicht voor personeel dat met AI werkt (EU AI Act, art. 50). Wie dat niet meeneemt in het traject, betaalt het later alsnog — via een boete of via een project dat wordt stilgelegd. De AI Act-check zit standaard in onze [AI-consultancy](/ai-consultancy-mkb).",
  },
];

export const Route = createFileRoute("/blog/waarom-ai-pilots-mislukken")({
  head: () => ({
    meta: [
      { title: "Waarom 95% van de AI-pilots niets oplevert (en hoe dat anders kan)" },
      {
        name: "description",
        content:
          "95% van de generatieve-AI-pilots levert geen meetbaar resultaat op. De vijf oorzaken die in elk onderzoek terugkomen — en wat er per oorzaak wél werkt, met bronnen.",
      },
      { property: "og:title", content: "Waarom 95% van de AI-pilots niets oplevert" },
      {
        property: "og:description",
        content:
          "MIT NANDA, McKinsey, Gartner en S&P Global onderzochten waarom AI-projecten stranden. Vijf oorzaken, en wat elke oorzaak precies kost.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/blog/waarom-ai-pilots-mislukken") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="Blog"
      title="Waarom 95% van de AI-pilots niets oplevert (en hoe dat anders kan)"
      intro="Iedereen is bezig met AI. Bijna niemand haalt er resultaat uit. Dat is geen mening — dat is wat het onderzoek van 2025 en 2026 laat zien. Dit zijn de vijf oorzaken die in elk onderzoek terugkomen, en precies de vijf dingen die wij standaard anders aanpakken."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
