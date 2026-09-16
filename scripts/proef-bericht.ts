#!/usr/bin/env node
/**
 * Een bericht laten opstellen en bekijken, zonder dat er iets verstuurd wordt.
 *
 * Dit is geen test met een goed of fout antwoord — de uitkomst is elke keer
 * anders. Het is een kijkglas: vul de kennisbank hieronder met wat de klant
 * werkelijk heeft aangeleverd en lees wat eruit komt voordat er honderd van die
 * berichten weggaan.
 *
 * Let er bij het lezen vooral op of er iets staat wat NIET in de kennisbank
 * stond. Dat is de enige fout die echt schade doet.
 *
 * Let op: dit kost modelgebruik. Vier berichten per keer.
 *
 *   node scripts/proef-bericht.ts
 */

import { readFileSync } from "node:fs";
for (const regel of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = regel.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]!.replace(/^["']|["']$/g, "");
}

const { stelBerichtOp } = await import("../src/lib/bericht-opstellen.server.ts");

// ---------------------------------------------------------------------------
// Vul dit met wat de klant werkelijk heeft aangeleverd.
// Leeg laten is een geldige proef: dan zie je of de agent zich inhoudt.
// ---------------------------------------------------------------------------
const KENNIS: Array<{ category: string; title: string; content: string }> = [];

const BASIS = {
  bedrijfsnaam: "FJ Snacks",
  ondertekening: "Frank Ransijn, FJ Snacks",
  aanbod: "Een proefpakket kip, dat onze eigen chauffeur op een vrijdag langsbrengt.",
  kennis: KENNIS,
};

const GEVALLEN = [
  {
    titel: "Oud-klant met volledige naam",
    contact: { naam: "Piet van Dam", bedrijf: "Slagerij Van Dam", plaats: "Leiden", herkomst: "oud_klant" as const },
  },
  {
    titel: "Koud contact met alleen een initiaal",
    contact: { naam: "J. Bakker", bedrijf: "Hotel Zuid", plaats: "Den Haag", herkomst: "koud" as const },
  },
  {
    titel: "Koud contact zonder naam",
    contact: { bedrijf: "Café Centraal", plaats: "Hoofddorp", herkomst: "koud" as const },
  },
  {
    titel: "Opvolging na uitblijvend antwoord",
    contact: { naam: "Piet van Dam", bedrijf: "Slagerij Van Dam", plaats: "Leiden", herkomst: "oud_klant" as const },
    vorigBericht:
      "Beste Piet,\n\nU bent eerder klant geweest bij ons. Onze chauffeur brengt op een vrijdag graag een proefpakket langs.\n\nFrank",
  },
];

console.log(
  `\nProefberichten — kennisbank bevat ${KENNIS.length} item(s)\n` + "=".repeat(66),
);

for (const g of GEVALLEN) {
  const concept = await stelBerichtOp({ ...BASIS, contact: g.contact, vorigBericht: g.vorigBericht });
  console.log("\n" + "-".repeat(66));
  console.log(g.titel);
  console.log("-".repeat(66));
  console.log("ONDERWERP: " + concept.onderwerp + "\n");
  console.log(concept.tekst);
  console.log(`\n[${concept.tekst.split(/\s+/).length} woorden]`);
}

console.log("\n" + "=".repeat(66));
console.log("Staat hier iets in wat niet in de kennisbank stond? Dan klopt het niet.\n");
