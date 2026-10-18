/**
 * De regels van de review-agent, zonder model en zonder database.
 *
 * Wanneer er gevraagd wordt (zoveel dagen na de klus, nooit na een klacht als
 * dat zo is ingesteld), wat er in het verzoek staat, en wat het onderzoek
 * zegt over recentheid: alleen reviews van de laatste negentig dagen tellen
 * voor het gemiddelde dat we tonen, want dat is waar consumenten naar kijken.
 */

export type Verzoek = {
  email: string;
  naam: string | null;
  klaar_op: string; // "2026-10-18"
  klacht: boolean;
  status: string;
};

const dag = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
export const vandaagIso = (nu = new Date()) => nu.toISOString().slice(0, 10);

/** Is dit verzoek aan de beurt? */
export function magVragen(
  v: Verzoek,
  o: { naDagen: unknown; nietNaKlacht: unknown },
  vandaag = vandaagIso(),
): boolean {
  if (v.status !== "gepland") return false;
  if (v.klacht && o.nietNaKlacht !== false) return false;
  const n = Number(o.naDagen);
  const wacht = Number.isFinite(n) && n >= 0 ? Math.round(n) : 1;
  const sinds = Math.floor((dag(vandaag).getTime() - dag(v.klaar_op).getTime()) / 86_400_000);
  // Niet ouder dan dertig dagen vragen: een verzoek over een klus van twee
  // maanden geleden is vreemd, en het onderzoek zegt dat de kans dan klein is.
  return sinds >= wacht && sinds <= 30;
}

export function verzoekTekst(o: {
  naam: string | null;
  bedrijfsnaam: string;
  link: string;
  ondertekening: string;
}): { onderwerp: string; tekst: string } {
  const aanhef = o.naam ? `Beste ${o.naam},` : "Beste klant,";
  return {
    onderwerp: `Hoe was het? Een review helpt ${o.bedrijfsnaam} enorm`,
    tekst: `${aanhef}\n\nBedankt dat je voor ${o.bedrijfsnaam} koos. Zou je in een minuut willen delen hoe je het vond? Andere mensen lezen dat voordat ze kiezen, en wij leren ervan — ook als er iets beter kon.\n\n${o.link}\n\nAlvast dank.\n\n${o.ondertekening}`,
  };
}

/** Gemiddelde over de laatste `dagen` dagen, afgerond op één decimaal. */
export function gemiddeldeRecent(
  reviews: Array<{ sterren: number; geplaatst_op: string }>,
  dagen = 90,
  vandaag = vandaagIso(),
): number | null {
  const grens = dag(vandaag).getTime() - dagen * 86_400_000;
  const recent = reviews.filter((r) => dag(r.geplaatst_op).getTime() >= grens);
  if (recent.length === 0) return null;
  return Math.round((recent.reduce((s, r) => s + r.sterren, 0) / recent.length) * 10) / 10;
}

/** Mag dit antwoord automatisch geplaatst worden? Alleen bij vijf sterren, als dat is ingesteld. */
export function magAutomatischAntwoorden(sterren: number, modus: unknown): boolean {
  return modus === "automatisch_positief" && sterren === 5;
}
