#!/usr/bin/env node
/**
 * Test op de vraag of de agent mag antwoorden.
 *
 * Dit is de gevaarlijkste functie in het platform. Niet omdat een antwoord
 * fout kan zijn, maar omdat e-mail terugpraat: antwoordt de agent op een
 * afwezigheidsassistent, dan antwoordt die weer, en dan hebben twee machines
 * een gesprek dat niemand stopt. Dat kost een verzenddomein.
 *
 *   node scripts/test-antwoordregels.ts
 */

import {
  MAX_ANTWOORDEN,
  beoordeelAntwoord,
  isAutomatischBericht,
  vraagtAfmelding,
  zonderCitaat,
  type Binnenkomend,
} from "../src/lib/antwoordregels.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const basis = (o: Partial<Binnenkomend> = {}): Binnenkomend => ({
  tekst: "Wat zit er precies in het proefpakket?",
  onderwerp: "Re: Proefpakket kipsaté",
  kopregels: {},
  bekendContact: true,
  eerdereAntwoorden: 0,
  ...o,
});

console.log("\nEen machine herkennen\n" + "=".repeat(52));

for (const [naam, k] of [
  ["Auto-Submitted", { "auto-submitted": "auto-replied" }],
  ["X-Autoreply", { "x-autoreply": "yes" }],
  ["Precedence: bulk", { precedence: "bulk" }],
  ["een lijstbericht", { "list-id": "<nieuwsbrief.example.com>" }],
  ["afzender no-reply", { from: "No-Reply <no-reply@example.com>" }],
  ["mailer-daemon", { from: "Mail Delivery <MAILER-DAEMON@example.com>" }],
] as Array<[string, Record<string, string>]>) {
  meld(isAutomatischBericht(basis({ kopregels: k })), `kopregel: ${naam}`);
}

for (const o of [
  "Automatisch antwoord: ik ben afwezig",
  "Automatic reply: Out of Office",
  "Re: Out of office",
  "Afwezigheid tot 3 november",
  "Undeliverable: Proefpakket kipsaté",
]) {
  meld(isAutomatischBericht(basis({ onderwerp: o })), `onderwerp: ${o}`);
}

// En een gewoon antwoord mag niet als machine worden gezien, anders antwoordt
// de agent juist nooit.
for (const o of ["Re: Proefpakket kipsaté", "Vraag over het pakket", "graag!", null]) {
  meld(!isAutomatischBericht(basis({ onderwerp: o })), `is geen machine: ${o ?? "(geen onderwerp)"}`);
}
meld(
  !isAutomatischBericht(basis({ kopregels: { "auto-submitted": "no" } })),
  "Auto-Submitted: no is een mens",
);

console.log("\nAfmelden herkennen\n" + "=".repeat(52));

for (const t of [
  "Graag afmelden voor deze mailing",
  "Wil me uitschrijven",
  "Haal me van de lijst aub",
  "Stop met mailen",
  "Geen post meer graag",
  "Please unsubscribe me",
]) {
  meld(vraagtAfmelding(t), `afmelding: ${t}`);
}
meld(!vraagtAfmelding("Ja graag, stuur maar langs"), "een ja is geen afmelding");
meld(!vraagtAfmelding("Wat zit er in het pakket?"), "een vraag is geen afmelding");

console.log("\nHet oordeel\n" + "=".repeat(52));

meld(beoordeelAntwoord(basis()).doen === "beantwoorden", "een gewone vraag wordt beantwoord");

{
  const u = beoordeelAntwoord(basis({ kopregels: { "auto-submitted": "auto-replied" } }));
  meld(u.doen === "negeren", "een afwezigheidsmelding wordt genegeerd", u.doen);
}
{
  const u = beoordeelAntwoord(basis({ tekst: "Graag afmelden." }));
  meld(u.doen === "mens", "een afmelding gaat naar een mens, niet naar de agent", u.doen);
}
{
  const u = beoordeelAntwoord(basis({ bekendContact: false }));
  meld(u.doen === "mens", "een onbekend adres gaat naar een mens");
}
{
  const u = beoordeelAntwoord(basis({ eerdereAntwoorden: MAX_ANTWOORDEN }));
  meld(u.doen === "mens", `na ${MAX_ANTWOORDEN} beurten neemt een mens het over`);
}
{
  const u = beoordeelAntwoord(basis({ eerdereAntwoorden: MAX_ANTWOORDEN - 1 }));
  meld(u.doen === "beantwoorden", `bij ${MAX_ANTWOORDEN - 1} mag hij nog`);
}
{
  const u = beoordeelAntwoord(basis({ tekst: "  " }));
  meld(u.doen === "mens", "een leeg bericht gaat naar een mens");
}

// De volgorde doet ertoe: een afwezigheidsmelding van een onbekend adres moet
// genegeerd worden en niet als "onbekend adres" bij een mens belanden.
{
  const u = beoordeelAntwoord(
    basis({ bekendContact: false, kopregels: { "auto-submitted": "auto-replied" } }),
  );
  meld(u.doen === "negeren", "machine gaat vóór onbekend adres", u.doen);
}

console.log("\nHet citaat eronder weghalen\n" + "=".repeat(52));

// Precies de mail die Wouter op 20 oktober 2026 stuurde.
const ECHT = `Hi,

Wat zit er precies in het proefpakket?

Ben wel nieuwsgierig.

Met vriendelijke groet,

Wouter

> Op 19 okt 2026 om 12:12 heeft Frank Ransijn, FJ Snacks <verkoop@fjsnacks.nl> het volgende
geschreven:
>
> Beste Wouter,
>
> Mijn naam is Frank Ransijn van FJ Snacks, leverancier van saté voor horecaprofessionals.`;

const schoon = zonderCitaat(ECHT);
meld(schoon.includes("Wat zit er precies in het proefpakket?"), "de vraag blijft staan");
meld(!schoon.includes("Frank Ransijn van FJ Snacks"), "onze eigen mail gaat eruit");
meld(!schoon.includes(">"), "geen citaatregels meer");
meld(schoon.includes("Wouter"), "de ondertekening blijft");

meld(
  zonderCitaat("Ja graag!\n\nOn 19 Oct 2026 at 12:12 Frank wrote:\n> hallo") === "Ja graag!",
  "ook de Engelse variant",
  zonderCitaat("Ja graag!\n\nOn 19 Oct 2026 at 12:12 Frank wrote:\n> hallo"),
);
meld(zonderCitaat("Ja graag!") === "Ja graag!", "een bericht zonder citaat blijft heel");

console.log("\n" + "=".repeat(52));
if (gezakt > 0) { console.log(`${gezakt} test(s) mislukt.\n`); process.exit(1); }
console.log("Alles in orde.\n");
