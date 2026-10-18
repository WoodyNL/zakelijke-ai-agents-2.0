#!/usr/bin/env node
/**
 * Test dat de optiecatalogus klopt met de agentsoorten.
 *
 * Twee keer eerder ging dit mis zonder foutmelding. Op 14 oktober 2026 stonden
 * "gesprekken bewaren" en de bewaartermijn twee keer in de catalogus, met
 * verschillende uitleg: de klant had twee identieke schakelaars gezien. En een
 * optie met een standaardwaarde buiten zijn eigen min/max slaat een formulier
 * stilletjes op als iets anders dan er staat.
 *
 * Komt er een soort of een knop bij, dan zakt deze test in plaats van dat er
 * ergens een dubbele knop verschijnt.
 *
 *   node scripts/test-catalogus.ts
 */

import { ALLE_SCHERMEN, SOORTEN, type AgentSoort } from "../src/lib/agent-soorten.ts";
import { GROEPEN, optiesVoor, optiesVoorWie } from "../src/lib/agent-opties.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const soorten = Object.keys(SOORTEN) as AgentSoort[];
const groepen = new Set(GROEPEN.map((g) => g.sleutel));

console.log("\nElke soort heeft een complete beschrijving\n" + "=".repeat(52));
for (const k of soorten) {
  const s = SOORTEN[k];
  meld(!!s.label && !!s.uitleg, `${k}: label en uitleg`);
  meld(!!s.labels.metric && !!s.labels.score, `${k}: namen voor de kerncijfers`);
  meld(
    [...s.schermen, ...s.optioneel].every((x) => ALLE_SCHERMEN.includes(x)),
    `${k}: alle schermen bestaan`,
  );
  meld(s.bronnen.length > 0, `${k}: minstens één bron voor het dashboard`);
  // Een soort zonder eigen schermen en zonder meting toont de klant niets.
  // Dan hoort er te staan wat eraan komt. Behalve bij maatwerk: daar zijn de
  // handmatige dagcijfers juist de afspraak, niet een tussenstand.
  const alleenMetingen = s.bronnen.length === 1 && s.bronnen[0] === "metingen";
  if (k !== "overig") {
    meld(
      !(s.schermen.length === 0 && alleenMetingen) || s.binnenkort.length > 0,
      `${k}: zegt wat eraan komt als er nog niets te zien is`,
    );
  }
}

console.log("\nDe knoppen per soort\n" + "=".repeat(52));
for (const k of soorten) {
  const opties = optiesVoor(k);
  const sleutels = opties.map((o) => o.sleutel);
  const dubbel = [...new Set(sleutels.filter((x, i) => sleutels.indexOf(x) !== i))];
  meld(dubbel.length === 0, `${k}: geen dubbele sleutels`, dubbel.join(", "));

  for (const o of opties) {
    const naam = `${k}/${o.sleutel}`;
    if (!o.label || !o.uitleg) meld(false, `${naam}: label en uitleg`);
    if (!groepen.has(o.groep)) meld(false, `${naam}: groep "${o.groep}" bestaat niet`);
    if (o.type === "keuze") {
      const waarden = (o.keuzes ?? []).map((c) => c.waarde);
      if (waarden.length < 2) meld(false, `${naam}: een keuze heeft minstens twee opties`);
      if (o.standaard !== undefined && !waarden.includes(String(o.standaard))) {
        meld(false, `${naam}: standaard "${String(o.standaard)}" zit niet bij de keuzes`);
      }
    }
    if (o.type === "getal" && typeof o.standaard === "number") {
      const binnen =
        (o.min === undefined || o.standaard >= o.min) &&
        (o.max === undefined || o.standaard <= o.max);
      if (!binnen) meld(false, `${naam}: standaard ${o.standaard} valt buiten ${o.min}–${o.max}`);
    }
    if (o.type === "schakelaar" && o.standaard !== undefined && typeof o.standaard !== "boolean") {
      meld(false, `${naam}: een schakelaar heeft een ja/nee-standaard`);
    }
    if (o.type === "lijst" && o.standaard !== undefined && !Array.isArray(o.standaard)) {
      meld(false, `${naam}: een lijst heeft een lijst als standaard`);
    }
    if (o.bron.soort === "elders" && !o.bron.scherm.startsWith("/")) {
      meld(false, `${naam}: "elders" wijst naar een pad`);
    }
  }
  meld(true, `${k}: ${opties.length} knoppen, allemaal in orde`);
}

console.log("\nWie wat mag zetten\n" + "=".repeat(52));
for (const k of soorten) {
  const alles = optiesVoor(k).length;
  const klant = optiesVoorWie(k, "klant").length;
  meld(klant < alles, `${k}: de klant ziet minder dan de beheerder`, `${klant} van ${alles}`);
}

console.log("\nDe heractivatie-agent erft de remmen van de e-mailagent\n" + "=".repeat(52));
const post = new Set(optiesVoor("uitgaande_email").map((o) => o.sleutel));
const her = new Set(optiesVoor("heractivatie").map((o) => o.sleutel));
for (const rem of ["bounce_drempel", "stop_bij_klacht", "verzendvenster"]) {
  meld(post.has(rem) && her.has(rem), `${rem} staat bij allebei`);
}
meld(her.has("slapend_na_maanden"), "en heeft zijn eigen filter op slapende klanten");

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
