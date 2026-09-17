import { createFileRoute } from "@tanstack/react-router";
import { JuridischePagina } from "@/components/juridische-pagina";
import { AI_BELEID, BIJGEWERKT } from "@/content/juridisch";
import { canoniek, kruimelpadJsonLd, paginaMeta } from "@/lib/seo";

const PAD = "/ai-beleid";
const TITEL = "Ons AI-beleid — transparantie, mens in de lus en AI Act";
const BESCHRIJVING =
  "Hoe wij zelf met AI omgaan: een chatbot die zich kenbaar maakt, een mens in de lus bij elke beslissing die telt, een activiteitenlog en de EU AI Act.";

export const Route = createFileRoute("/ai-beleid")({
  head: () => ({
    meta: paginaMeta({
      pad: PAD,
      titel: TITEL,
      beschrijving: BESCHRIJVING,
      ogTitel: "Ons AI-beleid",
      ogBeschrijving:
        "Een chatbot die zegt dat hij een AI is, een mens in de lus en een log van alles wat een agent doet.",
      ogType: "article",
    }),
    links: [canoniek(PAD)],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "AI-beleid", pad: PAD },
        ]),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <JuridischePagina
      titel="Ons AI-beleid"
      intro="We verkopen AI-naleving, dus hoort ons eigen beleid zichtbaar te zijn. Dit is hoe wij met AI omgaan — op deze site en in wat we voor klanten bouwen."
      bijgewerkt={BIJGEWERKT}
      blokken={AI_BELEID}
    />
  );
}
