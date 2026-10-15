#!/usr/bin/env node
/**
 * Test op het verzendvenster: wanneer een bericht mag vertrekken.
 *
 * Dit is de rem op uitgaande post, en hij liep tot nu toe zonder test. Twee
 * dingen kunnen hier stukgaan en ze zijn beide niet terug te draaien.
 *
 * De klok. Deze code draait op Cloudflare, waar de machine op UTC staat. Een
 * klant die "tot vijf uur" instelt en in juli tot zeven uur 's avonds post
 * verstuurt, merkt dat aan zijn ontvangers en niet aan een foutmelding. Daarom
 * staan hier vaste momenten in met de Nederlandse wandklok die erbij hoort,
 * zomer én winter.
 *
 * En de terugval. Een vertypte instelling mag geen campagne midden in de nacht
 * laten vertrekken. Bij onzin hoort het standaardvenster eruit te komen, niet
 * iets wat er half op lijkt.
 *
 *   node scripts/test-verzendvenster.ts
 */

import {
  STANDAARD_VENSTER,
  binnenVenster,
  delen,
  leesVenster,
  verdeelInVenster,
} from "../src/lib/verzendvenster.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

// ---------------------------------------------------------------------------
console.log("\nDe Nederlandse wandklok\n" + "=".repeat(52));

{
  // 12:00 UTC in januari is 13:00 bij ons (CET, +1).
  const w = delen(new Date("2026-01-15T12:00:00Z"));
  meld(w.minuten === 13 * 60, "winter: 12:00 UTC is 13:00 hier", `${w.minuten / 60}u`);
  meld(w.weekdag === 4, "en het is een donderdag", String(w.weekdag));
}
{
  // Dezelfde klokstand in juli is 14:00 (CEST, +2). Dit is het verschil waar
  // een venster van 9 tot 17 twee uur te ruim van wordt.
  const z = delen(new Date("2026-07-01T12:00:00Z"));
  meld(z.minuten === 14 * 60, "zomer: 12:00 UTC is 14:00 hier", `${z.minuten / 60}u`);
}
{
  // De nacht waarin de klok vooruit gaat: 00:30 UTC is 01:30, nog net CET.
  const k = delen(new Date("2026-03-29T00:30:00Z"));
  meld(k.minuten === 90, "de overgangsnacht in maart klopt", `${k.minuten}m`);
}
{
  // En terug: 00:30 UTC op 25 oktober is 02:30, nog CEST.
  const k = delen(new Date("2026-10-25T00:30:00Z"));
  meld(k.minuten === 150, "de overgangsnacht in oktober klopt", `${k.minuten}m`);
}

// ---------------------------------------------------------------------------
console.log("\nDe instelling lezen\n" + "=".repeat(52));

const g = (ruw: unknown) => JSON.stringify(leesVenster(ruw));
const standaard = JSON.stringify(STANDAARD_VENSTER);

meld(g("09:00-17:00") === JSON.stringify({ begin: 540, eind: 1020 }), "09:00-17:00");
meld(g("8:30 – 18:00") === JSON.stringify({ begin: 510, eind: 1080 }), "halve uren en een lang streepje");
meld(g("9.00-17.30") === JSON.stringify({ begin: 540, eind: 1050 }), "met punten");

// Alles hieronder hoort op het standaardvenster uit te komen. Een instelling
// die half wordt begrepen is gevaarlijker dan een die wordt genegeerd.
meld(g("") === standaard, "leeg valt terug");
meld(g(null) === standaard, "niets valt terug");
meld(g(42) === standaard, "een getal valt terug");
meld(g("de hele dag") === standaard, "proza valt terug");
meld(g("09:00") === standaard, "één tijd valt terug");
meld(g("17:00-09:00") === standaard, "omgekeerd valt terug");
meld(g("09:00-09:10") === standaard, "een venster van tien minuten valt terug");
meld(g("09:00-25:00") === standaard, "een uur dat niet bestaat valt terug");

// ---------------------------------------------------------------------------
console.log("\nNaar binnen het venster schuiven\n" + "=".repeat(52));

