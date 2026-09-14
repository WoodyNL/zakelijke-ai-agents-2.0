import { createFileRoute } from "@tanstack/react-router";
import { PricingCards, RateSheet } from "@/components/sections/agents-pricing";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { PRICING } from "@/content/site";
import { absoluteUrl, offerCatalogJsonLd } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat kost een AI-agency voor het MKB?",
    a: "Bij ons begint het bij €1.450 voor de AI-scan of €795 plus €495 per maand voor één kant-en-klare agent. Een compleet AI-traject waarin we één proces herontwerpen én automatiseren start vanaf €4.500 eenmalig plus €395 per maand beheer. Doorlopende begeleiding als vaste partner kost €2.450 per maand. Alle bedragen zijn exclusief btw.",
  },
  {
    q: "Waarom staan jullie tarieven gewoon op de site?",
    a: "Omdat je anders drie gesprekken nodig hebt voordat je weet of het überhaupt binnen je budget past. Wij vinden dat zonde van jouw tijd en die van ons. Je ziet vooraf wat iets kost, wat erin zit, en waar de grens ligt.",
  },
  {
    q: "Betaal ik per uur of een vaste prijs?",
    a: "Trajecten gaan tegen een vaste prijs die vooraf wordt bepaald, zonder nacalculatie. Alleen losse expertise rekenen we per dagdeel (€695) of per dag (€1.195). Zo weet je bij een project altijd vooraf waar je aan toe bent.",
  },
  {
    q: "Zit ik ergens aan vast?",
    a: "Bij de abonnementen geldt drie maanden minimum, daarna maandelijks opzegbaar met een maand opzegtermijn. De AI-scan en het AI-traject zijn losse opdrachten. Levert een traject na 30 dagen niets op volgens de vooraf afgesproken KPI, dan zetten we het uit.",
  },
  {
    q: "Is de AI-scan verrekenbaar?",
    a: "Ja, volledig. Ga je na de scan met ons verder, dan gaat de €1.450 er één op één vanaf. Het AI Act-pakket van €950 is op zijn beurt weer verrekenbaar met de scan.",
  },
  {
    q: "Wat zijn de kosten bovenop het abonnement?",
    a: "Alleen twee dingen, en allebei tegen kostprijs. Boven de fair-use-grens rekenen we €1,00 per extra lead of gesprek, en WhatsApp Business-berichtkosten belasten we één op één door tegen het tarief van Meta. Verder zijn er geen verrassingen op je factuur.",
  },
  {
    q: "Werken jullie ook in Amsterdam op locatie?",
    a: "Ja. We werken landelijk vanuit Amsterdam, dus scan-gesprekken, werksessies en de dagen van het AI-partnerschap doen we gewoon bij je op kantoor in Amsterdam of omgeving. Online kan ook, zonder prijsverschil.",
  },
  {
    q: "Wat is er goedkoper: een agent of een traject?",
    a: "Een agent, maar ze lossen iets anders op. De agent is één stukje werk op één kanaal en is binnen een week live — de snelste manier om te zien of AI voor jou werkt. Een traject herontwerpt het hele proces eromheen. Weet je niet welke van de twee je nodig hebt, dan is dat precies wat de gratis verkenning uitwijst.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Waarom onze tarieven per fase zijn opgebouwd",
    body: "De meeste AI-bureaus verkopen een abonnementsformaat: klein, middel, groot. Dat werkt alleen als je al weet wat je nodig hebt. Bij AI weet vrijwel geen mkb-bedrijf dat aan het begin, en dat is precies waar het misgaat — je kiest een pakket, ontdekt dat het niet past, en zit er drie maanden aan vast. Onze tarieven volgen daarom de vier fasen waar een bedrijf doorheen gaat, en na elke fase kun je stoppen.",
    bullets: [
      "Stap 1 — weten: de AI-scan (€1.450), verrekenbaar als je doorgaat",
      "Kant-en-klaar: één agent live binnen een week (€795 + €495 p.m.)",
      "Stap 2 — bouwen: het AI-traject met vaste prijs (vanaf €4.500 + €395 p.m.)",
      "Stap 3 — doorpakken: AI-partner met vaste capaciteit (€2.450 p.m.)",
      "Losse expertise als je alleen een tweede mening wilt (€695 per dagdeel)",
      "AI Act-pakket voor wie eerst de verplichtingen wil regelen (€950)",
    ],
  },
  {
    heading: "Wat een AI-traject kost vergeleken met een medewerker erbij",
    body: "De vergelijking die er in het mkb werkelijk toe doet, is niet die met een ander bureau maar die met een extra paar handen. Een fulltime medewerker klantcontact kost all-in ongeveer €4.200 per maand. Het AI-partnerschap zit daar met €2.450 per maand ruim onder, en dan krijg je twee vaste dagen capaciteit, beheer van alle automatiseringen en elk kwartaal een strategiesessie. Het verschil zit hem erin dat een automatisering niet met vakantie gaat en dat je hem elke maand kunt opzeggen.",
  },
  {
    heading: "Wat er níét op de factuur verschijnt",
    body: "Bij AI-projecten zit de onaangename verrassing meestal niet in de offerte maar in wat daarna komt: meerwerk, koppelingen die toch los gefactureerd worden, een aparte compliance-rekening. Bij ons zitten koppelingen, werkinstructies, teamtraining en AI Act-bewaking in de prijs van het traject of het partnerschap. Alleen twee dingen rekenen we door, allebei tegen kostprijs: gesprekken boven de fair-use-grens à €1,00, en de WhatsApp-berichtkosten van Meta.",
    bullets: [
      "Geen nacalculatie op trajecten — de prijs staat vooraf vast",
      "Geen aparte factuur voor koppelingen met je eigen systemen",
      "Geen losse compliance-rekening: de AI Act zit in het traject",
      "Geen jaarcontract: na drie maanden maandelijks opzegbaar",
    ],
  },
  {
    heading: "Hoe je bepaalt welk tarief bij jou past",
    body: "Heb je één concreet proces voor ogen dat te veel tijd kost, dan is de kant-en-klare agent de snelste en goedkoopste test. Weet je nog niet waar de winst zit, begin dan met de scan — dan koop je geen oplossing voordat je het probleem kent. Loopt er al een AI-project vast, dan kijken we eerst wat er gebouwd is; vaak is er meer te redden dan mensen denken. En wil je er helemaal niet over nadenken, dan neemt het partnerschap het hele traject over. De gratis verkenning van 30 minuten is er precies om die keuze te maken, zonder dat je ergens aan vastzit.",
  },
];

