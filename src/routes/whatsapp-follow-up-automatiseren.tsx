import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";

const FAQS = [
  {
    q: "Hoe werkt een WhatsApp follow-up agent?",
    a: "De agent stuurt na een ingestelde vertraging een persoonlijk bericht aan een lead of klant, bijvoorbeeld: 'Hoi, ik volg even op over je interesse in X — nog vragen?' Reageert iemand met een complexe vraag, dan wordt het gesprek doorgezet naar een medewerker.",
  },
  {
    q: "Is dit toegestaan met WhatsApp Business?",
    a: "Ja, mits je via de officiële WhatsApp Business-koppeling werkt en de ontvanger contact met je heeft gezocht of toestemming heeft gegeven. Wij richten het volgens die regels in.",
  },
  {
    q: "Wanneer neemt een mens het over?",
    a: "Zodra het gesprek buiten de bekende onderwerpen valt, er wordt onderhandeld of de toon om een mens vraagt. De agent geeft de volledige context door.",
  },
  {
    q: "Kan ik de timing zelf bepalen?",
    a: "Ja. Je stelt zelf in na hoeveel uur of dagen de eerste, tweede en laatste opvolging wordt gestuurd.",
  },
  {
    q: "Wat kost WhatsApp-opvolging?",
    a: "De agent valt binnen onze pakketten vanaf €495 per maand. WhatsApp-gesprekskosten van Meta rekenen we door tegen kostprijs als aparte regel.",
  },
  {
    q: "Kan de agent ook klantvragen op WhatsApp beantwoorden?",
    a: "Ja. Dezelfde logica beantwoordt terugkerende klantvragen en schakelt door bij twijfel.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "WhatsApp is het kanaal waar wél wordt geantwoord",
    body: "E-mails blijven ongelezen, WhatsApp-berichten niet. Toch stopt opvolging via WhatsApp meestal bij de eerste drukke week. Een agent doet het consequent: hij stuurt op het juiste moment een kort, persoonlijk bericht, wacht op reactie en zet complexe gesprekken door naar een mens.",
    bullets: [
      "Hoge leespercentages, korte reactietijd",
      "Consequente opvolging, ook in drukke weken",
      "Persoonlijke toon in plaats van standaardsjablonen",
      "Naadloze overdracht naar een medewerker",
    ],
  },
  {
    heading: "Eén brein, meerdere kanalen",
    body: "De WhatsApp Follow-up Agent gebruikt dezelfde kwalificatielogica als onze AI Sales Assistant — alleen op een ander kanaal. Wat de agent leert over jouw aanbod, veelgestelde vragen en bezwaren, geldt dus meteen voor e-mail én WhatsApp. Alles wordt vastgelegd in je CRM, zodat je één beeld per contact houdt.",
    bullets: [
      "Zelfde kwalificatielogica als e-mail",
      "Vastlegging in je CRM per contact",
      "Instelbare vertraging en aantal herinneringen",
      "Stopt automatisch zodra iemand een afspraak boekt",
    ],
  },
  {
    heading: "Opzetten met een team in Amsterdam",
    body: "We richten de WhatsApp-koppeling, de berichten en de overdrachtsregels samen met je in. Zit je in Amsterdam of omgeving, dan doen we die sessie het liefst op locatie: dan horen we hoe je team nu opvolgt en nemen we die toon over in de berichten.",
  },
];

export const Route = createFileRoute("/whatsapp-follow-up-automatiseren")({
  head: () => ({
    meta: [
      { title: "WhatsApp follow-up automatiseren met een AI agent" },
      {
        name: "description",
        content:
          "Automatiseer follow-up via WhatsApp: persoonlijke opvolgberichten, instelbare timing en directe overdracht naar een mens. Demo online of in Amsterdam.",
      },
      { property: "og:title", content: "WhatsApp follow-up automatiseren met een AI agent" },
      {
        property: "og:description",
        content:
          "Een AI agent die leads en klanten op WhatsApp opvolgt en complexe gesprekken doorzet naar je team.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/whatsapp-follow-up-automatiseren" }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="WhatsApp follow-up"
      title="WhatsApp follow-up automatiseren zonder dat het onpersoonlijk wordt"
      intro="Onze WhatsApp Follow-up Agent stuurt op het juiste moment een persoonlijk bericht, houdt leads warm en geeft het gesprek door aan een mens zodra het complex wordt."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
