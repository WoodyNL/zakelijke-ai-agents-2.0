/**
 * Is dit bericht nu echt bij de ontvanger terechtgekomen?
 *
 * Eén regel, apart gezet, omdat hij eerder fout stond en dat niet te zien was.
 * Het antwoordenscherm keek naar `status === "mislukt"` om te bepalen of er
 * iets was misgegaan — maar die status werd op dit pad nooit geschreven. Een
 * mail die niet wegging bleef op "concept" staan, en het scherm meldde
 * opgewekt dat er een antwoord klaarstond. De eigenaar dacht dat de klant
 * geholpen werd terwijl diens vraag stil bleef liggen.
 *
 * Daarom staat het hier omgekeerd: niet "wanneer is het mis", maar "wanneer
 * is het goed". Verstuurd is het alleen als er een verzendmoment op staat, of
 * als de status dat met zoveel woorden zegt. Al het andere — mislukt,
 * blijven hangen, een stand die we nog niet kennen — betekent dat de klant
 * nog wacht. Dat is de kant waarop je wilt vergissen.
 */

export type BerichtStand = "concept" | "gepland" | "verzonden" | "mislukt" | "beantwoord";

export type Bezorgstand = "verstuurd" | "ingepland" | "blijft_liggen";

export function bezorgstand(bericht: {
  status: BerichtStand | string;
  verzonden_op: string | null;
}): Bezorgstand {
  if (bericht.verzonden_op !== null) return "verstuurd";
  if (bericht.status === "verzonden" || bericht.status === "beantwoord") return "verstuurd";
  // Ingepland bij Resend: die gaat vanzelf de deur uit, daar hoeft niemand
  // iets voor te doen. Alleen bij de campagnes; een antwoord gaat meteen.
  if (bericht.status === "gepland") return "ingepland";
  return "blijft_liggen";
}
