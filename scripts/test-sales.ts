#!/usr/bin/env node
/**
 * Test de regels van de sales-assistent: wat er met een oordeel gebeurt, en
 * wanneer een antwoord vanzelf weg mag. Twijfel gaat altijd naar een mens.
 *
 *   node scripts/test-sales.ts
 */
import {
  bronnenAan,
  leesOordeel,
  magZelfAntwoorden,
  minutenTeLaat,
  statusNaOordeel,
} from "../src/lib/sales.ts";
let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nHet oordeel lezen\n" + "=".repeat(52));
meld(leesOordeel("past") === "past" && leesOordeel("Ja") === "past", "past / ja");
meld(
  leesOordeel("past_niet") === "past_niet" &&
    leesOordeel("past niet") === "past_niet" &&
    leesOordeel("nee") === "past_niet",
  "past niet, in drie spellingen",
);
meld(
  leesOordeel("misschien") === "onduidelijk" && leesOordeel(undefined) === "onduidelijk",
  "alles anders is onduidelijk",
);
meld(
  statusNaOordeel("past") === "gekwalificeerd" &&
    statusNaOordeel("past_niet") === "afgewezen" &&
    statusNaOordeel("onduidelijk") === "twijfel",
  "status volgt het oordeel",
);

console.log("\nZelf antwoorden\n" + "=".repeat(52));
const basis = {
  zelfAntwoorden: true,
  oordeel: "past" as const,
  vragen: [] as string[],
  heeftTekst: true,
};
meld(magZelfAntwoorden(basis), "past, geen vragen, aangezet: mag");
meld(!magZelfAntwoorden({ ...basis, zelfAntwoorden: false }), "niet aangezet: concept");
meld(!magZelfAntwoorden({ ...basis, oordeel: "onduidelijk" }), "twijfel: nooit vanzelf");
meld(
  !magZelfAntwoorden({ ...basis, oordeel: "past_niet" }),
  "past niet: nooit vanzelf (een afwijzing schrijf je zelf)",
);
meld(!magZelfAntwoorden({ ...basis, vragen: ["budget?"] }), "open vragen: concept");
meld(!magZelfAntwoorden({ ...basis, heeftTekst: false }), "zonder tekst niets");

console.log("\nReactietijd en bronnen\n" + "=".repeat(52));
const nu = new Date("2026-10-19T10:00:00Z");
meld(
  minutenTeLaat("2026-10-19T09:52:00Z", 5, nu) === 3,
  "acht minuten geleden, doel vijf: drie te laat",
);
meld(minutenTeLaat("2026-10-19T09:58:00Z", 5, nu) === 0, "twee minuten geleden: op tijd");
meld(
  minutenTeLaat("2026-10-19T09:00:00Z", "onzin", nu) === 55,
  "onzin als doel valt terug op vijf",
);
meld([...bronnenAan(["formulier", "chat"])].join(",") === "formulier,chat", "bronnen lezen");
meld([...bronnenAan(null)].join(",") === "formulier", "zonder instelling alleen het formulier");

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
