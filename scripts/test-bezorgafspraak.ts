#!/usr/bin/env node
/**
 * Test op de opdracht die de agent krijgt rond een bezorgafspraak.
 *
 * Er wordt geen model aangeroepen: dit leest de prompt zelf. Dat is de plek
 * waar de garantie hoort te zitten — wat niet in de prompt staat, kan het
 * model niet opschrijven.
 *
 * De regel die hier bewaakt wordt: zolang het adres niet door de klant is
 * bevestigd, mag er geen dag worden genoemd. Een vrijdag toezeggen die
 * nergens is vastgelegd, is een belofte die niemand nakomt — en dat is
 * precies waar het gesprek van 21 oktober op strandde.
 *
 *   node scripts/test-bezorgafspraak.ts
 */

import { systeemprompt, type Opdracht } from "../src/lib/bericht-opstellen.server.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const basis = (extra: Partial<Opdracht> = {}): Opdracht => ({
  contact: { naam: "Wouter", plaats: "Katwijk", herkomst: "test" },
  kennis: [{ category: "Product", title: "Proefpakket", content: "Vier stokjes kipsaté." }],
  bedrijfsnaam: "FJ Snacks",
  ondertekening: "Frank Ransijn, FJ Snacks",
  aanbod: "een gratis proefpakket kipsaté",
  soort: "antwoord",
  gesprek: { binnen: "Ja graag!", eerder: [] },
  ...extra,
});

/** Noemt de prompt ergens een dag of datum als toezegging? */
const noemtEenDag = (p: string) =>
  /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)/i.test(
    p,
  );

console.log("\nDe bezorging staat vast\n" + "=".repeat(52));

const gepland = systeemprompt(
  basis({ bezorging: { dag: "vrijdag 23 oktober", adres: "Parklaan 8, 2225 CC Katwijk" } }),
);

meld(gepland.includes("De bezorging staat vast"), "het blok staat erin");
meld(gepland.includes("de chauffeur komt vrijdag 23 oktober"), "met de dag erin");
meld(gepland.includes("Parklaan 8, 2225 CC Katwijk"), "en het adres voluit");
meld(
  gepland.includes("Vraag niet nog een keer of het klopt"),
  "en de opdracht om niet opnieuw te vragen",
);
meld(
  !gepland.includes("vraag dan of je dat voor hem zult inplannen"),
  "de standaardvraag om in te plannen vervalt",
);

// Een bezorging zonder adres in de rij mag geen lege zin opleveren.
const geenAdres = systeemprompt(basis({ bezorging: { dag: "vrijdag 23 oktober", adres: null } }));
meld(geenAdres.includes("de chauffeur komt vrijdag 23 oktober"), "ook zonder adres: de dag staat er");
meld(!geenAdres.includes("hij komt naar:"), "en geen lege adreszin");

console.log("\nHet adres moet nog bevestigd worden\n" + "=".repeat(52));

const metAdres = systeemprompt(
  basis({ adresvraag: { bekendAdres: "Hoofdstraat 12, 2225 AB Katwijk" } }),
);

meld(metAdres.includes("je mist het bezorgadres"), "het blok staat erin");
meld(metAdres.includes("Hoofdstraat 12, 2225 AB Katwijk"), "met het bekende adres erin");
meld(metAdres.includes("of het nog klopt"), "en de opdracht om het voor te leggen");

/*
 * Dit is de belangrijkste test van dit bestand. Het adres staat wel in de
 * lijst, maar de klant heeft het niet bevestigd. Dan mag er geen datum uit
 * komen — niet in het blok, en ook niet via de standaardregel die anders zegt
 * dat de agent mag aanbieden in te plannen.
 */
meld(!noemtEenDag(metAdres), "er staat nergens een datum in de opdracht");
meld(
  metAdres.includes("Noem geen dag en geen datum"),
  "en het verbod staat er met zoveel woorden",
);
meld(
  !metAdres.includes("vraag dan of je dat voor hem zult inplannen"),
  "ook hier vervalt de standaardvraag",
);
meld(
  metAdres.includes('niet bij dat het "in ons systeem"'),
  "en hij verraadt onze administratie niet",
);

const zonderAdres = systeemprompt(basis({ adresvraag: { bekendAdres: null } }));
meld(
  zonderAdres.includes("Vraag waar het pakket bezorgd moet worden"),
  "zonder adres in de lijst vraagt hij er gewoon naar",
);
meld(!noemtEenDag(zonderAdres), "ook dan geen datum");

console.log("\nEen gewoon antwoord, zonder afspraak\n" + "=".repeat(52));

const gewoon = systeemprompt(basis());
meld(
  gewoon.includes("vraag dan of je dat voor hem zult inplannen"),
  "de standaardvraag staat er wél",
);
meld(!gewoon.includes("De bezorging staat vast"), "geen bezorgblok");
meld(!gewoon.includes("je mist het bezorgadres"), "geen adresblok");

console.log("\nDe bevestigingsronde van woensdag blijft heel\n" + "=".repeat(52));

const woensdag = systeemprompt({
  ...basis({ soort: "bevestiging" }),
  gesprek: undefined,
  bezorging: { dag: "vrijdag 23 oktober", adres: "Hoofdstraat 12, Katwijk" },
});
meld(woensdag.includes("vrijdag 23 oktober"), "die noemt de dag nog steeds");
meld(
  !woensdag.includes("De bezorging staat vast"),
  "en gebruikt niet het blok van het antwoord",
);

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
