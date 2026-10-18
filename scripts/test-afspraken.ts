#!/usr/bin/env node
/**
 * Test de regels van de afsprakenagent: welke herinnering wanneer, en hoe een
 * antwoord gelezen wordt. Het lezen is conservatief; de controles hier zijn
 * vooral de twijfelgevallen die naar een mens moeten.
 *
 *   node scripts/test-afspraken.ts
 */
import {
  herinneringNodig,
  herinneringTekst,
  leesAntwoord,
  leesHerinnerUren,
  noShowTekst,
} from "../src/lib/afspraken.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const nu = new Date("2026-10-18T08:00:00Z");
const over = (uren: number) => new Date(nu.getTime() + uren * 3_600_000).toISOString();

console.log("\nDe herinneruren lezen\n" + "=".repeat(52));
meld(JSON.stringify(leesHerinnerUren(["48", "2"])) === "[48,2]", "standaard");
meld(
  JSON.stringify(leesHerinnerUren(["2", "48", "48", "0", "x"])) === "[48,2]",
  "gesorteerd van ver naar dichtbij, onzin weg",
);
meld(JSON.stringify(leesHerinnerUren(null)) === "[48,2]", "zonder instelling de standaard");

console.log("\nWelke herinnering nu\n" + "=".repeat(52));
const a = { status: "gepland", herinnerd: [] as number[] };
meld(
  herinneringNodig({ ...a, begint_op: over(47) }, [48, 2], nu) === 48,
  "47 uur vooraf: de 48-uursherinnering",
);
meld(
  herinneringNodig({ ...a, begint_op: over(47), herinnerd: [48] }, [48, 2], nu) === null,
  "al gehad: niets",
);
meld(
  herinneringNodig({ ...a, begint_op: over(1.5) }, [48, 2], nu) === 2,
  "anderhalf uur vooraf: de 2-uursherinnering",
);
meld(
  herinneringNodig({ ...a, begint_op: over(20) }, [48, 2], nu) === null,
  "20 uur vooraf: 48 is te laat om nog te sturen, 2 nog niet aan de beurt",
);
meld(herinneringNodig({ ...a, begint_op: over(-1) }, [48, 2], nu) === null, "voorbij: niets");
meld(
  herinneringNodig({ ...a, status: "geannuleerd", begint_op: over(47) }, [48, 2], nu) === null,
  "geannuleerd: niets",
);
meld(
  herinneringNodig({ ...a, status: "bevestigd", begint_op: over(1.5) }, [48, 2], nu) === 2,
  "bevestigd krijgt nog wel de laatste herinnering",
);

console.log("\nAntwoorden lezen\n" + "=".repeat(52));
meld(leesAntwoord("Ja") === "bevestigd", "'Ja'");
meld(leesAntwoord("Ja, tot dan!") === "bevestigd", "'Ja, tot dan!'");
meld(leesAntwoord("Ok prima") === "bevestigd", "'Ok prima'");
meld(leesAntwoord("Hierbij bevestig ik de afspraak.") === "bevestigd", "'Hierbij bevestig ik'");
meld(
  leesAntwoord("Ja, maar kan het ook donderdag?") === "verzetten",
  "'ja, maar kan het ook donderdag?' is verzetten, geen bevestiging",
);
meld(
  leesAntwoord("Dat lukt niet, liever volgende week") === "verzetten",
  "'lukt niet' is verzetten",
);
meld(leesAntwoord("Ik wil de afspraak annuleren") === "annuleren", "'annuleren'");
meld(
  leesAntwoord("Kan ik annuleren of verzetten?") === "verzetten",
  "annuleren mét twijfel gaat naar verzetten (een mens)",
);
meld(
  leesAntwoord("Bedankt voor de herinnering") === "onbekend",
  "een bedankje is geen bevestiging",
);
meld(
  leesAntwoord("ja\n\n> Op 17 okt schreef FJ Snacks: kun je bevestigen?") === "bevestigd",
  "de aangehaalde mail eronder telt niet mee",
);

console.log("\nTeksten\n" + "=".repeat(52));
const h = herinneringTekst({
  uren: 48,
  afspraak: {
    klant_naam: "Piet",
    begint_op: "2026-10-20T13:30:00Z",
    omschrijving: "proeverij",
    locatie: "Haarlem",
    status: "gepland",
  },
  bedrijfsnaam: "FJ Snacks",
  ondertekening: "Groet, Frank",
  verzettenTotUur: 24,
});
meld(
  h.tekst.includes("15:30") && h.tekst.includes("dinsdag 20 oktober"),
  "Nederlandse tijd en dag in de tekst",
  h.tekst.slice(0, 120),
);
meld(
  h.tekst.includes("'ja'") && h.tekst.includes("tot 24 uur van tevoren"),
  "vraagt om een ja en noemt de verzet-termijn",
);
const hb = herinneringTekst({
  uren: 2,
  afspraak: {
    klant_naam: null,
    begint_op: "2026-10-20T13:30:00Z",
    omschrijving: null,
    locatie: null,
    status: "bevestigd",
  },
  bedrijfsnaam: "FJ Snacks",
  ondertekening: "Groet",
  verzettenTotUur: 0,
});
meld(
  !hb.tekst.includes("'ja'") && hb.onderwerp.startsWith("Vandaag"),
  "al bevestigd: geen vraag meer; vlak vooraf: 'Vandaag'",
);
meld(
  noShowTekst({
    klant_naam: "Piet",
    begint_op: "2026-10-18T07:00:00Z",
    bedrijfsnaam: "FJ Snacks",
    ondertekening: "Groet",
  }).tekst.includes("Dat kan gebeuren"),
  "na een no-show: geen verwijt",
);

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
