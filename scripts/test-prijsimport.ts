#!/usr/bin/env node
/**
 * Test op het uitlezen van prijslijsten.
 *
 * Een fout hier is de duurste in het hele platform. Leest de import 12,50 als
 * 1250, dan staat dat bedrag in honderd verzonden mails voordat iemand het
 * merkt — en dan heeft een klant een prijs gekregen die nooit is afgesproken.
 *
 *   node scripts/test-prijsimport.ts
 */

import {
  alsKennis,
  euroTekst,
  leesBedrag,
  leesPrijzen,
  raadPrijskolommen,
} from "../src/lib/prijsimport.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const bedrag = (cel: string, verwacht: number | null) =>
  meld(leesBedrag(cel) === verwacht, `${JSON.stringify(cel)} → ${verwacht}`, `kreeg ${leesBedrag(cel)}`);

console.log("\nPrijslijsten uitlezen\n" + "=".repeat(56));

console.log("Bedragen, Nederlandse opmaak");
bedrag("12,50", 12.5);
bedrag("€ 12,50", 12.5);
bedrag("€12,50", 12.5);
bedrag("1.250,00", 1250);
bedrag("1.250", 1250); // punt met drie cijfers erachter = duizendtal
bedrag("EUR 8,95", 8.95);
bedrag(" 7,20 ", 7.2);

console.log("\nBedragen, Engelse opmaak");
bedrag("12.50", 12.5); // punt met twee cijfers erachter = decimaal
bedrag("1,250.00", 1250);
bedrag("9.9", 9.9);

console.log("\nBedragen met rommel eromheen");
bedrag("€ 12,50 excl. btw", 12.5);
bedrag("12,50 p/kg", 12.5);
bedrag("prijs: 15,00", 15);

console.log("\nWat géén bedrag is");
bedrag("", null);
bedrag("op aanvraag", null);
bedrag("-", null);
bedrag("12,345", null); // drie decimalen is geen prijs
bedrag("nvt", null);

console.log("\nKolommen raden");
const lijst = [
  ["Artikelnummer", "Omschrijving", "Eenheid", "Verkoopprijs"],
  ["K-100", "Kipfilet naturel", "per kilo", "€ 8,95"],
  ["K-220", "Kipdijfilet", "per kilo", "7,40"],
  ["K-330", "Kipsaté 100 stuks", "per doos", "€ 42,50"],
];
const ind = raadPrijskolommen(lijst, true);
meld(ind.nummer === 0, "artikelnummer herkend", `kolom ${ind.nummer}`);
meld(ind.omschrijving === 1, "omschrijving herkend", `kolom ${ind.omschrijving}`);
meld(ind.eenheid === 2, "eenheid herkend", `kolom ${ind.eenheid}`);
meld(ind.bedrag === 3, "prijskolom herkend", `kolom ${ind.bedrag}`);

// Een kop die nergens "prijs" heet: dan moet de inhoud het zeggen.
const raar = [
  ["Code", "Wat het is", "Tarief 2026"],
  ["A1", "Kipfilet", "8,95"],
  ["A2", "Kipdij", "7,40"],
];
meld(raadPrijskolommen(raar, true).bedrag === 2, "prijskolom gevonden bij een vreemde kop");

const zonderKop = [
  ["Kipfilet", "8,95"],
  ["Kipdij", "7,40"],
];
const zk = raadPrijskolommen(zonderKop, false);
meld(zk.bedrag === 1, "prijskolom gevonden zonder kopregel", `kolom ${zk.bedrag}`);

console.log("\nRijen omzetten");
const rommel = [
  ["Artikelnummer", "Omschrijving", "Eenheid", "Verkoopprijs"],
  ["K-100", "Kipfilet naturel", "per kilo", "€ 8,95"],
  ["", "", "", ""],
  ["K-220", "Kipdijfilet", "per kilo", "7,40"],
  ["K-900", "Speciale bestelling", "", "op aanvraag"],
  ["K-950", "", "per doos", "19,95"],
  ["K-330", "Kipsaté 100 stuks", "per doos", "€ 1.250,00"],
];
const r = leesPrijzen(rommel, raadPrijskolommen(rommel, true), true);

meld(r.regels.length === 3, "drie bruikbare regels", `${r.regels.length}`);
meld(r.overgeslagen.length === 2, "twee overgeslagen", `${r.overgeslagen.length}`);
meld(
  r.overgeslagen.some((o) => o.reden.includes("bedrag")),
  '"op aanvraag" krijgt een reden',
);
meld(
  r.overgeslagen.some((o) => o.reden.includes("omschrijving")),
  "bedrag zonder omschrijving wordt niet geraden",
);
meld(r.regels[0]!.bedrag === 8.95, "8,95 blijft 8,95", String(r.regels[0]!.bedrag));
meld(r.regels[2]!.bedrag === 1250, "€ 1.250,00 blijft 1250", String(r.regels[2]!.bedrag));

console.log("\nHoe het in de kennisbank komt");
const k = alsKennis(r.regels[0]!);
meld(k.content.includes("€ 8,95"), "het bedrag staat er letterlijk in", k.content);
meld(k.content.includes("per kilo"), "de eenheid staat erbij");
meld(k.title.includes("K-100"), "het artikelnummer staat in de titel", k.title);
meld(euroTekst(1250) === "€ 1.250,00", "notatie in Nederlandse opmaak", euroTekst(1250));
meld(euroTekst(7.4) === "€ 7,40", "altijd twee decimalen", euroTekst(7.4));

console.log("\n" + "=".repeat(56));
if (gezakt === 0) console.log("Alles in orde.\n");
else { console.log(`${gezakt} controle(s) gezakt.\n`); process.exit(1); }
