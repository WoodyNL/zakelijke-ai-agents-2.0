#!/usr/bin/env node
/**
 * Test de rekenregels van de offerte-agent.
 *
 * Het principe is: het model kiest, de server rekent. Deze test bewijst dat
 * een verzonnen prijs-id geen regel wordt, dat bedragen uit de prijslijst
 * komen en niet uit de keuze, en dat "direct versturen" alleen opengaat als
 * alle vier de voorwaarden waar zijn.
 *
 *   node scripts/test-offerte-regels.ts
 */

import {
  bouwOfferte,
  geldigTot,
  leesPrijslijst,
  magDirect,
  regelsAlsTekst,
} from "../src/lib/offerte-regels.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nDe prijslijst teruglezen uit de kennisbank\n" + "=".repeat(52));
const items = [
  {
    id: "p1",
    title: "Kipsaté rondstok 18 cm",
    content: "Kipsaté rondstok 18 cm kost € 0,95 per stuk. Artikelnummer 101.",
    category: "prijzen",
  },
  {
    id: "p2",
    title: "Varkenshaassaté (202)",
    content: "Varkenshaassaté kost €12,50 per kilo.",
    category: "prijzen",
  },
  { id: "p3", title: "Bezorging", content: "Bezorging kost € 7,50.", category: "prijzen" },
  {
    id: "k1",
    title: "Openingstijden",
    content: "Wij zijn open van 8 tot 17 uur.",
    category: "algemeen",
  },
  { id: "p4", title: "Kapot item", content: "Dit item heeft geen bedrag.", category: "prijzen" },
];
const lijst = leesPrijslijst(items);
meld(lijst.length === 3, "drie regels met een bedrag, de rest niet", `kreeg ${lijst.length}`);
meld(lijst[0]?.bedrag === 0.95 && lijst[0]?.eenheid === "per stuk", "bedrag en eenheid gelezen");
meld(
  lijst[1]?.bedrag === 12.5 && lijst[1]?.eenheid === "per kilo",
  "ook zonder spatie na het euroteken",
);
meld(lijst[2]?.bedrag === 7.5 && lijst[2]?.eenheid === null, "zonder eenheid is eenheid null");

console.log("\nDe offerte bouwen\n" + "=".repeat(52));
const o = bouwOfferte(
  [
    { prijs_id: "p1", aantal: 200 },
    { prijs_id: "p2", aantal: 2.5, opmerking: "voor zaterdag" },
    { prijs_id: "verzonnen", aantal: 1 },
    { prijs_id: "p3", aantal: 0 },
  ],
  lijst,
);
meld(o.regels.length === 2, "twee geldige regels", `kreeg ${o.regels.length}`);
meld(o.fouten.length === 2, "twee fouten: onbekende prijs en aantal nul", o.fouten.join(" | "));
meld(o.regels[0]?.bedrag === 190, "200 × 0,95 = 190,00");
meld(o.regels[1]?.bedrag === 31.25, "2,5 × 12,50 = 31,25");
meld(o.totaal === 221.25, "totaal 221,25", String(o.totaal));
meld(o.regels[0]?.bron === "Kipsaté rondstok 18 cm", "elke regel noemt zijn bron");
meld(o.regels[1]?.opmerking === "voor zaterdag", "een opmerking blijft staan");

console.log("\nDe prijs komt uit de lijst, nooit uit de keuze\n" + "=".repeat(52));
const gok = bouwOfferte([{ prijs_id: "p1", aantal: 10, prijs: 0.01 } as never], lijst);
meld(gok.regels[0]?.prijs === 0.95, "een meegestuurde prijs wordt genegeerd");

console.log("\nDirect versturen: alle vier de voorwaarden\n" + "=".repeat(52));
const basis = {
  modus: "direct",
  maxDirect: 500,
  beantwoordbaar: true,
  ontbreekt: [] as string[],
  fouten: [] as string[],
  totaal: 221.25,
};
meld(magDirect(basis), "alles in orde: mag");
meld(!magDirect({ ...basis, modus: "concept" }), "concept-modus: niet");
meld(!magDirect({ ...basis, totaal: 600 }), "boven het maximum: niet");
meld(!magDirect({ ...basis, beantwoordbaar: false }), "niet beantwoordbaar: niet");
meld(!magDirect({ ...basis, ontbreekt: ["hoeveel personen?"] }), "er ontbreekt iets: niet");
meld(!magDirect({ ...basis, fouten: ["x"] }), "een fout in de regels: niet");
meld(!magDirect({ ...basis, maxDirect: null }), "zonder maximum: niet");
meld(!magDirect({ ...basis, totaal: 0 }), "een lege offerte: niet");

console.log("\nTekst en geldigheid\n" + "=".repeat(52));
const tekst = regelsAlsTekst(o.regels, o.totaal);
meld(tekst.includes("Totaal: € 221,25"), "de tekst eindigt met het totaal");
meld(tekst.includes("€ 0,95"), "en noemt de stuksprijs");
meld(geldigTot(new Date(Date.UTC(2026, 9, 18)), 30) === "2026-11-17", "dertig dagen geldig");
meld(
  geldigTot(new Date(Date.UTC(2026, 9, 18)), "onzin") === "2026-11-17",
  "onzin valt terug op dertig",
);

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
