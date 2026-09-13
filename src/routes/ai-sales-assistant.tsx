import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Wat is de AI Sales Assistant precies?",
    a: "Een AI agent die nieuwe leads leest, kwalificeert, persoonlijk beantwoordt via e-mail of WhatsApp, vastlegt in je CRM en automatisch opvolgt tot er een afspraak in je agenda staat — in 10 automatische stappen.",
  },
  {
    q: "Hoeveel stappen doorloopt de AI Sales Assistant per lead?",
    a: "Tien, verdeeld over drie fases: de lead begrijpen (lezen, kwalificeren, verrijken), direct reageren (persoonlijk antwoord, verzenden, vastleggen in CRM) en opvolgen tot sluiten (herinneren, afspraak boeken, dagrapport).",
  },
  {
    q: "Wat gebeurt er als een lead niet meteen reageert?",
    a: "De agent plant automatisch een follow-up in en stuurt op het juiste moment een zachte herinnering via e-mail of WhatsApp — zonder dat het als spam voelt.",
  },
  {
    q: "Belandt elke lead automatisch in mijn agenda?",
    a: "Nee, alleen warme, gekwalificeerde leads. Reageert een lead niet of blijkt die niet relevant, dan loopt de follow-up automatisch door via mail en WhatsApp in plaats van dat sales tijd verliest.",
  },
  {
    q: "Werkt de AI Sales Assistant samen met de andere agents?",
    a: "Ja. De WhatsApp Follow-up Agent hergebruikt dezelfde kwalificatielogica — één brein, meerdere kanalen — en de Inbox Draft Assistant gebruikt dezelfde kennis voor klantvragen die binnenkomen via e-mail.",
  },
  {
    q: "Wat kost de AI Sales Assistant?",
    a: "Vanaf €495 per maand plus €795 eenmalige setup in het Start-pakket, voor één agent op één kanaal. Bekijk alle pakketten op de prijzenpagina.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Fase 1 — begrijpt de lead",
    body: "Elke nieuwe aanvraag wordt direct gelezen, 24 uur per dag. De agent bepaalt de relevantie en verrijkt de lead met bedrijf, rol en signalen tot één volledig beeld — voordat er iets wordt verstuurd.",
    bullets: [
      "Leest elk formulier en elke aanmelding, dag en nacht",
      "Kwalificeert intentie en fit met je ideale klant",
      "Verrijkt de lead met bedrijfs- en rolinformatie",
    ],
  },
  {
    heading: "Fase 2 — reageert direct",
    body: "Binnen ongeveer 40 seconden staat er een persoonlijke reactie klaar, geschreven in jouw tone-of-voice. Die gaat direct via e-mail of WhatsApp, en het contact wordt meteen verrijkt in je CRM gezet — zonder handwerk.",
    bullets: [
      "Persoonlijke reactie in jouw tone-of-voice",
      "Verstuurd via e-mail of WhatsApp, dag en nacht",
      "Contact automatisch aangemaakt in je CRM",
    ],
  },
  {
    heading: "Fase 3 — volgt op en sluit",
    body: "Reageert een lead niet meteen, dan plant de agent een follow-up op het juiste moment en stuurt een zachte herinnering. Toont een lead interesse, dan boekt de agent direct een afspraak in je agenda — en de eigenaar krijgt dagelijks een helder overzicht.",
    bullets: [
      "Automatische follow-up op het juiste moment",
      "Directe agendaboeking bij interesse",
      "Dagelijkse rapportage voor de eigenaar",
    ],
  },
];

export const Route = createFileRoute("/ai-sales-assistant")({
  head: () => ({
    meta: [
      { title: "AI Sales Assistant — van lead tot afspraak, automatisch" },
      {
        name: "description",
        content:
          "De AI Sales Assistant leest, kwalificeert en beantwoordt elke nieuwe lead binnen seconden, en volgt automatisch op tot er een afspraak in je agenda staat.",
      },
      { property: "og:title", content: "AI Sales Assistant — van lead tot afspraak" },
      {
        property: "og:description",
        content:
          "Tien automatische stappen van nieuwe lead tot geboekte afspraak. Sales krijgt alleen nog warme leads te spreken.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-sales-assistant") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI Sales Assistant"
      title="AI Sales Assistant: van lead tot afspraak, volledig automatisch"
      intro="Onze AI Sales Assistant leest elke nieuwe lead, kwalificeert hem, schrijft een persoonlijke reactie en volgt automatisch op — in 10 stappen, tot er een afspraak in je agenda staat. Sales krijgt alleen nog leads te spreken die er klaar voor zijn."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
