import { createFileRoute } from "@tanstack/react-router";
import { SeoPage, faqJsonLd, type SeoSection } from "@/components/seo-page";
import { absoluteUrl } from "@/lib/seo";

const FAQS = [
  {
    q: "Is een AI agent haalbaar voor een klein team?",
    a: "Ja. De pakketten zijn juist gemaakt voor bedrijven zonder eigen sales- of serviceteam van formaat: je begint met één agent op één kanaal en breidt uit zodra je het resultaat ziet.",
  },
  {
    q: "Hoeveel tijd kost het mij als eigenaar om dit op te zetten?",
    a: "De intake duurt ongeveer 30 minuten. Daarna regelen wij de koppeling met je formulier, inbox, CRM en agenda. Van jouw kant is vooral toegang en je tone-of-voice nodig.",
  },
  {
    q: "Heb ik een IT-persoon nodig om dit werkend te krijgen?",
    a: "Nee. Wij verzorgen alle technische koppelingen. Jij hoeft geen ontwikkelaar of IT-afdeling in dienst te hebben.",
  },
  {
    q: "Kan ik klein beginnen en later uitbreiden?",
    a: "Ja. Veel MKB-klanten starten met het Start-pakket voor één agent en stappen later over naar Groei of Compleet zodra het effect duidelijk is.",
  },
  {
    q: "Is dit ook interessant als ik maar een paar leads per week krijg?",
    a: "Zeker. Juist bij een klein aantal aanvragen per week telt elke gemiste of te laat beantwoorde lead extra zwaar. Een agent die nooit een aanvraag mist, maakt dan direct verschil.",
  },
  {
    q: "Wat kost dit voor een klein bedrijf?",
    a: "Het Start-pakket begint vanaf €495 per maand plus €795 eenmalige setup, voor één agent op één kanaal en tot 300 leads per maand. Bekijk alle pakketten op de prijzenpagina.",
  },
];

const SECTIONS: SeoSection[] = [
  {
    heading: "Gebouwd voor kleine teams, niet voor IT-afdelingen",
    body: "Onze doelgroep is precies dit: bedrijven en dienstverleners met inkomende leads via website of formulier, geleid door een eigenaar, Head of Sales of klantenservice-manager — zonder eigen technisch team. Wij regelen de koppelingen, jij houdt de regie.",
    bullets: [
      "Geen ontwikkelaar of IT-afdeling nodig",
      "Wij koppelen formulier, inbox, CRM en agenda",
      "Intake van 30 minuten, live binnen een dag per agent",
      "Start klein, breid uit wanneer het past",
    ],
  },
  {
    heading: "Wat het een DGA in Amsterdam concreet oplevert",
    body: "Bij een klein team telt elke minuut. De agent reageert binnen ongeveer 40 seconden op een nieuwe aanvraag, volgt automatisch op als iemand niet reageert, en zorgt dat er geen enkel bericht tussen wal en schip valt — ook niet in het weekend of tijdens een drukke week.",
    bullets: [
      "±40 seconden tot de eerste reactie",
      "Geen gemiste aanvragen buiten kantooruren",
      "Automatische follow-up zonder dat jij eraan hoeft te denken",
      "Dagelijks overzicht, zodat je precies weet wat er speelt",
    ],
  },
  {
    heading: "Persoonlijk opgezet, dicht bij huis",
    body: "We werken landelijk, met focus op Amsterdam en omgeving. Dat betekent dat de intake ook gewoon bij je op locatie kan, in overleg — handig als je liever niet alles via een videogesprek wilt afstemmen. Daarna volgt een concreet voorstel met vaste prijs, geen jaarcontract.",
  },
];

export const Route = createFileRoute("/ai-voor-mkb-amsterdam")({
  head: () => ({
    meta: [
      { title: "AI agents voor het MKB in Amsterdam — geen IT-afdeling nodig" },
      {
        name: "description",
        content:
          "AI agents voor kleine en middelgrote bedrijven in Amsterdam: leads kwalificeren en opvolgen zonder eigen IT-team. Start klein, vanaf €495 per maand.",
      },
      { property: "og:title", content: "AI agents voor het MKB in Amsterdam" },
      {
        property: "og:description",
        content:
          "Gebouwd voor kleine teams zonder IT-afdeling. Wij regelen de koppelingen, jij houdt de regie — vanaf €495 per maand.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-voor-mkb-amsterdam") }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQS) }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoPage
      kicker="AI voor het MKB"
      title="AI-agents voor het MKB in Amsterdam — geen IT-afdeling nodig"
      intro="Geen eigen ontwikkelaar, geen implementatietraject van maanden. Onze AI agents zijn gebouwd voor eigenaren en kleine teams in Amsterdam die geen aanvraag meer willen missen — wij regelen de techniek, jij houdt de regie."
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
