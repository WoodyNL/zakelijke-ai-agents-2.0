/**
 * De rekenregels van de betaalherinnering-agent: wanneer is welke stap aan de
 * beurt, en wat staat erin.
 *
 * Pure functies. De teksten zijn sjablonen en geen modelwerk, met opzet: een
 * herinnering gaat over een bedrag, een nummer en een datum, en daar hoort
 * niets in te staan dat niet letterlijk uit de factuur komt. De toon verandert
 * per stap — van een attente vooraankondiging naar een zakelijke laatste — maar
 * de agent dreigt nooit zelf. De laatste stap zegt dat de ondernemer persoonlijk
 * contact opneemt; wat er daarna gebeurt, is aan een mens.
 *
 * Te testen met node scripts/test-herinneringen.ts, in twee tijdzones.
 */

import { euroTekst } from "./prijsimport.ts";

export const STANDAARD_MOMENTEN = [-3, 3, 14, 30];

/** Minste dagen tussen twee herinneringen, ook als er meer stappen "over tijd" zijn. */
export const MINSTE_DAGEN_TUSSEN = 3;

/** Leest de reeks uit de instelling: ["-3","3","14","30"] → [-3, 3, 14, 30]. */
export function leesMomenten(ruw: unknown): number[] {
  if (!Array.isArray(ruw)) return STANDAARD_MOMENTEN;
  const n = ruw
    .map((x) => Number(String(x).trim()))
    .filter((x) => Number.isFinite(x) && x >= -30 && x <= 120)
    .map((x) => Math.round(x));
  const uniek = [...new Set(n)].sort((a, b) => a - b);
  return uniek.length > 0 ? uniek : STANDAARD_MOMENTEN;
}

export type FactuurVoorReeks = {
  vervaldatum: string; // "2026-10-01"
  status: string;
  laatste_stap: number;
  laatste_herinnering_op: string | null;
  pauze_tot: string | null;
  betaald_op: string | null;
};

const dag = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
const dagen = (ms: number) => Math.floor(ms / 86_400_000);
export const vandaagIso = (nu = new Date()) => nu.toISOString().slice(0, 10);

/** Hoeveel dagen een factuur over de vervaldatum is; negatief als hij nog niet vervallen is. */
export function dagenTeLaat(vervaldatum: string, vandaag = vandaagIso()): number {
  return dagen(dag(vandaag).getTime() - dag(vervaldatum).getTime());
}

/**
 * Welke stap nu aan de beurt is, of null.
 *
 * Null bij: betaald, gepauzeerd (met een datum in de toekomst), uit handen,
 * alle stappen gehad, het maximum bereikt, de volgende stap nog niet aan de
 * beurt, of te kort na de vorige herinnering. Dat laatste is de rem die
 * voorkomt dat een factuur die laat wordt ingelezen in één keer drie
 * herinneringen krijgt.
 */
export function volgendeStap(
  f: FactuurVoorReeks,
  momenten: number[],
  max: number,
  vandaag = vandaagIso(),
): { stap: number; moment: number } | null {
  if (f.status !== "open" || f.betaald_op) return null;
  if (f.pauze_tot && f.pauze_tot.slice(0, 10) >= vandaag) return null;

  const index = Math.max(0, Math.floor(f.laatste_stap));
  const grens = Math.min(momenten.length, Math.max(1, Math.floor(max)));
  if (index >= grens) return null;

  const moment = momenten[index]!;
  if (dagenTeLaat(f.vervaldatum, vandaag) < moment) return null;

  if (f.laatste_herinnering_op) {
    const sinds = dagen(
      dag(vandaag).getTime() - dag(f.laatste_herinnering_op.slice(0, 10)).getTime(),
    );
    if (sinds < MINSTE_DAGEN_TUSSEN) return null;
  }
  return { stap: index + 1, moment };
}

export type FactuurVoorTekst = {
  nummer: string;
  klant_naam: string | null;
  bedrag: number;
  factuurdatum: string;
  vervaldatum: string;
};

