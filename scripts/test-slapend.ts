#!/usr/bin/env node
/**
 * Test de rekenregels van de heractivatie-agent.
 *
 * Datums zijn hier de valkuil: een klant die "twaalf maanden" instelt verwacht
 * dat iemand die op 14 maart vorig jaar bestelde vandaag (14 maart) slapend is,
 * en gisteren nog niet. En een export uit een boekhoudpakket levert datums in
 * drie notaties plus Excel-serienummers; één verkeerd gelezen datum maakt
 * iemand ten onrechte slapend of juist niet.
 *
 *   node scripts/test-slapend.ts
 */

import {
  isSlapend,
  leesDatum,
  maandenGeleden,
  metRust,
  redenOmTerugTeKomen,
} from "../src/lib/slapend.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const vandaag = new Date(Date.UTC(2026, 9, 18)); // 18 oktober 2026

console.log("\nDatums lezen\n" + "=".repeat(52));
meld(iso(leesDatum("2025-03-14")) === "2025-03-14", "ISO");
meld(iso(leesDatum("14-03-2025")) === "2025-03-14", "Nederlands met streepjes");
meld(iso(leesDatum("14/03/2025")) === "2025-03-14", "met schuine strepen");
meld(iso(leesDatum("2025-03-14T10:00:00Z")) === "2025-03-14", "met tijd erachter");
meld(iso(leesDatum(45730)) === "2025-03-14", "Excel-serienummer");
meld(iso(leesDatum("45730")) === "2025-03-14", "Excel-serienummer als tekst");
meld(leesDatum("31-02-2025") === null, "31 februari is geen datum");
meld(leesDatum("gisteren") === null, "onzin is null");
meld(leesDatum("") === null, "leeg is null");

console.log("\nMaanden geleden\n" + "=".repeat(52));
meld(maandenGeleden("2025-10-18", vandaag) === 12, "precies een jaar geleden is 12");
meld(maandenGeleden("2025-10-19", vandaag) === 11, "een dag korter is nog 11");
meld(maandenGeleden("2026-10-01", vandaag) === 0, "deze maand is 0");
meld(maandenGeleden(null, vandaag) === null, "onbekend is null");

console.log("\nWie slapend is\n" + "=".repeat(52));
meld(isSlapend("2025-10-18", 12, vandaag), "twaalf maanden stil: slapend");
meld(!isSlapend("2025-10-19", 12, vandaag), "elf maanden en dertig dagen: nog niet");
meld(isSlapend(null, 12, vandaag), "onbekende datum telt als slapend (de 37 van FJ Snacks)");
meld(!isSlapend("2023-01-01", 12, vandaag), "ouder dan drie jaar: met rust laten");
meld(isSlapend("2023-10-18", 12, vandaag), "precies drie jaar: nog net wel");
meld(isSlapend("2026-07-01", 3, vandaag), "drie maanden ingesteld, drie maanden stil");

console.log("\nDe lijst 'nooit aanschrijven'\n" + "=".repeat(52));
const lijst = ["Frits@Bakker.nl", "@grootverbruik.nl", "Café De Hoek"];
meld(metRust({ email: "frits@bakker.nl" }, lijst), "adres, ongeacht hoofdletters");
meld(metRust({ email: "inkoop@grootverbruik.nl" }, lijst), "heel domein");
meld(metRust({ email: "x@y.nl", bedrijf: "café de hoek" }, lijst), "bedrijfsnaam");
meld(!metRust({ email: "x@y.nl", bedrijf: "Café De Hoek 2" }, lijst), "geen deelmatch op bedrijf");
meld(!metRust({ email: "x@y.nl" }, []), "lege lijst laat iedereen door");
meld(!metRust({ email: "x@y.nl" }, null), "geen lijst ook");

console.log("\nDe reden om terug te komen\n" + "=".repeat(52));
meld(
  redenOmTerugTeKomen("Nieuwe kipsaté", "Agent-aanbod") === "Nieuwe kipsaté",
  "campagne gaat voor",
);
meld(redenOmTerugTeKomen("  ", "Agent-aanbod") === "Agent-aanbod", "leeg valt terug op de agent");
meld(redenOmTerugTeKomen(null, 42) === null, "geen van beide: null");

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
