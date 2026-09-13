import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Werken jullie alleen in Amsterdam?",
    a: "We werken landelijk, maar onze focus ligt op Amsterdam en omgeving. Daardoor kunnen we snel schakelen en, in overleg, persoonlijk langskomen voor een intake.",
  },
  {
    q: "Kan de kennismaking bij mij op kantoor?",
    a: "Ja, in overleg. We komen graag langs op je locatie in Amsterdam en omgeving voor de intake. Liever online? Dat kan ook, in een videogesprek van 30 minuten.",
  },
  {
    q: "Vervangen jullie agents mijn medewerkers?",
    a: "Nee. De agent neemt het herhaalwerk over — lezen, kwalificeren, opvolgen, vastleggen — zodat je team tijd overhoudt voor gesprekken die er echt toe doen.",
  },
  {
    q: "Hoe waarborgen jullie de kwaliteit van wat de agent schrijft?",
    a: "Elke agent wordt getraind op jouw eigen materiaal: eerdere e-mails, veelgestelde vragen en tone-of-voice. Bij de Inbox Draft Assistant lees je bovendien elk bericht eerst zelf na, tot je het vertrouwt.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Wat we doen",
    body: "Zakelijke AI Agents levert AI agents die sales en klantenservice overnemen: leads kwalificeren, e-mails beantwoorden en automatisch opvolgen via WhatsApp — 24/7. Geen chatbot die halve antwoorden geeft, maar een agent die het hele proces van binnenkomst tot afspraak of antwoord afhandelt.",
    bullets: [
      "AI Sales Assistant — leads kwalificeren en afspraken boeken",
      "Inbox Draft Assistant — concept-antwoorden in je mailbox",
      "WhatsApp Follow-up Agent — automatische opvolging",
    ],
  },
  {
    heading: "Hoe we werken",
    body: "Elk traject begint met een intake waarin we je aanvraagstroom, mailbox en CRM doorlopen. Daarna bouwen en koppelen we een agent op maat — aan je formulier, inbox, CRM of agenda. De agent gaat live, en we monitoren en optimaliseren mee terwijl je bedrijf groeit.",
    bullets: [
      "Intake: je processen en grootste tijdvreters in kaart",
      "Bouwen & integreren: koppeling met je bestaande tools",
      "Live & schalen: monitoren en optimaliseren na livegang",
    ],
  },
  {
    heading: "Waar we actief zijn",
    body: "We werken landelijk, met onze focus op Amsterdam en omgeving. Dat betekent direct en zakelijk contact, snel schakelen als er iets moet worden bijgesteld, en een intake die — in overleg — ook gewoon bij je op locatie kan.",
  },
];

export const Route = createFileRoute("/over-ons")({
  head: () => ({
    meta: [
      { title: "Over ons — Zakelijke AI Agents" },
      {
        name: "description",
        content:
          "Zakelijke AI Agents bouwt AI agents voor sales en klantenservice, actief in Amsterdam en omgeving. Lees wie we zijn en hoe we werken.",
      },
      { property: "og:title", content: "Over ons — Zakelijke AI Agents" },
      {
        property: "og:description",
        content: "Wie we zijn, hoe we werken, en waarom onze focus op Amsterdam en omgeving ligt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/over-ons") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="Over ons"
      title="Zakelijke AI Agents — wie we zijn en hoe we werken"
      intro="Direct, zakelijk en zonder overdreven verkooptaal: we bouwen AI agents die sales en klantenservice écht overnemen, landelijk werkzaam met een focus op Amsterdam en omgeving."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
