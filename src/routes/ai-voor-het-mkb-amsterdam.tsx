import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Werken jullie alleen in Amsterdam?",
    a: "We werken landelijk, maar onze focus ligt op Amsterdam en omgeving. Daardoor kunnen we snel schakelen en, in overleg, persoonlijk langskomen voor de intake of de AI-scan.",
  },
  {
    q: "Waarom is dit voor het MKB relevant en niet alleen voor grote bedrijven?",
    a: "66,2% van de bedrijven met meer dan 250 medewerkers gebruikt AI, tegenover 13,8% van de bedrijven met minder dan tien (CBS, 2025). Dat gat is een voorsprong die je nu nog kunt pakken: in een mkb-bedrijf kun je een proces in twee weken aanpassen en het effect meteen zien, zonder vergadercycli.",
  },
  {
    q: "Wat kost een eerste kennismaking?",
    a: "Niets. Een verkenning van 30 minuten waarin we naar één proces kijken waar het bij jullie schuurt, en eerlijk zeggen of AI daar iets oplevert — ook als het antwoord nee is.",
  },
  {
    q: "Kan de kennismaking bij ons op kantoor in Amsterdam?",
    a: "Ja, in overleg. We komen graag langs op je locatie in Amsterdam en omgeving. Liever online? Dat kan ook, in een videogesprek van 30 minuten.",
  },
  {
    q: "Voor welke Amsterdamse branches werkt dit het beste?",
    a: "Vooral waar AI-adoptie nu nog laag is en de winst dus het grootst: bouw & installatie, zakelijke dienstverlening, zorg & praktijken, makelaardij & vastgoed, transport & logistiek en e-commerce & retail. Staat je branche er niet bij, dan maakt dat weinig uit — we kijken naar het proces, niet naar de sector.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Het AI-gat in cijfers",
    body: "Iedereen heeft het over AI. Bijna niemand in het Nederlandse mkb heeft het structureel geïmplementeerd. Dat is geen mening — dat is wat het onderzoek van 2025 en 2026 laat zien, en het is precies waarom een vroege start nu nog een concurrentievoordeel is.",
    bullets: [
      "66,2% van bedrijven met 250+ medewerkers gebruikt AI, tegenover 13,8% van bedrijven met minder dan tien (CBS, 2025)",
      "Slechts 6% van het Nederlandse mkb heeft AI structureel geïmplementeerd (Dialogic i.o.v. EZK, 2025)",
      "95% van de AI-pilots levert geen meetbaar resultaat op de winst-en-verliesrekening (MIT NANDA, 2025)",
      "Inkopen bij een specialist slaagt in 67% van de gevallen, zelf bouwen in 33% (MIT NANDA, 2025)",
    ],
  },
  {
    heading: "Waarom vanuit Amsterdam werkt in je voordeel",
    body: "We werken landelijk, met onze focus op Amsterdam en omgeving. Dat betekent direct en zakelijk contact, snel schakelen als er iets moet worden bijgesteld, en een intake die — in overleg — ook gewoon bij je op locatie kan in plaats van alleen via een videogesprek.",
    bullets: [
      "Intake of AI-scan op locatie in Amsterdam of online",
      "Korte lijnen: je spreekt de persoon die het ook bouwt, geen accountmanager",
      "Snel schakelen als er tussentijds iets moet worden bijgesteld",
    ],
  },
  {
    heading: "Onze aanpak, ongeacht waar je nu staat",
    body: "Oriënteer je je nog, heb je een concreet proces in gedachten, of loopt een lopend AI-project vast? Voor elk van die situaties hebben we een passend startpunt — je hoeft niet alles tegelijk.",
    bullets: [
      "Oriënterend? Begin met de AI-scan: twee weken, vaste prijs, verrekenbaar bij vervolg",
      "Concreet proces? Kant-en-klare agent binnen een week, of maatwerk binnen enkele weken",
      "Project vastgelopen? Diagnose, meedraaien of overname zonder jaarcontract",
    ],
  },
];

export const Route = createFileRoute("/ai-voor-het-mkb-amsterdam")({
  head: () => ({
    meta: [
      { title: "AI voor het MKB in Amsterdam — AI-agency, geen los projectje" },
      {
        name: "description",
        content:
          "AI-scan, consultancy en maatwerk automatisering voor het MKB in Amsterdam en omgeving. Slechts 6% van het Nederlandse mkb heeft AI structureel geïmplementeerd — pak die voorsprong.",
      },
      { property: "og:title", content: "AI voor het MKB in Amsterdam" },
      {
        property: "og:description",
        content:
          "AI-agency voor het MKB, gevestigd in Amsterdam. Intake op locatie mogelijk, aanpak per stadium van je AI-traject.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-voor-het-mkb-amsterdam") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI voor het MKB in Amsterdam"
      title="AI voor het MKB in Amsterdam — AI-agency, geen los projectje"
      intro="Slechts 6% van het Nederlandse mkb heeft AI structureel geïmplementeerd. Wij zijn een AI-agency voor het MKB, gevestigd in Amsterdam: van eerste verkenning tot een AI-automatisering die daadwerkelijk rendement oplevert."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