const nlDatum = (iso: string) =>
  dag(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * De tekst per stap. Vier registers: vóór de vervaldatum attent, kort erna
 * vriendelijk, daarna zakelijk, en als laatste de aankondiging dat de
 * ondernemer het overneemt. Welke je krijgt hangt af van het moment en of dit
 * de laatste stap is — niet van een vast stapnummer, want de klant bepaalt
 * zelf hoeveel stappen er zijn.
 */
export function herinneringTekst(o: {
  stap: number;
  totaalStappen: number;
  moment: number;
  factuur: FactuurVoorTekst;
  bedrijfsnaam: string;
  ondertekening: string;
  betaalgegevens?: string | null;
}): { onderwerp: string; tekst: string } {
  const f = o.factuur;
  const aanhef = f.klant_naam ? `Beste ${f.klant_naam},` : "Beste relatie,";
  const kern = `factuur ${f.nummer} van ${nlDatum(f.factuurdatum)} (${euroTekst(f.bedrag)})`;
  const betaal = o.betaalgegevens?.trim() ? `\n\n${o.betaalgegevens.trim()}` : "";
  const slot = `\n\nIs de betaling inmiddels onderweg, dan kun je dit bericht als niet verzonden beschouwen. Klopt er iets niet aan de factuur? Een reactie op deze mail is genoeg.\n\n${o.ondertekening}`;
  const laatste = o.stap >= o.totaalStappen;

  if (o.moment < 0) {
    return {
      onderwerp: `Factuur ${f.nummer} vervalt op ${nlDatum(f.vervaldatum)}`,
      tekst: `${aanhef}\n\nEen korte attentie: ${kern} vervalt op ${nlDatum(f.vervaldatum)}. Zo blijft het overzichtelijk voor ons allebei.${betaal}${slot}`,
    };
  }
  if (laatste) {
    return {
      onderwerp: `Factuur ${f.nummer}: laatste herinnering`,
      tekst: `${aanhef}\n\nOndanks eerdere herinneringen staat ${kern} nog open; de vervaldatum was ${nlDatum(f.vervaldatum)}. We vragen je het bedrag binnen vijf werkdagen over te maken. Blijft betaling uit, dan neemt ${o.bedrijfsnaam} persoonlijk contact met je op over de volgende stap.${betaal}${slot}`,
    };
  }
  if (o.moment <= 7) {
    return {
      onderwerp: `Herinnering: factuur ${f.nummer}`,
      tekst: `${aanhef}\n\nVolgens onze administratie staat ${kern} nog open; de vervaldatum was ${nlDatum(f.vervaldatum)}. Misschien is het aan je aandacht ontsnapt. Zou je de betaling binnenkort willen regelen?${betaal}${slot}`,
    };
  }
  return {
    onderwerp: `Tweede herinnering: factuur ${f.nummer}`,
    tekst: `${aanhef}\n\n${kern.charAt(0).toUpperCase() + kern.slice(1)} is ${dagenTeLaat(f.vervaldatum)} dagen over de vervaldatum van ${nlDatum(f.vervaldatum)} en staat nog open. We verzoeken je het bedrag binnen zeven dagen over te maken.${betaal}${slot}`,
  };
}

/** Staat deze debiteur op de lijst "nooit herinneren"? Adres, domein of naam. */
export function nietHerinneren(
  f: { klant_email: string; klant_naam?: string | null },
  lijst: readonly string[] | null | undefined,
): boolean {
  if (!lijst || lijst.length === 0) return false;
  const email = f.klant_email.trim().toLowerCase();
  const naam = (f.klant_naam ?? "").trim().toLowerCase();
  const domein = email.includes("@") ? email.slice(email.indexOf("@")) : "";
  return lijst.some((r) => {
    const regel = String(r).trim().toLowerCase();
    if (!regel) return false;
    if (regel.startsWith("@")) return domein === regel;
    if (regel.includes("@")) return email === regel;
    return naam !== "" && naam === regel;
  });
}
