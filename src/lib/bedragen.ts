/**
 * Herkennen of er een bedrag in een stuk tekst staat.
 *
 * De agent van FJ Snacks noemt geen prijzen. Dat is afgedwongen door bedragen
 * weg te laten uit wat het model te zien krijgt, en dan hangt alles aan de
 * vraag wat een bedrag is.
 *
 * De eerste versie keek alleen naar een euroteken of het woord euro. Dat is op
 * 16 oktober 2026 te smal gebleken bij een laatste controle vóór de eerste
 * echte verzending: "Een doos kost 36,45" kwam er zo gewoon door, en dat is
 * precies het soort regel dat iemand met de hand in een kennisbank typt.
 *
 * Maar een getal met twee decimalen is niet altijd geld. "Een doos bevat 4,05
 * kg" is een doosinhoud, en die hoort de agent juist te weten. Het verschil
 * zit in wat er achter staat: een eenheid maakt het een maat, en anders is het
 * een bedrag.
 *
 * Dit bestand is bewust puur en zonder imports, zodat zowel de server als het
 * campagneformulier er dezelfde regel uit haalt — en zodat het te testen is.
 */

/** Een expliciet geldteken of -woord. Dan is het klaar. */
const GELDWOORD = /€|\$|\bEUR\b|\beuro'?s?\b|\bcent(en)?\b|\bct\b|\bp\/st\b/i;

/** Wat een getal tot een maat maakt in plaats van een bedrag. */
const EENHEID =
  /^\s*(kg|kilo|kilogram|gram|gr|g|mg|cm|mm|m|ml|cl|l|liter|stuks?|doos|dozen|uur|uren|min|minuten|dagen|weken|maanden|jaar|jaren|%|procent|graden)\b/i;

/** Een getal met precies twee decimalen; de vorm waarin een prijs wordt getypt. */
const DECIMAAL = /\d+[.,]\d{2}(?!\d)/g;

export function bevatBedrag(tekst: string): boolean {
  if (!tekst) return false;
  if (GELDWOORD.test(tekst)) return true;

  // Een kaal getal met twee decimalen, zonder eenheid erachter. "36,45" is dan
  // een bedrag; "4,05 kg" niet.
  for (const m of tekst.matchAll(DECIMAAL)) {
    const rest = tekst.slice((m.index ?? 0) + m[0].length);
    if (!EENHEID.test(rest)) return true;
  }
  return false;
}

/**
 * Bedragen uit een tekst halen.
 *
 * Voor de notities per contact, die uit Franks boekhouding komen en bevatten
 * wat iemand jaren geleden betaalde. Die bedragen mag de agent niet gebruiken
 * en ze voegen voor de rest van het verhaal niets toe, dus gaan ze eruit.
 *
 * Jaartallen, gewichten en aantallen blijven staan: een notitie die halverwege
 * onleesbaar is gemaakt, is erger dan een notitie met een getal erin.
 */
export function zonderBedragen(tekst: string): string {
  return tekst
    .replace(/(?:€|\$|EUR)\s?\d[\d.,]*/gi, "(bedrag weggelaten)")
    .replace(/\d[\d.,]*\s?(?:euro'?s?|eur|cent(?:en)?|ct)\b/gi, "(bedrag weggelaten)")
    .replace(/\d+[.,]\d{2}\s*(?:per\s+\w+|p\/\w+)/gi, "(bedrag weggelaten)")
    .replace(/\d+[.,]\d{2}(?!\d)(?!\s*(?:kg|kilo|gram|gr|g|cm|mm|ml|l|liter|stuks?|%)\b)/gi, "(bedrag weggelaten)")
    .replace(/\s{2,}/g, " ")
    .trim();
}
