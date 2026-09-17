import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { canoniek, dienstJsonLd, kruimelpadJsonLd, paginaMeta } from "@/lib/seo";

const FAQS = [
  {
    q: "Verstuurt de agent antwoorden zelf?",
    a: "Alleen als jij dat wilt. We starten meestal met concept-antwoorden die je medewerker nakijkt en met één klik verstuurt. Zodra de kwaliteit vertrouwd voelt, kun je onderwerpen automatisch laten afhandelen.",
  },
  {
    q: "Werkt het met Gmail en Outlook?",
    a: "Ja, de Inbox Draft Assistant koppelt aan Gmail en Outlook en werkt gewoon in je bestaande mailbox.",
  },
  {
    q: "Hoe weet de agent wat het juiste antwoord is?",
    a: "We trainen hem op je eigen materiaal: eerdere antwoorden, veelgestelde vragen, voorwaarden en productinformatie. Weet hij het niet zeker, dan zet hij de vraag door.",
  },
  {
    q: "Wat gebeurt er met klachten of gevoelige vragen?",
    a: "Die herkent de agent en zet hij direct door naar een medewerker, met een samenvatting van de context.",
  },
  {
    q: "Beantwoordt hij ook vragen op WhatsApp?",
    a: "Ja, met dezelfde kennis. E-mail en WhatsApp gebruiken één en dezelfde bron.",
  },
  {
    q: "Hoe lang duurt de inrichting?",
    a: "Na de intake staat de eerste versie doorgaans binnen een week klaar, inclusief koppeling met je mailbox.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Klantvragen sneller beantwoorden, zonder kwaliteitsverlies",
    body: "Het grootste deel van je inbox bestaat uit vragen die je team al honderd keer heeft beantwoord. De Inbox Draft Assistant leest binnenkomende berichten, herkent het onderwerp, haalt de context uit eerdere gesprekken en zet een compleet concept-antwoord klaar. Je medewerker leest, past aan waar nodig en verstuurt.",
    bullets: [
      "Concept-antwoorden klaar in je eigen mailbox",
      "Context uit eerdere gesprekken automatisch meegenomen",
      "Consistente toon over het hele team",
      "Doorzetten bij klachten en gevoelige vragen",
    ],
  },
  {
    heading: "Eerst meelezen, daarna pas loslaten",
    body: "We laten de agent bewust niet meteen zelf versturen. Zo bouw je vertrouwen op in de kwaliteit en zie je precies wat er zou zijn gestuurd. Pas als de antwoorden op een onderwerp consequent kloppen, zetten we dat onderwerp op automatisch — stap voor stap, met jou aan het stuur. Dezelfde aanpak gebruiken we bij [maatwerk-automatiseringen](/ai-automatisering-op-maat).",
    bullets: [
      "Start met goedkeuren, groei naar automatisch",
      "Per onderwerp instelbaar",
      "Altijd inzicht in wat er is verstuurd",
      "Medewerkers houden tijd over voor lastige gesprekken",
    ],
  },
  {
    heading: "Klantenservice automatiseren met een partner in Amsterdam",
    body: "We beginnen met een intake waarin we je inbox doorlopen en de meest voorkomende vragen inventariseren. Voor bedrijven in [Amsterdam en omgeving](/ai-agents-amsterdam) doen we dat graag persoonlijk op kantoor; verder weg werkt online net zo goed.",
  },
];

export const Route = createFileRoute("/ai-klantenservice-automatiseren")({
  head: () => ({
    meta: paginaMeta({
      pad: "/ai-klantenservice-automatiseren",
      titel: "AI klantenservice automatiseren — concept-antwoorden in je inbox",
      beschrijving:
        "Automatiseer klantenservice met een AI agent die e-mails leest en concept-antwoorden klaarzet in Gmail of Outlook. Kennismaking online of in Amsterdam.",
      ogTitel: "AI klantenservice automatiseren",
      ogBeschrijving:
        "Een AI agent die klantvragen leest, context ophaalt en concept-antwoorden klaarzet ter goedkeuring.",
      ogType: "article",
    }),
    links: [canoniek("/ai-klantenservice-automatiseren")],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "AI klantenservice", pad: "/ai-klantenservice-automatiseren" },
        ]),
      },
      {
        type: "application/ld+json",
        children: dienstJsonLd({
          naam: "Inbox Draft Assistant — AI-klantenservice",
          beschrijving:
            "Een AI-agent die binnenkomende e-mail leest en in Gmail of Outlook een concept-antwoord klaarzet in jouw toon. Verstuurt standaard niets zelf.",
          pad: "/ai-klantenservice-automatiseren",
          vanafPrijs: 795,
        }),
      },
      { type: "application/ld+json", children: faqJsonLd(FAQS) },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI klantenservice"
      title="AI klantenservice automatiseren zonder je klanten kwijt te raken"
      intro="De Inbox Draft Assistant leest je zakelijke e-mail, haalt de context erbij en zet een persoonlijk concept-antwoord klaar ter goedkeuring. Jij houdt de controle, je klant krijgt sneller antwoord."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
