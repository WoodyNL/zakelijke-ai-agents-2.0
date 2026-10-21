#!/usr/bin/env node
/**
 * Test op het lezen van de proefpakketwens.
 *
 * Dit bepaalt of er een vrijdag wordt vastgelegd en of er een chauffeur naar
 * een adres rijdt. De regel die hier bewaakt wordt: er wordt nooit ingepland
 * op een adres dat de klant niet zelf heeft bevestigd, ook niet als het adres
 * al in de lijst staat.
 *
 *   node scripts/test-proefpakket.ts
 */

import { beoordeelWens, type Omstandigheden } from "../src/lib/proefpakket-lezen.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const kaal: Omstandigheden = { adresInLijst: null, eerderGeantwoord: false };
const bekend: Omstandigheden = {
  adresInLijst: "Hoofdstraat 12, 2225 AB Katwijk",
  eerderGeantwoord: true,
};

console.log("\nDe eenvoudige standen\n" + "=".repeat(52));

for (const [stand, naam] of [
  ["geen_pakket", "hij wil het niet"],
  ["wil_pakket", "hij wil het wel, adres nog niet rond"],
  ["onduidelijk", "onduidelijk"],
] as const) {
  meld(
    beoordeelWens(JSON.stringify({ stand }), "wat tekst", kaal).stand === stand,
    naam,
  );
}

meld(beoordeelWens("geen json", "wat tekst", kaal).stand === "onduidelijk", "kapotte json");
meld(
  beoordeelWens(JSON.stringify({ stand: "verzonnen" }), "x", kaal).stand === "onduidelijk",
  "een stand die niet bestaat",
);
meld(
  beoordeelWens('```json\n{"stand":"wil_pakket"}\n```', "x", kaal).stand === "wil_pakket",
  "json in een codeblok",
);

console.log("\nHij schrijft het adres zelf\n" + "=".repeat(52));

const ZELF = `Ja graag, het adres is Parklaan 8, 2225 CC Katwijk.

Groeten, Wouter`;

const a = beoordeelWens(
  JSON.stringify({
    stand: "bevestigd",
    adres: "Parklaan 8, 2225 CC Katwijk",
    citaat: "het adres is Parklaan 8, 2225 CC Katwijk",
  }),
  ZELF,
  kaal,
);
meld(a.stand === "bevestigd", "wordt bevestigd", JSON.stringify(a));
meld(a.adres === "Parklaan 8, 2225 CC Katwijk", "met het adres uit zijn mail");
meld(a.bron === "zelf_geschreven", "herkomst klopt");

// Een adres dat hij zelf noemt wint van wat er in de lijst staat: hij weet
// beter waar zijn zaak zit dan een lijst van jaren geleden.
const b = beoordeelWens(
  JSON.stringify({
    stand: "bevestigd",
    adres: "Parklaan 8, 2225 CC Katwijk",
    citaat: "het adres is Parklaan 8, 2225 CC Katwijk",
  }),
  ZELF,
  bekend,
);
meld(b.adres === "Parklaan 8, 2225 CC Katwijk", "zijn adres wint van dat uit de lijst");

console.log("\nHet citaat moet er letterlijk in staan\n" + "=".repeat(52));

meld(
  beoordeelWens(
    JSON.stringify({
      stand: "bevestigd",
      adres: "Kerkstraat 1, Katwijk",
      citaat: "stuur maar naar Kerkstraat 1",
    }),
    ZELF,
    kaal,
  ).stand === "onduidelijk",
  "een citaat dat niet in de mail staat → onduidelijk",
);

meld(
  beoordeelWens(
    JSON.stringify({ stand: "bevestigd", adres: "Parklaan 8", citaat: "" }),
    ZELF,
    kaal,
  ).stand === "onduidelijk",
  "bevestigd zonder citaat → onduidelijk",
);

// Een citaat dat over twee regels loopt staat er letterlijk wel in.
const GEBROKEN = "Ja hoor, lever maar op\nParklaan 8 in Katwijk.";
meld(
  beoordeelWens(
    JSON.stringify({
      stand: "bevestigd",
      adres: "Parklaan 8, Katwijk",
      citaat: "lever maar op Parklaan 8 in Katwijk",
    }),
    GEBROKEN,
    kaal,
  ).stand === "bevestigd",
  "een citaat over twee regels telt wel",
);

console.log("\n'Ja dat klopt' op ons eigen adres\n" + "=".repeat(52));

const KLOPT = "Ja hoor, dat klopt nog steeds. Tot vrijdag!";

const c = beoordeelWens(
  JSON.stringify({ stand: "bevestigd", citaat: "dat klopt nog steeds" }),
  KLOPT,
  bekend,
);
meld(c.stand === "bevestigd", "met een adres in de lijst én een eerder antwoord: bevestigd");
meld(c.adres === bekend.adresInLijst, "het adres komt uit de lijst, niet uit het model");
meld(c.bron === "lijst_bevestigd", "herkomst klopt");

/*
 * En nu de twee gevallen die niet mogen doorgaan. Dit is de kern van wat deze
 * module bewaakt: "dat klopt" is alleen een bevestiging als wij iets te
 * bevestigen hebben voorgelegd.
 */
meld(
  beoordeelWens(
    JSON.stringify({ stand: "bevestigd", citaat: "dat klopt nog steeds" }),
    KLOPT,
    { adresInLijst: null, eerderGeantwoord: true },
  ).stand === "wil_pakket",
  "zonder adres in de lijst: geen bevestiging, de agent vraagt ernaar",
);

meld(
  beoordeelWens(
    JSON.stringify({ stand: "bevestigd", citaat: "dat klopt nog steeds" }),
    KLOPT,
    { adresInLijst: "Hoofdstraat 12, Katwijk", eerderGeantwoord: false },
  ).stand === "wil_pakket",
  "zonder dat de agent al iets voorlegde: ook geen bevestiging",
);

console.log("\nHet geval uit de praktijk\n" + "=".repeat(52));

/*
 * Dit is waar het gesprek van 21 oktober op stuklief: iemand zegt "ja graag"
 * en noemt geen adres. Dat mag géén bezorging opleveren — ook al staat er een
 * adres in de lijst van de import, want dat heeft hij nooit bevestigd.
 */
const JA_GRAAG = "Ja, graag! Klinkt goed.";
meld(
  beoordeelWens(JSON.stringify({ stand: "wil_pakket" }), JA_GRAAG, bekend).stand === "wil_pakket",
  '"ja graag" zonder adres plant niets, ook met een adres in de lijst',
);

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