const V = STANDAARD_VENSTER;
// Een vast "nu" ver in het verleden, zodat de regel "nooit in het verleden"
// deze gevallen niet overneemt.
const NU = new Date("2026-10-01T06:00:00Z");

const check = (iso: string, naam: string) => {
  const uit = binnenVenster(new Date(iso), V, NU);
  const w = delen(uit);
  const goed = w.weekdag >= 1 && w.weekdag <= 5 && w.minuten >= V.begin && w.minuten < V.eind;
  meld(goed, naam, `${["zo", "ma", "di", "wo", "do", "vr", "za"][w.weekdag]} ${Math.floor(w.minuten / 60)}:${String(w.minuten % 60).padStart(2, "0")}`);
};

check("2026-10-16T07:00:00Z", "vrijdag 09:00 blijft staan");
check("2026-10-16T04:00:00Z", "vrijdag 06:00 schuift naar de opening");
check("2026-10-16T19:00:00Z", "vrijdagavond schuift naar maandag");
check("2026-10-17T07:00:00Z", "zaterdag schuift naar een werkdag");
check("2026-10-18T07:00:00Z", "zondag schuift naar een werkdag");
check("2026-10-16T02:00:00Z", "midden in de nacht schuift naar de opening");

{
  // Dit is de regel die een stille uitval voorkomt: Resend weigert een moment
  // in het verleden, en dan valt een opvolging zonder melding weg.
  const nu = new Date();
  const uit = binnenVenster(new Date("2020-01-01T10:00:00Z"), V, nu);
  meld(uit.getTime() > nu.getTime(), "een moment uit 2020 komt in de toekomst terecht");
}

// ---------------------------------------------------------------------------
console.log("\nVerdelen binnen het venster\n" + "=".repeat(52));

{
  const momenten = verdeelInVenster(137, 10, new Date("2026-10-19T07:00:00Z"), V, NU);
  meld(momenten.length === 137, "honderdzevenendertig momenten", String(momenten.length));

  const buiten = momenten.filter((m) => {
    const w = delen(m);
    return w.weekdag === 0 || w.weekdag === 6 || w.minuten < V.begin || w.minuten >= V.eind;
  });
  meld(buiten.length === 0, "geen enkel moment buiten het venster", `${buiten.length} fout`);

  const perDag = new Map<string, number>();
  for (const m of momenten) {
    const w = delen(m);
    const k = `${w.jaar}-${w.maand}-${w.dag}`;
    perDag.set(k, (perDag.get(k) ?? 0) + 1);
  }
  const teveel = [...perDag.entries()].filter(([, n]) => n > 10);
  meld(teveel.length === 0, "nooit meer dan tien op een dag", teveel.map(([d, n]) => `${d}:${n}`).join(" "));

  const dubbel = new Set(momenten.map((m) => m.getTime())).size !== momenten.length;
  meld(!dubbel, "geen twee berichten op precies hetzelfde tijdstip");

  const oplopend = momenten.every((m, i) => i === 0 || m.getTime() >= momenten[i - 1]!.getTime());
  meld(oplopend, "de momenten lopen op");
}

{
  // Een smal venster mag de rem niet omzeilen: tien per dag in een uur hoort
  // nog steeds tien per dag te zijn.
  const smal = { begin: 9 * 60, eind: 10 * 60 };
  const momenten = verdeelInVenster(25, 10, new Date("2026-10-19T07:00:00Z"), smal, NU);
  const buiten = momenten.filter((m) => {
    const w = delen(m);
    return w.minuten < smal.begin || w.minuten >= smal.eind;
  });
  meld(momenten.length === 25, "een smal venster levert alle berichten", String(momenten.length));
  meld(buiten.length === 0, "en houdt ze binnen het uur", `${buiten.length} fout`);
}

{
  const een = verdeelInVenster(1, 10, new Date("2026-10-19T07:00:00Z"), V, NU);
  meld(een.length === 1, "één bericht levert één moment");
  const geen = verdeelInVenster(0, 10, new Date("2026-10-19T07:00:00Z"), V, NU);
  meld(geen.length === 0, "nul berichten levert niets");
}

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