const TITLE = "Tarieven AI-agency | Wat kost AI-automatisering voor het MKB?";
const DESCRIPTION =
  "Alle tarieven op een rij: AI-scan €1.450, kant-en-klare agent vanaf €795 + €495 p.m., AI-traject vanaf €4.500 en AI-partner €2.450 p.m. Vaste prijzen vooraf, geen nacalculatie, geen jaarcontract.";

export const Route = createFileRoute("/tarieven")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Tarieven — wat AI-automatisering kost voor het MKB" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/tarieven") },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Tarieven AI-agency voor het MKB" },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/tarieven") }],
    scripts: [
      { type: "application/ld+json", children: offerCatalogJsonLd(PRICING.cards) },
      { type: "application/ld+json", children: faqJsonLd(FAQS) },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="Tarieven"
      title="Wat AI-automatisering kost voor het MKB"
      intro="Geen offerte-op-aanvraag en geen prijs die pas in het derde gesprek valt. Hieronder staat precies wat elke stap kost, wat erin zit en waar de grens ligt. Alle bedragen zijn exclusief btw."
      sections={SECTIONS}
      faqs={FAQS}
    >
      <section aria-labelledby="tarieven-overzicht" className="mt-10">
        <h2
          id="tarieven-overzicht"
          className="font-display text-[20px] font-bold tracking-tight text-brand sm:text-[24px]"
        >
          {PRICING.h2}
        </h2>
        <p className="mt-3 max-w-[70ch] text-[14px]/[1.75] text-ink/65">{PRICING.intro}</p>
        <PricingCards ctaHref="/#contact" />
        <RateSheet />
      </section>
    </SeoPage>
  );
}
