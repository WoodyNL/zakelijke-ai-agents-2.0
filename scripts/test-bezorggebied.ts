#!/usr/bin/env node
/**
 * Test op het herkennen van het bezorggebied.
 *
 * Een fout hier gaat twee kanten op en allebei zijn ze duur. Zet hij een klant
 * ten onrechte buiten het gebied, dan krijgt die geen aanbod. Zet hij iemand
 * ten onrechte erbinnen, dan belooft de agent een bezorging die niet komt.
 *
 *   node scripts/test-bezorggebied.ts
 */

import { bepaalGebied, ligtInGebied, normaliseerPlaats } from "../src/lib/bezorggebied.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nBezorggebied herkennen\n" + "=".repeat(54));

console.log("Schrijfwijzen gelijktrekken");
for (const [ruw, verwacht] of [
  ["LEIDEN", "leiden"],
  ["  Leiden  ", "leiden"],
  ["'s-Gravenhage", "s-gravenhage"],
  ["Katwijk ZH", "katwijk"],
  ["Nieuw-Vennep", "nieuw-vennep"],
  ["Alphen aan den Rijn", "alphen aan den rijn"],
] as const) {
  meld(normaliseerPlaats(ruw) === verwacht, `${JSON.stringify(ruw)} → ${verwacht}`, normaliseerPlaats(ruw));
}

console.log("\nBinnen het gebied");
for (const p of [
  "LEIDEN", "Leiden", "katwijk", "Katwijk ZH", "DEN HAAG", "'s-Gravenhage",
  "Noordwijk", "Hoofddorp", "Nieuw Vennep", "Nieuw-Vennep", "Zandvoort",
  "Wassenaar", "Alphen aan den Rijn", "Rijnsburg", "Voorhout", "Zoeterwoude",
]) {
  meld(ligtInGebied(p) === true, `${p}`);
}

console.log("\nBuiten het gebied");
for (const p of ["Groningen", "Tilburg", "Apeldoorn", "Papendrecht", "Utrecht", "Roermond"]) {
  meld(ligtInGebied(p) === false, `${p}`);
}

console.log("\nBijzondere gevallen");
meld(ligtInGebied("") === null, "lege plaats is onbekend, niet buiten");
meld(ligtInGebied(null) === null, "geen plaats is onbekend, niet buiten");
meld(ligtInGebied("--") === false, '"--" telt als buiten, want het is geen plaats');

// Amsterdam stond even als "op de rand" in de code maar niet in het
// kennisbestand. Een uitzondering die maar op één plek staat, laat de agent iets
// anders zeggen dan wat er is afgesproken — dus valt Amsterdam gewoon buiten.
const amsterdam = bepaalGebied("Amsterdam");
meld(
  amsterdam !== null && !amsterdam.binnen && !amsterdam.rand,
  "Amsterdam ligt buiten het gebied",
);

const leiden = bepaalGebied("leiden");
meld(
  leiden !== null && leiden.binnen && leiden.streek === "Leiden en omgeving",
  "de streek komt mee",
  leiden !== null && leiden.binnen ? leiden.streek : "",
);

console.log("\nToevoegingen tussen haakjes");

// Uit de echte leadlijst. Zonder dit viel heel Scheveningen en Kijkduin buiten
// het bezorggebied, terwijl de chauffeur er langsrijdt.
for (const p of [
  "Den Haag (Kijkduin)",
  "Den Haag (Scheveningen)",
  "Rijnsburg (standplaatsen Oegstgeest & Katwijk)",
  "Noordwijk (Langevelderslag)",
]) {
  meld(ligtInGebied(p) === true, `${p}`);
}

// Een buurtschap met de gemeente tussen haakjes: de haakjes redden hem.
meld(ligtInGebied("Lisserbroek (Lisse)") === true, "Lisserbroek (Lisse) telt mee via Lisse");

// Maar een toevoeging mag een plaats niet naar binnen praten die er niet ligt.
meld(ligtInGebied("Tilburg (centrum)") === false, "Tilburg (centrum) blijft buiten");
meld(
  ligtInGebied("Amsterdam (Zuid)") === false,
  "Amsterdam met een wijk erbij blijft ook buiten",
);

console.log("\n" + "=".repeat(54));
if (gezakt === 0) console.log("Alles in orde.\n");
else { console.log(`${gezakt} controle(s) gezakt.\n`); process.exit(1); }
