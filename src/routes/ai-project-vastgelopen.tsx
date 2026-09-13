import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wij hebben al een AI-project dat vastloopt. Kunnen jullie dat overnemen?",
    a: "Ja, dat is een van onze drie diensten. We kijken eerst wat er is gebouwd en waarom het blijft hangen. Vaak zit het niet in de techniek maar in het proces of de adoptie, en is er meer te redden dan mensen denken.",
  },
  {
    q: "Waarom lopen AI-projecten zo vaak vast?",
    a: "Meestal niet op de techniek. 46% van de proofs-of-concept haalt de productiefase niet, en 42% van de bedrijven schrapte in 2025 de meeste AI-initiatieven — een jaar eerder was dat nog 17% (S&P Global Market Intelligence, 2025). De oorzaken die steeds terugkomen: geen nulmeting of KPI, te veel losse tools, en een pilot die nooit is losgelaten van het team dat hem bouwde.",
  },
  {
    q: "We hebben het zelf geprobeerd te bouwen. Is dat de reden dat het vastloopt?",
    a: "Vaak wel, hoewel het zelden aan motivatie ligt. Interne AI-bouwprojecten slagen in ongeveer 33% van de gevallen; samenwerken met een gespecialiseerde partij in 67% (MIT NANDA, 2025). Je huurt dan ervaring in, niet enthousiasme — wij hebben de fouten al gemaakt die een eerste interne poging meestal kost.",
  },
  {
    q: "Wat als jullie ook geen verbetering kunnen brengen?",
    a: "Dan zeggen we dat eerlijk. We beginnen met een korte diagnose van wat er is gebouwd en waarom het vastzit. Blijkt AI daar niet de oplossing, dan besparen we je een vervolginvestering die niets oplevert.",
  },
  {
    q: "Kunnen jullie meedraaien zonder het project helemaal over te nemen?",
    a: "Ja. Dat varieert van meedraaien in een lopend intern project, een interim AI-lead voor een of twee dagen per week, tot een tweede mening op een offerte of voorstel van een andere leverancier.",
  },
  {
    q: "Hoe snel kunnen jullie instappen?",
    a: "Na een kort kennismakingsgesprek volgt meestal binnen een week de diagnose van het vastgelopen project. Daarna spreken we af of we meedraaien, overnemen, of alleen een second opinion geven.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Herkenbare symptomen van een vastgelopen AI-project",
    body: "Een pilot die al maanden 'bijna klaar' is. Een tool die niemand meer gebruikt. Een intern team dat vastloopt zonder dat iemand precies kan zeggen waarom. Dit zijn geen uitzonderingen — het is de norm. 40%+ van de agentic-AI-projecten wordt vóór eind 2027 geschrapt: oplopende kosten, onduidelijke waarde, gebrekkige risicobeheersing (Gartner, juni 2025).",
    bullets: [
      "Een pilot die al weken of maanden 'bijna klaar' is",
      "Niemand kan aantonen wat het project tot nu toe heeft opgeleverd",
      "Het team dat het bouwde is de enige die begrijpt hoe het werkt",
      "Losse tools die niet met elkaar of met je CRM praten",
    ],
  },
  {
    heading: "Wat we doen om het los te trekken",
    body: "We beginnen niet met meer bouwen, maar met diagnose: wat staat er, waarom loopt het vast, en is het de moeite waard om te redden? Daarna kiezen we samen de vorm die past.",
    bullets: [
      "Meedraaien in een lopend intern AI-project",
      "Een pilot die blijft hangen alsnog naar productie brengen",
      "Interim AI-lead, een of twee dagen per week",
      "Tweede mening op een offerte of voorstel van een andere leverancier",
      "Kennisoverdracht en begeleiding van je eigen mensen",
    ],
  },
  {
    heading: "Vanaf hier terug naar een werkend traject",
    body: "Zodra helder is wat er mis ging, volgen we dezelfde discipline als bij een nieuw project: één KPI, een nulmeting, en een vaste toets na 30 dagen of het werkt. Geen jaarcontract — blijkt het na de eerste fase alsnog niet te renderen, dan stoppen we.",
  },
];

export const Route = createFileRoute("/ai-project-vastgelopen")({
  head: () => ({
    meta: [
      { title: "AI-project vastgelopen? Zo breng je het alsnog naar productie" },
      {
        name: "description",
        content:
          "Een AI-pilot die blijft hangen, een intern project dat vastloopt of een leverancier die niet oplevert. Wij nemen over, draaien mee, of geven een tweede mening.",
      },
      { property: "og:title", content: "AI-project vastgelopen? Wij trekken het los" },
      {
        property: "og:description",
        content:
          "46% van de AI-proofs-of-concept haalt de productiefase niet. Diagnose, meedraaien of overname — zonder jaarcontract.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-project-vastgelopen") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="Projectondersteuning"
      title="AI-project vastgelopen? Zo breng je het alsnog naar productie"
      intro="Al bezig met AI, maar het loopt vast? Dat is geen uitzondering — het is bij de meeste bedrijven de norm. We kijken eerst wat er is gebouwd en waarom het blijft hangen, en helpen dan meedraaien, overnemen of met een tweede mening."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
