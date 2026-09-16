#!/usr/bin/env node
/**
 * Test op het verdelen van berichten over dagen.
 *
 * Dit is de rem op het verzendtempo. Gaat hij stuk, dan vertrekt er in één keer
 * een hele lijst — en dat is niet terug te draaien: het verzenddomein is dan
 * beschadigd en dat herstelt traag.
 *
 *   node scripts/test-planning.ts
 */

import { opvolgmoment, verdeelOverDagen } from "../src/lib/verzenden.server.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nVerzending verdelen over dagen\n" + "=".repeat(52));

// Een maandag ver genoeg in de toekomst, zodat "niet in het verleden" niet meespeelt.
const maandag = new Date();
maandag.setDate(maandag.getDate() + 7);
while (maandag.getDay() !== 1) maandag.setDate(maandag.getDate() + 1);
maandag.setHours(9, 0, 0, 0);

const dagVan = (d: Date) => d.toISOString().slice(0, 10);

const tien = verdeelOverDagen(25, 10, maandag);
meld(tien.length === 25, "alle berichten krijgen een moment", `${tien.length}`);

const perDag = new Map<string, number>();
for (const d of tien) perDag.set(dagVan(d), (perDag.get(dagVan(d)) ?? 0) + 1);
meld(
  [...perDag.values()].every((n) => n <= 10),
  "geen dag komt boven het maximum",
  [...perDag.values()].join(" + "),
);
meld(perDag.size === 3, "25 stuks bij 10 per dag = drie dagen", `${perDag.size} dagen`);

meld(
  tien.every((d) => d.getDay() !== 0 && d.getDay() !== 6),
  "er wordt niet in het weekend verstuurd",
);

meld(
  tien.every((d) => d.getHours() >= 9 && d.getHours() < 18),
  "alles valt binnen kantooruren",
);

// Twee berichten op precies hetzelfde tijdstip is een patroon dat opvalt.
const tijden = new Set(tien.map((d) => d.getTime()));
meld(tijden.size === tien.length, "geen twee berichten op hetzelfde moment");

const oplopend = tien.every((d, i) => i === 0 || d.getTime() >= tien[i - 1]!.getTime());
meld(oplopend, "de momenten lopen op");

// Een lijst die begint in het verleden mag niet stilletjes wegvallen.
const gisteren = new Date(Date.now() - 24 * 3600 * 1000);
const inhaal = verdeelOverDagen(3, 10, gisteren);
meld(
  inhaal.every((d) => d.getTime() > Date.now()),
  "een moment in het verleden wordt naar voren gehaald",
);

// De hele lijst van FJ Snacks op tien per dag.
const heleLijst = verdeelOverDagen(137, 10, maandag);
const dagen = new Set(heleLijst.map(dagVan));

// Deze controle miste eerst, en daardoor bleef een echte fout onzichtbaar: bij
// een lijst die over weekenden heen loopt schoven zaterdag en zondag allebei
// naar dezelfde maandag, met drie dagen aan berichten op één dag.
const telPerDag = new Map<string, number>();
for (const d of heleLijst) telPerDag.set(dagVan(d), (telPerDag.get(dagVan(d)) ?? 0) + 1);
const drukste = Math.max(...telPerDag.values());
meld(drukste <= 10, "ook over weekenden heen blijft het maximum staan", `drukste dag: ${drukste}`);
meld(dagen.size === 14, "137 stuks bij 10 per dag = veertien werkdagen", `${dagen.size} dagen`);
meld(
  heleLijst.every((d) => d.getDay() !== 0 && d.getDay() !== 6),
  "ook in de lange lijst geen weekenddagen",
);
meld(
  heleLijst[heleLijst.length - 1]!.getTime() - Date.now() < 30 * 24 * 3600 * 1000,
  "het laatste bericht valt binnen de grens van 30 dagen",
);

// ---------------------------------------------------------------------------
// Opvolging
// ---------------------------------------------------------------------------

console.log("\nOpvolgmoment");

const dinsdag = new Date();
dinsdag.setDate(dinsdag.getDate() + 3);
while (dinsdag.getDay() !== 2) dinsdag.setDate(dinsdag.getDate() + 1);
dinsdag.setHours(11, 0, 0, 0);

const na7 = opvolgmoment(dinsdag, 7);
meld(na7.getDay() === 2, "zeven dagen na dinsdag is weer een dinsdag", String(na7.getDay()));
meld(na7.getHours() === 9 && na7.getMinutes() === 30, "in de ochtend", `${na7.getHours()}:${na7.getMinutes()}`);

// Woensdag + 3 dagen is zaterdag; dat moet naar maandag schuiven.
const woensdag = new Date(dinsdag);
woensdag.setDate(woensdag.getDate() + 1);
const naWeekend = opvolgmoment(woensdag, 3);
meld(
  naWeekend.getDay() !== 0 && naWeekend.getDay() !== 6,
  "een opvolging in het weekend schuift naar een werkdag",
  `dag ${naWeekend.getDay()}`,
);

// Een campagne die al maanden loopt mag niet in het verleden inplannen.
const langGeleden = new Date(Date.now() - 90 * 24 * 3600 * 1000);
meld(
  opvolgmoment(langGeleden, 7).getTime() > Date.now(),
  "een moment in het verleden wordt naar voren gehaald",
);

console.log("\n" + "=".repeat(52));
if (gezakt === 0) console.log("Alles in orde.\n");
else { console.log(`${gezakt} controle(s) gezakt.\n`); process.exit(1); }
