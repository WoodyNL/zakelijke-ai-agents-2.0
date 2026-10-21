#!/usr/bin/env node
/**
 * Test op het kiezen van een bezorgdag.
 *
 * Hier wordt een rit vastgelegd zonder dat er een mens naar kijkt, dus de
 * twee dingen die hier mis kunnen gaan — de verkeerde dag, of een dag die te
 * dichtbij is — moeten in beide tijdzones kloppen.
 *
 *   node scripts/test-bezorgdag.ts
 */

import { DAGEN_VOORBEREIDING, komendeVrijdagen, kiesBezorgdag } from "../src/lib/bezorgdag.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

/** Een tijdstip op de Nederlandse wandklok, als echte Date. */
const nl = (iso: string) => new Date(iso);

console.log("\nHet zijn altijd vrijdagen\n" + "=".repeat(52));

for (const moment of [
  "2026-10-19T09:00:00+02:00", // maandag
  "2026-10-21T23:30:00+02:00", // woensdagavond
  "2026-10-23T08:00:00+02:00", // vrijdagochtend
  "2026-12-31T15:00:00+01:00", // oudejaarsdag, over de jaargrens
]) {
  const dagen = komendeVrijdagen(nl(moment), 5);
  const allemaalVrijdag = dagen.every((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 5);
  meld(allemaalVrijdag, `vanaf ${moment.slice(0, 16)}`, dagen.slice(0, 3).join(", "));
}

console.log("\nVoorbereidingstijd\n" + "=".repeat(52));

// Dinsdag 20 oktober: vrijdag de 23e is drie dagen weg, dus die mag nog mee.
meld(
  komendeVrijdagen(nl("2026-10-20T14:00:00+02:00"))[0] === "2026-10-23",
  "dinsdag haalt de vrijdag van diezelfde week",
  komendeVrijdagen(nl("2026-10-20T14:00:00+02:00"))[0],
);

// Woensdag 21 oktober: de 23e is twee dagen weg. Te kort — dan de week erna.
meld(
  komendeVrijdagen(nl("2026-10-21T08:00:00+02:00"))[0] === "2026-10-30",
  "woensdag schuift door naar de week erna",
  komendeVrijdagen(nl("2026-10-21T08:00:00+02:00"))[0],
);

meld(
  komendeVrijdagen(nl("2026-10-23T07:00:00+02:00"))[0] === "2026-10-30",
  "op de bezorgvrijdag zelf is de eerstvolgende die erna",
  komendeVrijdagen(nl("2026-10-23T07:00:00+02:00"))[0],
);

for (const dagen of [komendeVrijdagen(nl("2026-10-19T09:00:00+02:00"), 6)]) {
  const afstanden = dagen.map(
    (d) =>
      (Date.parse(`${d}T12:00:00Z`) - Date.parse("2026-10-19T12:00:00Z")) / 86_400_000,
  );
  meld(
    afstanden.every((a) => a >= DAGEN_VOORBEREIDING),
    `elke dag ligt minstens ${DAGEN_VOORBEREIDING} dagen weg`,
    afstanden.join(", "),
  );
  meld(
    afstanden.every((a, i) => i === 0 || a - afstanden[i - 1]! === 7),
    "en ze liggen een week uit elkaar",
  );
}

console.log("\nMiddernacht en de tijdzone van de server\n" + "=".repeat(52));

/*
 * Om 23:30 Nederlandse tijd op woensdag is het in UTC al donderdag. Een
 * berekening op de serverklok zou dan een dag opschuiven. Dit is precies de
 * fout die de suite eerder in twee tijdzones heeft gevangen, dus hij staat
 * hier expliciet in.
 */
meld(
  komendeVrijdagen(nl("2026-10-21T23:30:00+02:00"))[0] ===
    komendeVrijdagen(nl("2026-10-21T09:00:00+02:00"))[0],
  "woensdag 23:30 geeft dezelfde vrijdag als woensdag 09:00",
  komendeVrijdagen(nl("2026-10-21T23:30:00+02:00"))[0],
);

meld(
  komendeVrijdagen(nl("2026-10-22T00:30:00+02:00"))[0] === "2026-10-30",
  "donderdag 00:30 telt als donderdag",
  komendeVrijdagen(nl("2026-10-22T00:30:00+02:00"))[0],
);

console.log("\nVolle dagen overslaan\n" + "=".repeat(52));

const maandag = nl("2026-10-19T09:00:00+02:00");

meld(kiesBezorgdag(maandag, new Map(), 20) === "2026-10-23", "lege agenda: de eerste vrijdag");

meld(
  kiesBezorgdag(maandag, new Map([["2026-10-23", 19]]), 20) === "2026-10-23",
  "negentien van twintig: er kan er nog één bij",
);

meld(
  kiesBezorgdag(maandag, new Map([["2026-10-23", 20]]), 20) === "2026-10-30",
  "twintig van twintig: door naar de week erna",
);

meld(
  kiesBezorgdag(
    maandag,
    new Map([
      ["2026-10-23", 20],
      ["2026-10-30", 25],
    ]),
    20,
  ) === "2026-11-06",
  "een dag die Frank zelf heeft overvuld wordt ook overgeslagen",
);

// Alles vol: dan plant de agent niets. Liever geen toezegging dan een dag
// beloven die niet gehaald wordt.
const allesVol = new Map(komendeVrijdagen(maandag, 8).map((d) => [d, 20] as const));
meld(
  kiesBezorgdag(maandag, allesVol, 20) === null,
  "acht volle vrijdagen op rij: geen dag, dus geen toezegging",
);

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
