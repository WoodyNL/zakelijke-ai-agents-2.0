#!/usr/bin/env node
/**
 * Test op het lezen van een antwoord op de bezorgbevestiging.
 *
 * Dit is het enige punt in het platform waar een model iets verandert waar een
 * mens naar handelt: de chauffeur rijdt naar het adres dat hier uit komt. Een
 * verzonnen adres merk je pas op vrijdagochtend, als de bus er staat.
 *
 * De regel die dat tegenhoudt is simpel: bij een ander adres moet er een zin
 * uit de mail bij zitten waar dat adres in staat, letterlijk. Deze test
 * controleert dat die regel niet te omzeilen is.
 *
 *   node scripts/test-bevestiging.ts
 */

import { beoordeelUitkomst, alsDagInTekst } from "../src/lib/bevestiging-lezen.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const MAIL = `Beste Frank,

Dat schikt prima. Wel zijn we sinds juni verhuisd, we zitten nu op de
Boulevard 112 in Katwijk aan Zee.

Groet, Jan`;

console.log("\nAntwoord op de bevestiging lezen\n" + "=".repeat(52));

// --- de gewone gevallen ---------------------------------------------------

meld(
  beoordeelUitkomst('{"stand":"bevestigd"}', "Prima, tot vrijdag.").stand === "bevestigd",
  "een bevestiging komt door",
);

meld(
  beoordeelUitkomst('{"stand":"afgezegd"}', "Laat maar zitten.").stand === "afgezegd",
  "een afzegging komt door",
);

meld(
  beoordeelUitkomst('{"stand":"verzet"}', "Volgende week beter.").stand === "verzet",
  "uitstel komt door",
);

{
  const uit = beoordeelUitkomst(
    JSON.stringify({
      stand: "ander_adres",
      adres: "Boulevard 112, Katwijk aan Zee",
      citaat: "we zitten nu op de Boulevard 112 in Katwijk aan Zee",
    }),
    MAIL,
  );
  meld(uit.stand === "ander_adres", "een adreswijziging met een echt citaat komt door");
  meld(uit.adres === "Boulevard 112, Katwijk aan Zee", "het nieuwe adres blijft intact", uit.adres ?? "");
}

// --- waar het om begonnen is ----------------------------------------------

meld(
  beoordeelUitkomst(
    JSON.stringify({ stand: "ander_adres", adres: "Hoofdstraat 1, Leiden" }),
    MAIL,
  ).stand === "onduidelijk",
  "een adres zónder citaat wordt geweigerd",
);

meld(
  beoordeelUitkomst(
    JSON.stringify({
      stand: "ander_adres",
      adres: "Hoofdstraat 1, Leiden",
      citaat: "we zijn verhuisd naar de Hoofdstraat 1 in Leiden",
    }),
    MAIL,
  ).stand === "onduidelijk",
  "een citaat dat niet in de mail staat wordt geweigerd",
);

meld(
  beoordeelUitkomst(
    JSON.stringify({ stand: "ander_adres", adres: "", citaat: "Dat schikt prima." }),
    MAIL,
  ).stand === "onduidelijk",
  "een leeg adres wordt geweigerd",
);

meld(
  beoordeelUitkomst(
    JSON.stringify({
      stand: "ander_adres",
      adres: "Boulevard 112, Katwijk aan Zee",
      citaat: "   ",
    }),
    MAIL,
  ).stand === "onduidelijk",
  "een citaat van alleen spaties wordt geweigerd",
);

// Een citaat dat in de mail over twee regels loopt, staat er letterlijk wel in.
// Zonder normalisatie zou elke correctie in een lange zin stuklopen.
meld(
  beoordeelUitkomst(
    JSON.stringify({
      stand: "ander_adres",
      adres: "Boulevard 112, Katwijk aan Zee",
      citaat: "Wel zijn we sinds juni verhuisd, we zitten nu op de Boulevard 112 in Katwijk aan Zee.",
    }),
    MAIL,
  ).stand === "ander_adres",
  "een citaat dat over twee regels loopt wordt herkend",
);

// --- rommel van het model -------------------------------------------------

meld(beoordeelUitkomst("", MAIL).stand === "onduidelijk", "een leeg antwoord wordt onduidelijk");
meld(
  beoordeelUitkomst("sorry, dat kan ik niet", MAIL).stand === "onduidelijk",
  "proza in plaats van JSON wordt onduidelijk",
);
meld(
  beoordeelUitkomst('```json\n{"stand":"bevestigd"}\n```', MAIL).stand === "bevestigd",
  "JSON in een codeblok wordt alsnog gelezen",
);
meld(
  beoordeelUitkomst('{"stand":"misschien"}', MAIL).stand === "onduidelijk",
  "een verzonnen uitkomst wordt geweigerd",
);
meld(
  beoordeelUitkomst('{"stand":"BEVESTIGD"}', MAIL).stand === "onduidelijk",
  "een andere schrijfwijze telt niet als geldige uitkomst",
);

// --- de datum in de mail --------------------------------------------------

console.log("\nDe dag zoals een mens hem leest\n" + "=".repeat(52));

meld(alsDagInTekst("2026-09-25") === "vrijdag 25 september", "vrijdag 25 september", alsDagInTekst("2026-09-25"));
meld(alsDagInTekst("2026-01-02") === "vrijdag 2 januari", "geen voorloopnul", alsDagInTekst("2026-01-02"));
meld(alsDagInTekst("2026-12-25") === "vrijdag 25 december", "december klopt", alsDagInTekst("2026-12-25"));

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
