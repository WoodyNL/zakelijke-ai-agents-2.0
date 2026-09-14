import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat doet een AI agent voor lead opvolging precies?",
    a: "De agent leest elke nieuwe lead, bepaalt of die relevant is, verrijkt de gegevens, schrijft een persoonlijk antwoord, zet de lead in je CRM en plant automatisch de follow-up in.",
  },
  {
    q: "Hoe snel reageert de agent op een nieuwe lead?",
    a: "Binnen ongeveer 40 seconden na binnenkomst, ook 's avonds en in het weekend.",
  },
  {
    q: "Schrijft de agent in onze eigen stijl?",
    a: "Ja. We trainen de agent op je bestaande e-mails, aanbod en veelgestelde vragen, zodat antwoorden klinken zoals jullie schrijven.",
  },
  {
    q: "Blijft er een mens in de lus?",
    a: "Dat bepaal je zelf. Je kunt starten met concept-antwoorden ter goedkeuring en pas automatisch laten versturen als je de kwaliteit vertrouwt.",
  },
  {
    q: "Werkt het met ons CRM?",
    a: "In de meeste gevallen wel. We koppelen aan gangbare CRM-systemen, formulieren en agenda's; tijdens de intake in Amsterdam checken we jouw setup.",
  },
  {
    q: "Wat kost lead opvolging met een AI agent?",
    a: "€795 eenmalige inrichting en €495 per maand voor één agent op één kanaal, tot 300 leads per maand. Een extra agent kost €395 per maand. Boven de fair-use-grens rekenen we €1,00 per extra lead.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Waarom snelle lead opvolging het verschil maakt",
    body: "De meeste aanvragen gaan niet verloren omdat het aanbod niet klopt, maar omdat het antwoord te laat komt. Wie als eerste reageert, voert het gesprek. Een AI agent zit altijd aan: hij pakt elke aanvraag direct op, ook buiten kantooruren, en zorgt dat sales alleen nog warme leads te spreken krijgt.",
    bullets: [
      "Elke lead binnen seconden een persoonlijk antwoord",
      "Geen aanvragen die blijven liggen in een gedeelde mailbox",
      "Automatische herinnering als de prospect niet reageert",
      "Dagelijkse rapportage voor de eigenaar",
    ],
  },
  {
    heading: "Zo verloopt de lead opvolging stap voor stap",
    body: "De agent leest de lead, bepaalt relevantie en verrijkt de gegevens met bedrijf, rol en signalen. Vervolgens schrijft hij een persoonlijke reactie in jouw tone-of-voice, verstuurt die via e-mail of WhatsApp en maakt het contact aan in je CRM. Reageert de prospect niet, dan volgt automatisch een zachte herinnering. Is er interesse, dan boekt de agent de afspraak direct in je agenda.",
    bullets: [
      "Lezen en kwalificeren",
      "Verrijken en vastleggen in CRM",
      "Persoonlijk antwoord via e-mail of WhatsApp",
      "Follow-up en afspraak inplannen",
    ],
  },
  {
    heading: "Voor wie dit werkt",
    body: "Vooral voor bedrijven met een gestage stroom aanvragen via de website en een klein sales- of serviceteam: dienstverleners, bureaus, installateurs, B2B-leveranciers en praktijken. Zit je in Amsterdam? Dan komen we langs om samen door je aanvraagstroom te lopen voordat we iets bouwen.",
  },
];

export const Route = createFileRoute("/ai-lead-opvolging")({
  head: () => ({
    meta: [
      { title: "AI lead opvolging automatiseren — elke lead binnen seconden" },
      {
        name: "description",
        content:
          "Automatiseer lead opvolging met een AI agent: leads kwalificeren, persoonlijk beantwoorden, in het CRM zetten en automatisch opvolgen. Demo online of in Amsterdam.",
      },
      { property: "og:title", content: "AI lead opvolging automatiseren" },
      {
        property: "og:description",
        content:
          "Een AI agent die elke nieuwe lead leest, kwalificeert, beantwoordt en opvolgt — zodat sales alleen warme leads spreekt.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-lead-opvolging") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI lead opvolging"
      title="AI lead opvolging: elke aanvraag binnen seconden beantwoord"
      intro="Onze AI Sales Assistant leest elke nieuwe lead, kwalificeert hem, schrijft een persoonlijk antwoord en volgt automatisch op via e-mail en WhatsApp. Sales spreekt alleen nog mensen die er klaar voor zijn."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
