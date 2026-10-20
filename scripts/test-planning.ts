#!/usr/bin/env node
/**
 * Test op het verdelen van berichten over dagen.
 *
 * Dit is de rem op het verzendtempo. Gaat hij stuk, dan vertrekt er in één keer
 * een hele lijst — en dat is niet terug te draaien: het verzenddomein is dan
 * beschadigd en dat herstelt traag.
 *
 * Alles wordt hier met de Nederlandse wandklok gemeten, net als in de code
 * zelf. Dat is geen netheid: deze test stond eerder met getHours() en getDay(),
 * en die lezen de klok van de machine. Op een laptop in Amsterdam vallen die
 * samen met Nederlandse tijd en stond alles op groen, terwijl dezelfde test op
 * een server in UTC zakte. Een test die alleen slaagt waar hij geschreven is,
 * controleert juist niet waar deze module voor bestaat.
 *
 * De ingangen worden om dezelfde reden in UTC opgebouwd: setUTCHours doet
 * overal hetzelfde, setHours niet.
 *
 *   node scripts/test-planning.ts
 *   TZ=UTC node scripts/test-planning.ts
 */

import { delen, opvolgmoment, verdeelOverDagen } from "../src/lib/verzendvenster.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nVerzending verdelen over dagen\n" + "=".repeat(52));

/** De Nederlandse weekdag: 0 = zondag, 6 = zaterdag. */
const weekdag = (d: Date) => delen(d).weekdag;
/** De Nederlandse kalenderdag, als sleutel om per dag te tellen. */
const dagVan = (d: Date) => {
  const w = delen(d);
  return `${w.jaar}-${w.maand}-${w.dag}`;
};
const klok = (d: Date) => {
  const { minuten } = delen(d);
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, "0")}`;
};

// Een maandag ver genoeg in de toekomst, zodat "niet in het verleden" niet
// meespeelt. 08:00 UTC valt zowel in de winter (09:00) als in de zomer (10:00)
// binnen het venster van 9 tot 17, dus deze ingang is het hele jaar geldig.
const maandag = new Date();
maandag.setUTCDate(maandag.getUTCDate() + 7);
maandag.setUTCHours(8, 0, 0, 0);
while (weekdag(maandag) !== 1) maandag.setUTCDate(maandag.getUTCDate() + 1);

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
  tien.every((d) => weekdag(d) !== 0 && weekdag(d) !== 6),
  "er wordt niet in het weekend verstuurd",
);

// Negen tot vijf in Nederlandse tijd, want dat is wat de klant instelt en wat
// zijn ontvangers zien. Dit is de controle die op UTC zakte.
const buitenUren = tien.filter((d) => {
  const { minuten } = delen(d);
  return minuten < 9 * 60 || minuten >= 17 * 60;
});
meld(
  buitenUren.length === 0,
  "alles valt binnen kantooruren, Nederlandse tijd",
  buitenUren.map(klok).join(" "),
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

// De hele lijst van FJ Snacks op tien per dag, vanaf nu.
//
// Met opzet vanaf nu en niet vanaf die maandag hierboven. De grens van dertig
// dagen is die van Resend en telt vanaf het moment van inplannen; een aanloop
// van een week in de ingang gaat dus van dat budget af en heeft niets met de
// code te maken. Deze test zakte daardoor op 20 oktober 2026 zonder dat er
// iets was veranderd — en een test die afhangt van de dag waarop je hem draait,
// wordt genegeerd.
const heleLijst = verdeelOverDagen(137, 10, new Date());
const dagen = new Set(heleLijst.map(dagVan));

// Deze controle miste eerst, en daardoor bleef een echte fout onzichtbaar: bij
// een lijst die over weekenden heen loopt schoven zaterdag en zondag allebei
// naar dezelfde maandag, met drie dagen aan berichten op één dag.
const telPerDag = new Map<string, number>();
for (const d of heleLijst) telPerDag.set(dagVan(d), (telPerDag.get(dagVan(d)) ?? 0) + 1);
const drukste = Math.max(...telPerDag.values());
meld(drukste <= 10, "ook over weekenden heen blijft het maximum staan", `drukste dag: ${drukste}`);
// Veertien werkdagen bij een start op de opening, vijftien bij een start
// halverwege de dag: dan passen er vandaag geen tien meer vóór sluitingstijd
// en schuift de rest door. Allebei goed; wat telt is dat geen dag boven het
// maximum komt, en dat staat in de controle hierboven.
meld(
  dagen.size === 14 || dagen.size === 15,
  "137 stuks bij 10 per dag = veertien of vijftien werkdagen",
  `${dagen.size} dagen`,
);
meld(
  heleLijst.every((d) => weekdag(d) !== 0 && weekdag(d) !== 6),
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
dinsdag.setUTCDate(dinsdag.getUTCDate() + 3);
dinsdag.setUTCHours(9, 0, 0, 0);
while (weekdag(dinsdag) !== 2) dinsdag.setUTCDate(dinsdag.getUTCDate() + 1);

const na7 = opvolgmoment(dinsdag, 7);
meld(weekdag(na7) === 2, "zeven dagen na dinsdag is weer een dinsdag", String(weekdag(na7)));
meld(delen(na7).minuten === 9 * 60 + 30, "een half uur na de opening", klok(na7));

// Woensdag + 3 dagen is zaterdag; dat moet naar maandag schuiven.
const woensdag = new Date(dinsdag);
woensdag.setUTCDate(woensdag.getUTCDate() + 1);
const naWeekend = opvolgmoment(woensdag, 3);
meld(
  weekdag(naWeekend) !== 0 && weekdag(naWeekend) !== 6,
  "een opvolging in het weekend schuift naar een werkdag",
  `dag ${weekdag(naWeekend)}`,
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
