#!/usr/bin/env node
/**
 * Test dat elke groep een naam heeft op het scherm.
 *
 * Dit lijkt triviaal en is het niet. Toen er een derde groep bijkwam, stond er
 * op drie schermen "oud-klant, of anders koud". Een testcampagne werd daardoor
 * in de campagnelijst getoond als "koud" — zonder foutmelding, zonder lege
 * plek, gewoon het verkeerde woord. En dat is precies het etiket waarop je
 * besluit of er post naar tweehonderd echte zaken mag.
 *
 * Komt er ooit een vierde groep bij, dan zakt deze test in plaats van dat er
 * ergens stilzwijgend "koud" verschijnt.
 *
 *   node scripts/test-herkomst.ts
 */

import {
  HERKOMSTEN,
  HERKOMST_ENKEL,
  HERKOMST_LABEL,
  herkomstNaam,
} from "../src/lib/herkomst.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nElke groep heeft een naam\n" + "=".repeat(52));

for (const h of HERKOMSTEN) {
  meld(
    typeof HERKOMST_LABEL[h] === "string" && HERKOMST_LABEL[h].length > 0,
    `meervoud voor "${h}"`,
    HERKOMST_LABEL[h],
  );
  meld(
    typeof HERKOMST_ENKEL[h] === "string" && HERKOMST_ENKEL[h].length > 0,
    `enkelvoud voor "${h}"`,
    HERKOMST_ENKEL[h],
  );
}

// De drie namen moeten van elkaar te onderscheiden zijn. Twee groepen met
// hetzelfde woord erop is net zo misleidend als een ontbrekend woord.
meld(
  new Set(Object.values(HERKOMST_LABEL)).size === HERKOMSTEN.length,
  "geen twee groepen met dezelfde naam",
  Object.values(HERKOMST_LABEL).join(" · "),
);

// Dit is het geval dat misging: een testcampagne mag nooit "koud" heten.
meld(
  herkomstNaam("test") !== HERKOMST_LABEL.koud &&
    herkomstNaam("test", true) !== HERKOMST_ENKEL.koud,
  "een testadres heet nergens koud",
  `${herkomstNaam("test")} / ${herkomstNaam("test", true)}`,
);

// Een onbekende waarde uit de database valt niet stilzwijgend op "koud".
meld(herkomstNaam("ietsnieuws") === "ietsnieuws", "onbekend blijft zichtbaar als onbekend");

console.log("\n" + "=".repeat(52));
if (gezakt > 0) { console.log(`${gezakt} test(s) mislukt.\n`); process.exit(1); }
console.log("Alles in orde.\n");
