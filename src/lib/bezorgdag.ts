/**
 * Welke vrijdag wordt het?
 *
 * De chauffeur rijdt op vrijdag, dus de vraag is alleen: wélke. Dat is een
 * rekensommetje, maar eentje met twee valkuilen die het de moeite waard maken
 * om hem apart te kunnen nalopen.
 *
 * De eerste is de tijdzone. "Welke dag is het" moet de Nederlandse wandklok
 * volgen en niet de klok van de server, anders plant een server die in UTC
 * staat op donderdagavond nog voor "overmorgen" terwijl het hier al vrijdag
 * is. Vandaar `delen()` en niet `getDay()`.
 *
 * De tweede is de voorbereiding. Een pakket dat vanavond wordt afgesproken
 * kan niet morgenochtend mee: het moet gemaakt, de woensdagse bevestiging
 * moet er nog langs, en de chauffeur plant zijn route. Daarom moet er een
 * ruime werkdag tussen zitten.
 */

// Met extensie en relatief, zodat Node dit bestand rechtstreeks kan laden:
// de tests draaien zonder bundelaar en kennen het @/-pad niet.
import { delen } from "./verzendvenster.ts";

/**
 * Hoeveel hele dagen er minstens tussen de afspraak en de bezorging zitten.
 *
 * Drie, zodat een afspraak die op dinsdag rondkomt nog diezelfde week mee kan
 * (dinsdag → vrijdag), maar eentje van woensdag naar de week erna gaat. Dat is
 * precies de grens waarop de bevestigingsronde van woensdag nog werkt: wat na
 * woensdag binnenkomt, zou anders zonder bevestiging de bus in gaan.
 */
export const DAGEN_VOORBEREIDING = 3;

/** Een datum als `2026-10-23`, in Nederlandse dagen gerekend. */
function alsIso(jaar: number, maand: number, dag: number): string {
  return `${jaar}-${String(maand).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

/**
 * De eerstvolgende vrijdagen, vanaf vandaag gerekend in Nederlandse tijd.
 *
 * Geeft `aantal` data terug, de eerste minstens DAGEN_VOORBEREIDING dagen weg.
 */
export function komendeVrijdagen(nu: Date, aantal = 8): string[] {
  const d = delen(nu);

  // Middernacht van vandaag, in UTC gerekend. Door met hele dagen te rekenen
  // vanaf een vaste middag (12:00 UTC) loopt er niets mis met zomertijd.
  const vandaag = Date.UTC(d.jaar, d.maand - 1, d.dag, 12);

  const uit: string[] = [];
  for (let over = DAGEN_VOORBEREIDING; uit.length < aantal; over++) {
    const kandidaat = new Date(vandaag + over * 86_400_000);
    if (kandidaat.getUTCDay() !== 5) continue;
    uit.push(
      alsIso(kandidaat.getUTCFullYear(), kandidaat.getUTCMonth() + 1, kandidaat.getUTCDate()),
    );
  }
  return uit;
}

/**
 * De eerstvolgende vrijdag waar nog ruimte is.
 *
 * `bezet` is hoeveel pakketten er per dag al staan. Een dag die aan de
 * vuistregel zit, wordt overgeslagen — maar alleen hier, in het automatische
 * spoor. Frank kan in het portaal nog steeds een eenentwintigste bezorging op
 * een volle dag zetten, want hij staat in de bus en weet of het kan. Een
 * machine die dat uit zichzelf doet, weet dat niet.
 *
 * Geeft `null` als er in de gevraagde reeks geen dag met ruimte zit. Dan plant
 * de agent niets en zegt hij niets toe; dat is beter dan een dag beloven die
 * niet gehaald wordt.
 */
export function kiesBezorgdag(
  nu: Date,
  bezet: Map<string, number>,
  maximum: number,
  vooruit = 8,
): string | null {
  for (const dag of komendeVrijdagen(nu, vooruit)) {
    if ((bezet.get(dag) ?? 0) < maximum) return dag;
  }
  return null;
}
