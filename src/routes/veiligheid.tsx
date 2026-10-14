import { createFileRoute } from "@tanstack/react-router";
import { JuridischePagina } from "@/components/juridische-pagina";
import { VEILIGHEID, VEILIGHEID_BIJGEWERKT } from "@/content/veiligheid";
import { canoniek, kruimelpadJsonLd, paginaMeta } from "@/lib/seo";

const PAD = "/veiligheid";
const TITEL = "Veiligheid — wie bij je gegevens kan en wat er vastligt";
const BESCHRIJVING =
  "Waar je gegevens staan, wie erbij kan, wat een AI-agent wel en niet mag, hoe lang we bewaren en wat er gebeurt als het misgaat. Zonder omwegen.";

export const Route = createFileRoute("/veiligheid")({
  head: () => ({
    meta: paginaMeta({
      pad: PAD,
      titel: TITEL,
      beschrijving: BESCHRIJVING,
      ogTitel: "Veiligheid bij Zakelijke AI Agents",
      ogBeschrijving:
        "Gegevens in de EU, wij zien aantallen en geen inhoud, meekijken alleen met reden en zichtbaar voor jou.",
      ogType: "article",
    }),
    links: [canoniek(PAD)],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "Veiligheid", pad: PAD },
        ]),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <JuridischePagina
      titel="Veiligheid"
      intro="Je laat een agent los op je mailbox, je klanten of je website. Dan wil je weten wie erbij kan, wat er vastligt en wat er gebeurt als het misgaat. Hieronder staat het, inclusief wat we niet hebben."
      bijgewerkt={VEILIGHEID_BIJGEWERKT}
      blokken={VEILIGHEID}
    />
  );
}
