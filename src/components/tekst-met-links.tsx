import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Een alinea waarin verwijzingen naar andere pagina's tussen de woorden staan.
 *
 * De teksten van de SEO-pagina's zijn platte strings in het routebestand, en
 * dat is prettig schrijven: één bestand per pagina, geen opmaak die afleidt van
 * wat er staat. Maar een verwijzing hoort middenin een zin te kunnen staan, op
 * de plek waar hij inhoudelijk klopt. Een verwijzing die je daar kiest weegt
 * zwaarder dan een rij knoppen onderaan de pagina, waar ze allemaal even veel
 * en dus even weinig betekenen.
 *
 * Vandaar deze ene schrijfwijze, geleend van Markdown:
 *
 *     "de tool wordt op een [kapot proces](/blog/waarom-ai-pilots-mislukken) geplakt"
 *
 * Alleen paden binnen de site, dus beginnend met een schuine streep. Voor een
 * adres elders is dit niet bedoeld, en de controle hieronder laat het ook niet
 * toe: een externe verwijzing hoort een bewuste keuze te zijn en niet iets dat
 * je per ongeluk in een zin typt.
 */

const VERWIJZING = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export function TekstMetLinks({ tekst }: { tekst: string }) {
  const delen: ReactNode[] = [];
  let laatsteEind = 0;

  for (const treffer of tekst.matchAll(VERWIJZING)) {
    const geheel = treffer[0];
    const label = treffer[1] ?? "";
    const pad = treffer[2] ?? "/";
    const start = treffer.index;

    if (start > laatsteEind) delen.push(tekst.slice(laatsteEind, start));

    delen.push(
      <Link
        key={`${pad}-${start}`}
        to={pad}
        className="text-ink underline decoration-white/25 underline-offset-2 hover:decoration-white/60"
      >
        {label}
      </Link>,
    );

    laatsteEind = start + geheel.length;
  }

  if (laatsteEind === 0) return <>{tekst}</>;
  if (laatsteEind < tekst.length) delen.push(tekst.slice(laatsteEind));

  return <>{delen}</>;
}
