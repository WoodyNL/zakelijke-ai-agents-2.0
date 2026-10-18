#!/usr/bin/env node
/**
 * Test wanneer de betaalherinnering-agent een stap zet, en wat erin staat.
 *
 * De gevaarlijkste fout hier is niet een herinnering te weinig maar te veel:
 * een factuur die laat wordt ingelezen en in één keer drie herinneringen
 * krijgt, of een herinnering voor een factuur die al betaald of gepauzeerd
 * is. Daar gaan de meeste controles over.
 *
 *   node scripts/test-herinneringen.ts
 */

import {
  dagenTeLaat,
  herinneringTekst,
  leesMomenten,
  nietHerinneren,
  volgendeStap,
} from "../src/lib/herinneringen.ts";
import { importRijen, leesFacturen, raadFactuurkolommen } from "../src/lib/factuurimport.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const vandaag = "2026-10-18";

console.log("\nDe reeks lezen\n" + "=".repeat(52));
meld(JSON.stringify(leesMomenten(["-3", "3", "14", "30"])) === "[-3,3,14,30]", "standaardreeks");
meld(
  JSON.stringify(leesMomenten(["14", "3", "3", "onzin"])) === "[3,14]",
  "gesorteerd, ontdubbeld, onzin weg",
);
meld(JSON.stringify(leesMomenten(null)) === "[-3,3,14,30]", "zonder instelling de standaard");
meld(JSON.stringify(leesMomenten([])) === "[-3,3,14,30]", "leeg ook");

console.log("\nWanneer een stap aan de beurt is\n" + "=".repeat(52));
const open = {
  vervaldatum: "2026-10-10",
  status: "open",
  laatste_stap: 0,
  laatste_herinnering_op: null,
  pauze_tot: null,
  betaald_op: null,
};
const m = [-3, 3, 14, 30];
meld(
  volgendeStap({ ...open, vervaldatum: "2026-10-21" }, m, 3, vandaag)?.moment === -3,
  "drie dagen vóór de vervaldatum: de vooraankondiging",
);
meld(
  volgendeStap({ ...open, vervaldatum: "2026-10-25" }, m, 3, vandaag) === null,
  "een week ervoor: nog niets",
);
meld(volgendeStap(open, m, 3, vandaag)?.stap === 1, "acht dagen te laat, nog niets gehad: stap 1");
meld(
  volgendeStap(
    { ...open, laatste_stap: 1, laatste_herinnering_op: "2026-10-17T10:00:00Z" },
    m,
    3,
    vandaag,
  ) === null,
  "gisteren herinnerd: niet meteen de volgende",
);
meld(
  volgendeStap(
    {
      ...open,
      vervaldatum: "2026-09-01",
      laatste_stap: 1,
      laatste_herinnering_op: "2026-10-10T10:00:00Z",
    },
    m,
    3,
    vandaag,
  )?.stap === 2,
  "ruim te laat en de vorige is 8 dagen oud: stap 2",
);
meld(
  volgendeStap({ ...open, vervaldatum: "2026-09-01", laatste_stap: 3 }, m, 3, vandaag) === null,
  "het maximum van drie bereikt: stop",
);
meld(
  volgendeStap({ ...open, vervaldatum: "2026-09-01", laatste_stap: 4 }, m, 9, vandaag) === null,
  "alle vier de momenten gehad: stop",
);
meld(
  volgendeStap({ ...open, status: "betaald", betaald_op: "2026-10-15" }, m, 3, vandaag) === null,
  "betaald: nooit",
);
meld(volgendeStap({ ...open, status: "gepauzeerd" }, m, 3, vandaag) === null, "gepauzeerd: nooit");
meld(
  volgendeStap({ ...open, pauze_tot: "2026-10-25" }, m, 3, vandaag) === null,
  "pauze tot volgende week: nog niet",
);
meld(
  volgendeStap({ ...open, pauze_tot: "2026-10-17" }, m, 3, vandaag)?.stap === 1,
  "pauze voorbij: weer wel",
);
meld(volgendeStap({ ...open, status: "uit_handen" }, m, 3, vandaag) === null, "uit handen: nooit");
meld(
  dagenTeLaat("2026-10-10", vandaag) === 8 && dagenTeLaat("2026-10-20", vandaag) === -2,
  "dagen te laat, ook negatief",
);

