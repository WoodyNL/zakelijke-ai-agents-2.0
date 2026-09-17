import { createFileRoute } from "@tanstack/react-router";
import { JuridischePagina } from "@/components/juridische-pagina";
import { BIJGEWERKT, VOORWAARDEN } from "@/content/juridisch";
import { canoniek, kruimelpadJsonLd, paginaMeta } from "@/lib/seo";

const PAD = "/algemene-voorwaarden";
const TITEL = "Algemene voorwaarden | Zakelijke AI Agents";
const BESCHRIJVING =
  "Onze voorwaarden: vaste prijzen vooraf, geen nacalculatie, drie maanden minimum en daarna maandelijks opzegbaar. Geen jaarcontract, geen verlenging.";

export const Route = createFileRoute("/algemene-voorwaarden")({
  head: () => ({
    meta: paginaMeta({
      pad: PAD,
      titel: TITEL,
      beschrijving: BESCHRIJVING,
      ogTitel: "Algemene voorwaarden",
      ogBeschrijving:
        "Vaste prijzen vooraf, geen nacalculatie, maandelijks opzegbaar na drie maanden. Geen jaarcontract.",
    }),
    links: [canoniek(PAD)],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "Algemene voorwaarden", pad: PAD },
        ]),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <JuridischePagina
      titel="Algemene voorwaarden"
      intro="Kort samengevat: vaste prijs vooraf, na elke fase kun je stoppen, en er is geen jaarcontract. Hieronder staat het volledig."
      bijgewerkt={BIJGEWERKT}
      blokken={VOORWAARDEN}
    />
  );
}
