import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { canoniek, kruimelpadJsonLd, paginaMeta } from "@/lib/seo";

const FAQS = [
  {
    q: "Werken jullie alleen in Amsterdam?",
    a: "We werken landelijk, maar onze focus ligt op Amsterdam en omgeving. Daardoor kunnen we langskomen voor een intake op locatie en snel schakelen als er iets moet worden bijgesteld.",
  },
  {
    q: "Kan de kennismaking bij ons op kantoor?",
    a: "Ja. Een persoonlijke afspraak op je kantoor in Amsterdam is mogelijk. Liever online? Dat kan ook, in een videogesprek van 30 minuten.",
  },
  {
    q: "Hoe snel staat een agent live?",
    a: "Na de intake bouwen we de eerste agent doorgaans binnen een week, inclusief koppeling met je e-mail, WhatsApp, CRM en agenda.",
  },
  {
    q: "Vervangt een AI agent mijn medewerkers?",
    a: "Nee. De agent neemt het herhaalwerk over — lezen, kwalificeren, opvolgen, vastleggen — zodat je team tijd overhoudt voor gesprekken die er echt toe doen.",
  },
  {
    q: "Wat kost het?",
    a: "Een kant-en-klare agent kost €795 eenmalig plus €495 per maand voor één agent op één kanaal; elke extra agent €395 per maand. Wil je een heel proces herontworpen in plaats van één agent, dan zit je in een AI-traject vanaf €4.500. Alle tarieven staan met de voorwaarden op de homepage.",
  },
  {
    q: "In welke talen werkt de agent?",
    a: "Standaard Nederlands en Engels, in jouw eigen tone-of-voice. Andere talen zijn mogelijk.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "AI agents voor Amsterdamse bedrijven",
    body: "Amsterdamse bedrijven krijgen veel aanvragen binnen via de website, e-mail en WhatsApp — en verliezen omzet zodra een reactie een dag op zich laat wachten. Onze AI agents lezen elke binnenkomende aanvraag, bepalen of die relevant is, schrijven een persoonlijk antwoord en volgen automatisch op. Jij spreekt alleen nog mensen die er klaar voor zijn.",
    bullets: [
      "Reactietijd van uren naar seconden",
      "Geen gemiste aanvragen buiten kantooruren",
      "Alles automatisch vastgelegd in je CRM",
      "Afspraken direct in je agenda geboekt",
    ],
  },
  {
    heading: "Drie agents, één werkwijze",
    body: "We bouwen drie agents die los of samen werken: de [AI Sales Assistant](/ai-lead-opvolging) kwalificeert en beantwoordt nieuwe leads, de [Inbox Draft Assistant](/ai-klantenservice-automatiseren) schrijft concept-antwoorden op je zakelijke e-mail ter goedkeuring, en de [WhatsApp Follow-up Agent](/whatsapp-follow-up-automatiseren) volgt leads en klanten na op WhatsApp en zet complexe gesprekken door naar een mens.",
    bullets: [
      "AI Sales Assistant — leads kwalificeren en beantwoorden",
      "Inbox Draft Assistant — concept-antwoorden in je mailbox",
      "WhatsApp Follow-up Agent — automatisch opvolgen",
      "Klantportaal met live cijfers per agent",
    ],
  },
  {
    heading: "Kennismaken in Amsterdam — online of op locatie",
    body: "Omdat we in Amsterdam zitten, kunnen we bij je langskomen voor de intake. We lopen samen door je aanvraagstroom, je mailbox en je CRM, en laten zien welke stappen de agent overneemt. Daarna volgt een concreet voorstel met vaste prijs en doorlooptijd — geen jaarcontract, minimaal drie maanden en daarna maandelijks opzegbaar. Zoek je het bredere beeld, dan staat dat op [AI voor het MKB in Amsterdam](/ai-voor-het-mkb-amsterdam).",
    bullets: [
      "Intake op locatie in Amsterdam of online",
      "Concreet voorstel met vaste prijs",
      "Eerste agent doorgaans binnen een week live",
      "Minimaal 3 maanden, daarna maandelijks opzegbaar",
    ],
  },
];

export const Route = createFileRoute("/ai-agents-amsterdam")({
  head: () => ({
    meta: paginaMeta({
      pad: "/ai-agents-amsterdam",
      titel: "AI agents Amsterdam — sales & klantenservice automatiseren",
      beschrijving:
        "AI agents voor Amsterdamse bedrijven: leads kwalificeren, e-mail beantwoorden en opvolgen via WhatsApp. Kennismaking online of persoonlijk in Amsterdam.",
      ogTitel: "AI agents Amsterdam — sales & klantenservice automatiseren",
      ogBeschrijving:
        "Wij bouwen AI agents voor bedrijven in Amsterdam. Intake op locatie mogelijk, eerste agent binnen een week live.",
      ogType: "website",
    }),
    links: [canoniek("/ai-agents-amsterdam")],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "AI agents Amsterdam", pad: "/ai-agents-amsterdam" },
        ]),
      },
      { type: "application/ld+json", children: faqJsonLd(FAQS) },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI agents Amsterdam"
      title="AI agents voor bedrijven in Amsterdam"
      intro="Wij bouwen en beheren AI agents die je sales en klantenservice draaiend houden: elke lead binnen seconden beantwoord, elke klantvraag opgepakt, elke follow-up verstuurd. Gevestigd in Amsterdam — kennismaken kan dus ook gewoon persoonlijk bij je op kantoor."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
