/**
 * Hoeveel proefpakketten er op één vrijdag mee kunnen.
 *
 * Twintig, en dat is een vuistregel en geen slot.
 *
 * Het is niet wat er in de bus past — er past meer in. Het is wat er op een
 * vrijdag te doen is: de pakketten moeten ook afgegeven worden, en die vrijdag
 * is al gevuld met de vaste klanten die hun kip krijgen. De rem zit in de tijd
 * van één man, niet in de laadruimte.
 *
 * Daarom staat dit getal niet als CHECK in de database, anders dan de regel
 * dat het een vrijdag moet zijn. Die vrijdag is een feit; twintig is een
 * schatting van iemand die het nog nooit heeft gedaan. Een harde grens zou
 * betekenen dat het portaal een eenentwintigste bezorging weigert terwijl
 * Frank in de bus staat en weet dat hij er nog een kan doen. Dan is de
 * software een obstakel geworden en gaat hij het ernaast bijhouden.
 *
 * Wat het portaal wél doet: laten zien hoe vol een dag is, en vragen of je het
 * zeker weet voorbij deze grens. Dat is het verschil tussen een getal dat
 * helpt en een getal dat in de weg staat.
 *
 * Blijkt twintig na een echte vrijdag niet te kloppen, dan verandert dit ene
 * getal — en niet een migratie, een formulier en drie schermen.
 */
export const PAKKETTEN_PER_VRIJDAG = 20;

/** Hoe vol een bezorgdag zit, in woorden die een mens meteen plaatst. */
export function busvracht(aantal: number): {
  vol: boolean;
  over: number;
  tekst: string;
} {
  const over = PAKKETTEN_PER_VRIJDAG - aantal;
  if (over > 0) {
    return { vol: false, over, tekst: `${aantal} van ${PAKKETTEN_PER_VRIJDAG}` };
  }
  if (over === 0) {
    return { vol: true, over: 0, tekst: `${aantal} van ${PAKKETTEN_PER_VRIJDAG} — vol` };
  }
  return {
    vol: true,
    over,
    tekst: `${aantal} van ${PAKKETTEN_PER_VRIJDAG} — ${-over} boven de vuistregel`,
  };
}
