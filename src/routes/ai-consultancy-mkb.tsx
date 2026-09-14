import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat doet een AI-consultant voor het MKB precies?",
    a: "We brengen in kaart waar AI in jouw bedrijf écht iets oplevert — en waar niet. Dat omvat procesanalyse, een AI-scan, toolkeuze en -sanering, AI-beleid, de verplichte AI Act-check en een roadmap voor zes maanden, geprioriteerd op terugverdientijd.",
  },
  {
    q: "Wat kost AI-consultancy als we alleen advies willen?",
    a: "Dan blijft het bij de AI-scan (€1.450 eenmalig). Je krijgt het rapport en de roadmap en kunt daar zelf mee verder, of ermee naar een andere partij. Wil je losse expertise, dan rekenen we €695 per dagdeel of €1.195 per dag. Voor doorlopende begeleiding is er AI-partner à €2.450 per maand.",
  },
  {
    q: "We hebben al meerdere AI-tools. Kunnen jullie daar orde in scheppen?",
    a: "Ja. Mkb'ers die met AI werken hebben gemiddeld 7 tot 12 verschillende AI-abonnementen, nauwelijks gekoppeld (Nafite, 2026). We inventariseren wat er draait, zeggen op wat dubbelop is en koppelen wat blijft aan je CRM, agenda, inbox en administratie. Vaak verdient de sanering de scan al terug.",
  },
  {
    q: "Valt AI Act-naleving ook onder consultancy?",
    a: "Ja, standaard, zonder aparte compliance-factuur. We leggen vast welke data waar mag komen, wat de AI zelfstandig mag en wat langs een mens gaat, inclusief de AI-geletterdheidstraining die sinds 2 februari 2025 verplicht is.",
  },
  {
    q: "Is dit ook te doen als we niet direct willen bouwen?",
    a: "Zeker. Sommige klanten huren ons alleen in voor de strategiekant: waar liggen de kansen, wat schaf je aan of juist niet, en hoe zorg je dat je aan de regels voldoet. Bouwen kan altijd later, met ons of met een andere partij.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Voor wie wil weten waar AI écht iets oplevert — en waar niet",
    body: "AI-projecten stranden bijna nooit op de techniek. Ze stranden op alles eromheen: een tool geplakt op een kapot proces, geen meting, te veel losse abonnementen, zelf bouwen zonder ervaring, en geen beleid voor wat de AI wel en niet mag.",
    bullets: [
      "AI-scan: procesanalyse en kansenkaart met business case per kans",
      "Toolkeuze en -sanering: wat schaf je aan, wat zeg je op",
      "AI-beleid: welke data waar mag, wat de AI zelfstandig mag",
      "AI Act-check en verplichte AI-geletterdheidstraining voor je team",
      "Roadmap voor zes maanden, met prioritering op terugverdientijd",
    ],
  },
  {
    heading: "Grip en naleving, ook juridisch",
    body: "Het grootste bezwaar tegen AI is niet de prijs — het is de angst dat er iets de deur uit gaat waar je niet achter staat. Daarbovenop is AI sinds kort ook echt gereguleerd, en de meeste mkb-bedrijven weten niet dat een deel van die verplichtingen nu al voor hen geldt.",
    bullets: [
      "Sinds 2 februari 2025: AI-geletterdheid verplicht voor personeel dat met AI werkt",
      "Sinds 2 augustus 2026: elke chatbot moet zich kenbaar maken als AI",
      "Vanaf 2 december 2027: hoog-risicosystemen moeten aan zware eisen voldoen",
      "Boetes lopen op tot €15 miljoen of 3% van de wereldwijde jaaromzet (het laagste van beide voor mkb)",
    ],
  },
  {
    heading: "Advies dat je ook zonder ons verder helpt",
    body: "Je krijgt een rapport waar je ook zonder vervolgopdracht iets aan hebt. Kies je toch voor een vervolg, dan is de scan volledig verrekenbaar. We zeggen het ook als AI voor jouw proces geen oplossing is — dat scheelt regelmatig een hoop geld.",
  },
];

export const Route = createFileRoute("/ai-consultancy-mkb")({
  head: () => ({
    meta: [
      { title: "AI-consultancy & strategie voor het MKB" },
      {
        name: "description",
        content:
          "AI-consultancy voor het MKB: procesanalyse, toolkeuze, AI-beleid, AI Act-naleving en een roadmap voor zes maanden. Advies waar je ook zonder ons verder mee kunt.",
      },
      { property: "og:title", content: "AI-consultancy & strategie voor het MKB" },
      {
        property: "og:description",
        content:
          "Weten waar AI écht rendement oplevert, inclusief AI Act-naleving — zonder verplichte vervolgopdracht.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-consultancy-mkb") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI-consultancy"
      title="AI-consultancy & strategie voor het MKB"
      intro="Voor wie wil weten waar AI in het eigen bedrijf écht iets oplevert — en waar niet. Procesanalyse, toolkeuze, AI-beleid en de verplichte AI Act-check, samengevat in een roadmap die geprioriteerd is op terugverdientijd."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
