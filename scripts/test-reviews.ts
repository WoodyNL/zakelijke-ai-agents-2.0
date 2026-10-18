#!/usr/bin/env node
/**
 * Test de regels van de review-agent: wanneer vragen, nooit na een klacht, en
 * het gemiddelde dat telt (negentig dagen).
 *
 *   node scripts/test-reviews.ts
 */
import {
  gemiddeldeRecent,
  magAutomatischAntwoorden,
  magVragen,
  verzoekTekst,
} from "../src/lib/reviews.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const vandaag = "2026-10-18";
const v = {
  email: "a@x.nl",
  naam: "Piet",
  klaar_op: "2026-10-16",
  klacht: false,
  status: "gepland",
};

console.log("\nWanneer vragen\n" + "=".repeat(52));
meld(
  magVragen(v, { naDagen: 1, nietNaKlacht: true }, vandaag),
  "twee dagen na de klus, één dag ingesteld: vragen",
);
meld(!magVragen(v, { naDagen: 3, nietNaKlacht: true }, vandaag), "drie dagen ingesteld: nog niet");
meld(
  !magVragen({ ...v, klacht: true }, { naDagen: 1, nietNaKlacht: true }, vandaag),
  "na een klacht: niet",
);
meld(
  magVragen({ ...v, klacht: true }, { naDagen: 1, nietNaKlacht: false }, vandaag),
  "tenzij de klant dat uitzette",
);
meld(
  !magVragen({ ...v, status: "verstuurd" }, { naDagen: 1, nietNaKlacht: true }, vandaag),
  "al verstuurd: niet nog eens",
);
meld(
  !magVragen({ ...v, klaar_op: "2026-08-01" }, { naDagen: 1, nietNaKlacht: true }, vandaag),
  "een klus van twee maanden geleden: te laat om te vragen",
);
meld(
  magVragen(v, { naDagen: "onzin", nietNaKlacht: true }, vandaag),
  "onzin als instelling valt terug op één dag",
);

console.log("\nHet verzoek\n" + "=".repeat(52));
const t = verzoekTekst({
  naam: "Piet",
  bedrijfsnaam: "FJ Snacks",
  link: "https://g.page/r/abc/review",
  ondertekening: "Groet, Frank",
});
meld(
  t.tekst.includes("https://g.page/r/abc/review") && t.tekst.startsWith("Beste Piet,"),
  "met link en aanhef",
);
meld(
  t.tekst.includes("ook als er iets beter kon"),
  "iedereen dezelfde vraag, ook wie ontevreden is",
);

console.log("\nHet gemiddelde dat telt\n" + "=".repeat(52));
const rs = [
  { sterren: 5, geplaatst_op: "2026-10-01" },
  { sterren: 2, geplaatst_op: "2026-09-01" },
  { sterren: 1, geplaatst_op: "2026-01-01" },
];
meld(
  gemiddeldeRecent(rs, 90, vandaag) === 3.5,
  "oude review telt niet mee",
  String(gemiddeldeRecent(rs, 90, vandaag)),
);
meld(gemiddeldeRecent([], 90, vandaag) === null, "zonder reviews geen gemiddelde");

console.log("\nAutomatisch antwoorden\n" + "=".repeat(52));
meld(magAutomatischAntwoorden(5, "automatisch_positief"), "vijf sterren, ingesteld: mag");
meld(!magAutomatischAntwoorden(4, "automatisch_positief"), "vier sterren: altijd een concept");
meld(!magAutomatischAntwoorden(5, "concept"), "niet ingesteld: concept");

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