console.log("\nDe tekst per stap\n" + "=".repeat(52));
const f = {
  nummer: "2026-101",
  klant_naam: "Café De Hoek",
  bedrag: 250,
  factuurdatum: "2026-09-10",
  vervaldatum: "2026-10-10",
};
const basis = {
  factuur: f,
  bedrijfsnaam: "FJ Snacks",
  ondertekening: "Met vriendelijke groet,\nFrank",
  totaalStappen: 4,
};
const t0 = herinneringTekst({ ...basis, stap: 1, moment: -3 });
meld(t0.onderwerp.startsWith("Factuur 2026-101 vervalt"), "vooraf: een attentie", t0.onderwerp);
meld(
  t0.tekst.includes("€ 250,00") && t0.tekst.includes("10 september 2026"),
  "met bedrag en factuurdatum",
);
const t1 = herinneringTekst({ ...basis, stap: 2, moment: 3 });
meld(t1.onderwerp === "Herinnering: factuur 2026-101", "kort erna: vriendelijk");
const t2 = herinneringTekst({ ...basis, stap: 3, moment: 14 });
meld(t2.onderwerp.startsWith("Tweede herinnering"), "daarna: zakelijk");
const t3 = herinneringTekst({ ...basis, stap: 4, moment: 30 });
meld(
  t3.onderwerp.includes("laatste herinnering") && t3.tekst.includes("persoonlijk contact"),
  "laatste: de ondernemer neemt het over",
);
meld(
  !/incasso|deurwaarder|rente|boete/i.test(t0.tekst + t1.tekst + t2.tekst + t3.tekst),
  "nergens een dreigement",
);
meld(
  t1.tekst.includes("als niet verzonden beschouwen"),
  "en altijd de uitweg als er al betaald is",
);
const kort = herinneringTekst({ ...basis, totaalStappen: 2, stap: 2, moment: 3 });
meld(
  kort.onderwerp.includes("laatste herinnering"),
  "bij twee stappen is stap twee de laatste, ook op dag 3",
);

console.log("\nNooit herinneren\n" + "=".repeat(52));
meld(nietHerinneren({ klant_email: "a@groot.nl" }, ["@groot.nl"]), "heel domein");
meld(
  nietHerinneren({ klant_email: "x@y.nl", klant_naam: "Familie Jansen" }, ["familie jansen"]),
  "op naam",
);
meld(!nietHerinneren({ klant_email: "x@y.nl" }, []), "lege lijst laat iedereen door");

console.log("\nEen export inlezen\n" + "=".repeat(52));
const rijen = [
  [
    "Factuurnummer",
    "Debiteur",
    "E-mail",
    "Factuurdatum",
    "Vervaldatum",
    "Openstaand",
    "Betaald op",
  ],
  ["2026-101", "Café De Hoek", "hoek@x.nl", "10-09-2026", "10-10-2026", "€ 250,00", ""],
  ["2026-102", "Bar Zuid", "zuid@x.nl", "2026-09-15", "", "1.250,50", ""],
  ["2026-103", "Zonder mail", "", "2026-09-15", "", "10", ""],
  ["2026-104", "Gek bedrag", "gek@x.nl", "2026-09-15", "", "veel", ""],
  ["2026-101", "Dubbel", "dub@x.nl", "2026-09-15", "", "5", ""],
  ["2026-105", "Al betaald", "ok@x.nl", "2026-09-01", "2026-10-01", "80", "05-10-2026"],
];
const kolommen = raadFactuurkolommen(rijen, true);
meld(
  JSON.stringify(kolommen) ===
    JSON.stringify([
      "nummer",
      "klant",
      "email",
      "factuurdatum",
      "vervaldatum",
      "bedrag",
      "betaald",
    ]),
  "kolommen geraden op de kop",
  kolommen.join(","),
);
const gelezen = leesFacturen(rijen, kolommen, true);
meld(gelezen.facturen.length === 3, "drie bruikbare facturen", `kreeg ${gelezen.facturen.length}`);
meld(
  gelezen.overgeslagen.length === 3,
  "drie overgeslagen met reden",
  gelezen.overgeslagen.map((o) => o.reden).join(" | "),
);
meld(
  gelezen.facturen[0]?.bedrag === 250 && gelezen.facturen[0]?.vervaldatum === "2026-10-10",
  "bedrag en vervaldatum",
);
meld(
  gelezen.facturen[1]?.vervaldatum === "2026-10-15" && gelezen.facturen[1]?.bedrag === 1250.5,
  "zonder vervaldatum: dertig dagen, en 1.250,50 klopt",
);
meld(gelezen.facturen[2]?.betaald_op === "2026-10-05", "een betaaldatum komt mee");

console.log("\nDe rijen voor de import\n" + "=".repeat(52));
// Een export met betaalde én open facturen door elkaar — de meeste exports.
const rijenImport = importRijen(
  gelezen.facturen,
  "10000000-0000-0000-0000-000000000001",
  "2026-10-19T08:00:00Z",
);
const sleutelsets = new Set(rijenImport.map((r) => Object.keys(r).sort().join(",")));
meld(
  sleutelsets.size === 1,
  "alle rijen hebben precies dezelfde velden (anders weigert de API het hele blok)",
  [...sleutelsets].join(" | "),
);
meld(
  !Object.keys(rijenImport[0]!).includes("status"),
  "status zit er niet in: wat een mens op pauze zette, blijft op pauze",
);
meld(
  rijenImport.some((r) => r.betaald_op) && rijenImport.some((r) => !r.betaald_op),
  "en de set bevat werkelijk betaald én open",
);

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
