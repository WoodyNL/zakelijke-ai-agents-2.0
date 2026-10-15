#!/usr/bin/env node
/**
 * Test op de vuistregel van twintig pakketten per vrijdag.
 *
 * Een klein bestand, maar dit getal staat op drie plekken in het bezorgscherm
 * en bepaalt wanneer er gevraagd wordt of je het zeker weet. Een misrekening
 * van één betekent dat de vraag bij negentien al komt, of bij eenentwintig nog
 * niet — en dat laatste is precies de situatie die niemand opmerkt.
 *
 *   node scripts/test-busvracht.ts
 */

import { PAKKETTEN_PER_VRIJDAG, busvracht } from "../src/lib/busvracht.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nTwintig pakketten per vrijdag\n" + "=".repeat(52));

meld(PAKKETTEN_PER_VRIJDAG === 20, "de vuistregel is twintig", String(PAKKETTEN_PER_VRIJDAG));

// De grens zelf. Negentien mag zonder vragen, twintig is vol, eenentwintig is
// erover — en in alle drie de gevallen mag het nog steeds doorgaan.
meld(!busvracht(0).vol, "een lege dag is niet vol");
meld(!busvracht(19).vol, "negentien is nog niet vol", busvracht(19).tekst);
meld(busvracht(20).vol, "twintig is vol", busvracht(20).tekst);
meld(busvracht(21).vol, "eenentwintig is vol", busvracht(21).tekst);

meld(busvracht(14).over === 6, "bij veertien kunnen er nog zes mee", String(busvracht(14).over));
meld(busvracht(20).over === 0, "bij twintig geen ruimte meer");
meld(busvracht(23).over === -3, "bij drieëntwintig drie erboven", String(busvracht(23).over));

// De tekst gaat op het scherm, dus die moet een mens zonder uitleg plaatsen.
meld(busvracht(14).tekst === "14 van 20", "de gewone tekst", busvracht(14).tekst);
meld(busvracht(20).tekst.includes("vol"), "bij vol staat dat erbij", busvracht(20).tekst);
meld(
  busvracht(23).tekst.includes("3 boven de vuistregel"),
  "erboven staat hoeveel, niet een waarschuwing",
  busvracht(23).tekst,
);

console.log("\n" + "=".repeat(52));
if (gezakt > 0) { console.log(`${gezakt} test(s) mislukt.\n`); process.exit(1); }
console.log("Alles in orde.\n");
