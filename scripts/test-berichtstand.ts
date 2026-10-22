#!/usr/bin/env node
/**
 * Test op de vraag of een bericht echt is verstuurd.
 *
 * Deze test bestaat om één fout te vangen die er al in zat: het scherm keek
 * naar een status die op dat pad nooit werd geschreven, en meldde daardoor
 * "er staat een antwoord klaar" terwijl de mail nooit was weggegaan.
 *
 *   node scripts/test-berichtstand.ts
 */

import { bezorgstand } from "../src/lib/berichtstand.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nWanneer is het echt weg\n" + "=".repeat(52));

meld(
  bezorgstand({ status: "verzonden", verzonden_op: "2026-10-22T09:00:00Z" }) === "verstuurd",
  "verzonden met tijdstip",
);
meld(
  bezorgstand({ status: "concept", verzonden_op: "2026-10-22T09:00:00Z" }) === "verstuurd",
  "een tijdstip telt, ook als de status achterloopt",
);
meld(bezorgstand({ status: "beantwoord", verzonden_op: null }) === "verstuurd", "beantwoord");
meld(bezorgstand({ status: "gepland", verzonden_op: null }) === "ingepland", "ingepland bij Resend");

console.log("\nWanneer wacht de klant nog\n" + "=".repeat(52));

meld(bezorgstand({ status: "mislukt", verzonden_op: null }) === "blijft_liggen", "mislukt");

/*
 * Dit is het geval waar het om begonnen is. Het versturen strandde, en omdat
 * er niets werd weggeschreven bleef de rij op "concept" staan. Dat mag nooit
 * als "komt goed" gelezen worden.
 */
meld(
  bezorgstand({ status: "concept", verzonden_op: null }) === "blijft_liggen",
  "blijven hangen op concept: de klant wacht nog",
);

// Een stand die we nog niet kennen valt ook aan de voorzichtige kant.
meld(
  bezorgstand({ status: "iets_nieuws", verzonden_op: null }) === "blijft_liggen",
  "een onbekende stand telt als niet verstuurd",
);

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
