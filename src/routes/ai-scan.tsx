import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat is een AI-scan precies?",
    a: "Een procesanalyse van twee weken waarin we drie tot vijf kernprocessen in je bedrijf doorlichten, een kansenkaart maken met de verwachte besparing en terugverdientijd per kans, je huidige AI-tools inventariseren en checken waar je nu al aan de AI Act moet voldoen.",
  },
  {
    q: "Wat kost de AI-scan?",
    a: "€1.450 eenmalig, vaste prijs, geen nacalculatie. Ga je daarna met ons verder, dan is dat bedrag volledig verrekenbaar met het vervolgtraject.",
  },
  {
    q: "Wij zijn een klein bedrijf. Is een scan niet iets voor grote organisaties?",
    a: "Juist niet. Bij grote organisaties verdwijnt AI in vergadercycli. In een mkb-bedrijf kun je een proces in twee weken aanpassen en het effect meteen zien. 66,2% van de bedrijven met meer dan 250 medewerkers gebruikt AI, tegenover 13,8% van de bedrijven met minder dan tien (CBS, 2025) — dat gat is nu nog een voorsprong die je kunt pakken.",
  },
  {
    q: "Wat als uit de scan blijkt dat AI niets oplevert?",
    a: "Dan zeggen we dat. Je krijgt het rapport en de roadmap en kunt daar zelf mee verder, of ermee naar een andere partij. We houden niets achter — dat is precies waarom bedrijven bij een specialist 67% slaagkans hebben tegenover 33% bij zelf bouwen (MIT NANDA, 2025).",
  },
  {
    q: "Hoe lang duurt het en wat gebeurt er daarna?",
    a: "Twee weken van intake tot presentatie. Wil je door naar een pilot, dan bouwen we binnen twee tot vier weken de automatisering met de kortste terugverdientijd, met een nulmeting vooraf en één afgesproken KPI.",
  },
  {
    q: "Is de AI-scan ook beschikbaar in Amsterdam op locatie?",
    a: "Ja. We werken landelijk, maar met focus op Amsterdam en omgeving kunnen we de scan-gesprekken gewoon bij je op kantoor doen. Online kan ook.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Wat je krijgt voor €1.450",
    body: "Geen los adviesrapport dat in een la verdwijnt, maar een concreet vertrekpunt: precies welke processen AI-winst opleveren, wat dat kost, en wat je als eerste zou moeten aanpakken.",
    bullets: [
      "Procesanalyse van drie tot vijf kernprocessen",
      "Kansenkaart: per kans de verwachte besparing, kosten en terugverdientijd",
      "Toolinventarisatie: wat je al hebt, wat overbodig is, wat ontbreekt",
      "AI Act-check: waar je nu niet aan de regels voldoet en wat dat kost om op te lossen",
      "Roadmap voor zes maanden, geprioriteerd op terugverdientijd",
      "Presentatie van de uitkomsten aan jou en je team",
    ],
  },
  {
    heading: "Waarom eerst een scan, niet meteen een tool",
    body: "95% van de generatieve-AI-pilots levert geen meetbaar resultaat op de winst-en-verliesrekening (MIT NANDA, The GenAI Divide, 2025). De meest voorkomende oorzaak: de tool wordt op een kapot proces geplakt. Dat is één van [vijf oorzaken die in elk onderzoek terugkomen](/blog/waarom-ai-pilots-mislukken). Bedrijven die AI succesvol opschalen hebben hun werkprocessen fundamenteel herontworpen — 73% van hen, tegenover 25% van de rest (McKinsey, State of AI 2026). De scan tekent eerst uit hoe het werk nu écht loopt, vaak blijkt de helft van de stappen overbodig.",
    bullets: [
      "Voorkomt dat je een dure tool koopt voor het verkeerde probleem",
      "Nulmeting vooraf, zodat je achteraf kunt bewijzen wat het scheelde",
      "Eén concrete kansenkaart in plaats van een vaag AI-gevoel",
    ],
  },
  {
    heading: "Wat er na de scan gebeurt",
    body: "De scan is geen verplichting tot meer. Kies je voor een vervolg, dan bouwen we eerst één pilot — de kans met de kortste terugverdientijd — met een nulmeting en één afgesproken KPI. Werkt die, dan rollen we de rest van de roadmap uit. Elke fase kun je stoppen; er is geen jaarcontract. Wat elke fase kost staat op [tarieven](/tarieven).",
    bullets: [
      "Fase 2 — Pilot: 2 tot 4 weken, één automatisering, meetbaar resultaat na 30 dagen",
      "Fase 3 — Uitrol: 4 tot 12 weken, de rest van de roadmap plus training van je team",
      "Fase 4 — Beheer: doorlopend, maandelijks opzegbaar na de eerste drie maanden",
    ],
  },
];

export const Route = createFileRoute("/ai-scan")({
  head: () => ({
    meta: [
      { title: "AI-scan voor het MKB — weet binnen 2 weken waar AI geld oplevert" },
      {
        name: "description",
        content:
          "De AI-scan (€1.450) brengt in twee weken in kaart waar AI in jouw bedrijf geld of tijd oplevert — met kansenkaart, toolinventarisatie, AI Act-check en een roadmap voor zes maanden.",
      },
      { property: "og:title", content: "AI-scan voor het MKB — vaste prijs, twee weken" },
      {
        property: "og:description",
        content:
          "Procesanalyse, kansenkaart en roadmap voordat je in een AI-tool investeert. Vaste prijs €1.450, verrekenbaar bij vervolgopdracht.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-scan") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI-scan"
      title="AI-scan voor het MKB: weet binnen twee weken waar AI geld oplevert"
      intro="De meeste mkb-bedrijven weten wel dát ze iets met AI moeten. Bijna niemand weet wát, en in welke volgorde. De AI-scan haalt die onzekerheid weg voordat je ergens aan vastzit — vaste prijs, twee weken, volledig verrekenbaar als je daarna met ons verder gaat."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
