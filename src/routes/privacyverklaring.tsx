import { createFileRoute } from "@tanstack/react-router";
import { JuridischePagina } from "@/components/juridische-pagina";
import { BIJGEWERKT, PRIVACY } from "@/content/juridisch";
import { canoniek, kruimelpadJsonLd, paginaMeta } from "@/lib/seo";

const PAD = "/privacyverklaring";
const TITEL = "Privacyverklaring | Zakelijke AI Agents";
const BESCHRIJVING =
  "Welke gegevens we verzamelen, waarvoor, hoe lang we ze bewaren en wie ze namens ons verwerkt. Geen analytics, geen trackingcookies, geen doorverkoop.";

export const Route = createFileRoute("/privacyverklaring")({
  head: () => ({
    meta: paginaMeta({
      pad: PAD,
      titel: TITEL,
      beschrijving: BESCHRIJVING,
      ogTitel: "Privacyverklaring",
      ogBeschrijving:
        "Wat we verzamelen, waarvoor en hoe lang. Geen analytics en geen trackingcookies op deze site.",
    }),
    links: [canoniek(PAD)],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "Privacyverklaring", pad: PAD },
        ]),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <JuridischePagina
      titel="Privacyverklaring"
      intro="We verzamelen zo min mogelijk, en wat we hebben heb je zelf ingevuld. Hieronder staat precies wat, waarvoor en hoe lang — zonder juridische mist."
      bijgewerkt={BIJGEWERKT}
      blokken={PRIVACY}
    />
  );
}
