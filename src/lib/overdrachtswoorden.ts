/**
 * Woorden waarbij een mens het gesprek overneemt.
 *
 * Stond eerst alleen bij de WhatsApp-opvolger, maar dit hoort bij elk kanaal
 * waar een klant iets schrijft. Een e-mailagent die opgewekt een proefpakket
 * aanbiedt aan iemand die net "de vorige levering was bedorven" schreef, doet
 * meer schade dan een agent die niets zegt.
 *
 * Puur en zonder imports, zodat het zonder netwerk te testen is.
 */

/** Staat er een woord in waarbij een mens het moet overnemen? */
export function vraagtOverdracht(tekst: string, woorden: unknown): string | null {
  const lijst = Array.isArray(woorden)
    ? woorden.map((w) => String(w).trim().toLowerCase()).filter(Boolean)
    : [];
  const t = tekst.toLowerCase();
  for (const w of lijst) {
    // Als heel woord, zodat "jurist" niet afgaat op "juristerij"... maar wel
    // op "mijn jurist". Een woord met spaties telt als zinsdeel.
    const patroon = new RegExp(
      `(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`,
      "iu",
    );
    if (patroon.test(t)) return w;
  }
  return null;
}

/**
 * De woorden waarbij een e-mailagent zijn mond houdt, als er niets is
 * ingesteld.
 *
 * Over de keuzes, want dit is een lijst waar vals alarm duur is én te weinig
 * alarm duur is.
 *
 * Eten erbij: wie schrijft dat iets bedorven was of dat iemand ziek is
 * geworden, moet nooit een verkoopmail terugkrijgen. Dat is de enige
 * categorie waar een verkeerd antwoord meteen een probleem van een andere
 * orde wordt.
 *
 * Geld en recht erbij: jurist, aansprakelijk, incasso, deurwaarder. Daar wil
 * je sowieso zelf op reageren.
 *
 * "Advocaat" staat er met opzet NIET in. Dat is bij een snackleverancier
 * net zo goed een drank, en "heb je ook advocaat?" is een bestelling en geen
 * dreigement. Precies het soort woord dat in een andere branche wél zou
 * moeten.
 */
export const STANDAARD_OVERDRACHTSWOORDEN = [
  "klacht",
  "klachten",
  "annuleren",
  "geannuleerd",
  "opzeggen",
  "jurist",
  "aansprakelijk",
  "incasso",
  "deurwaarder",
  "bedorven",
  "ziek geworden",
  "voedselvergiftiging",
  "teruggestuurd",
] as const;
