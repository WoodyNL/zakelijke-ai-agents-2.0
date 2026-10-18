/**
 * De rekenregels van de offerte-agent, zonder model en zonder database.
 *
 * Het principe dat alles hier bepaalt: het model kiest, de server rekent. Het
 * model mag zeggen "regel 3 uit de prijslijst, vier stuks"; het bedrag komt uit
 * de prijslijst zelf en wordt hier vermenigvuldigd. Zo kan er in een offerte
 * nooit een prijs staan die niet in de prijslijst staat, ook niet als het
 * model er een verzint — die wordt gewoon niet gelezen.
 *
 * Pure functies, dus te testen met node scripts/test-offerte-regels.ts.
 */

import { euroTekst, leesBedrag } from "./prijsimport.ts";

/** Eén regel uit de prijslijst, zoals hij in de kennisbank staat. */
export type Prijsrij = {
  /** Het kennisitem; dit is de bron die bij de offerteregel komt. */
  id: string;
  titel: string;
  bedrag: number;
  eenheid: string | null;
};

/**
 * Leest de prijslijst terug uit kennisitems van de categorie "prijzen".
 *
 * prijs-upload.tsx schrijft ze als "<product> kost € 12,50 per kilo." (zie
 * prijsimport.alsKennis). Items waar geen bedrag uit te lezen is, doen niet
 * mee: liever een product dat de agent niet kan offreren dan een gokbedrag.
 */
export function leesPrijslijst(
  items: Array<{ id: string; title: string; content: string; category?: string | null }>,
): Prijsrij[] {
  const uit: Prijsrij[] = [];
  for (const it of items) {
    if (it.category && it.category.trim().toLowerCase() !== "prijzen") continue;
    const m = /kost\s+(€?\s*\d(?:[\d.,]*\d)?)\s*(?:\(([^)]*)\))?\s*(per\s+[^.;\n]+)?/i.exec(
      it.content,
    );
    const bedrag = m ? leesBedrag(m[1] ?? "") : null;
    if (bedrag === null) continue;
    uit.push({
      id: it.id,
      titel: it.title.trim(),
      bedrag,
      eenheid: m?.[3] ? m[3].trim() : null,
    });
  }
  return uit;
}

/** Wat het model teruggeeft per regel: een keuze, geen bedrag. */
export type Keuze = { prijs_id: string; aantal: number; opmerking?: string | null };

export type Offerteregel = {
  omschrijving: string;
  aantal: number;
  eenheid: string | null;
  prijs: number;
  bedrag: number;
  /** De titel van het kennisitem waar de prijs uit komt. */
  bron: string;
  opmerking: string | null;
};

export type Offerte = {
  regels: Offerteregel[];
  totaal: number;
  /** Keuzes die niet in de prijslijst stonden of een onmogelijk aantal hadden. */
  fouten: string[];
};

const rond = (n: number) => Math.round(n * 100) / 100;

/**
 * Bouwt de offerte uit keuzes en de prijslijst. Een keuze met een onbekend id
 * of een raar aantal wordt een fout, geen regel — en een offerte met fouten
 * gaat nooit automatisch de deur uit.
 */
export function bouwOfferte(keuzes: Keuze[], prijslijst: Prijsrij[]): Offerte {
  const perId = new Map(prijslijst.map((p) => [p.id, p] as const));
  const regels: Offerteregel[] = [];
  const fouten: string[] = [];

  for (const k of keuzes) {
    const rij = perId.get(String(k.prijs_id));
    if (!rij) {
      fouten.push(
        `Een regel verwijst naar een prijs die niet in de prijslijst staat (${String(k.prijs_id)}).`,
      );
      continue;
    }
    const aantal = Number(k.aantal);
    if (!Number.isFinite(aantal) || aantal <= 0 || aantal > 100_000) {
      fouten.push(`Een onmogelijk aantal voor ${rij.titel}: ${String(k.aantal)}.`);
      continue;
    }
    regels.push({
      omschrijving: rij.titel,
      aantal: rond(aantal),
      eenheid: rij.eenheid,
      prijs: rij.bedrag,
      bedrag: rond(aantal * rij.bedrag),
      bron: rij.titel,
      opmerking: k.opmerking ? String(k.opmerking).slice(0, 200) : null,
    });
  }

  return { regels, totaal: rond(regels.reduce((s, r) => s + r.bedrag, 0)), fouten };
}

/**
 * Mag deze offerte zonder jouw oog de deur uit?
 *
 * Vier voorwaarden, en ze moeten allemaal waar zijn: direct staat aan, het
 * model kon de aanvraag beantwoorden, er ontbreekt niets, en het totaal blijft
 * onder het bedrag dat de klant als grens heeft gezet.
 */
export function magDirect(o: {
  modus: unknown;
  maxDirect: unknown;
  beantwoordbaar: boolean;
  ontbreekt: string[];
  fouten: string[];
  totaal: number;
}): boolean {
  if (o.modus !== "direct") return false;
  if (!o.beantwoordbaar || o.ontbreekt.length > 0 || o.fouten.length > 0) return false;
  if (o.totaal <= 0) return false;
  const grens = Number(o.maxDirect);
  if (!Number.isFinite(grens) || grens <= 0) return false;
  return o.totaal <= grens;
}

/** De regels als nette tekst onder de begeleidende brief. */
export function regelsAlsTekst(regels: Offerteregel[], totaal: number): string {
  if (regels.length === 0) return "";
  const lijn = regels.map((r) => {
    const eenheid = r.eenheid ? ` ${r.eenheid.replace(/^per\s+/i, "")}` : "";
    const opm = r.opmerking ? ` (${r.opmerking})` : "";
    return `${r.aantal}×${eenheid ? "" : ""} ${r.omschrijving}${opm} — ${r.aantal} × ${euroTekst(r.prijs)}${eenheid ? ` per${eenheid}` : ""} = ${euroTekst(r.bedrag)}`;
  });
  return `${lijn.join("\n")}\n\nTotaal: ${euroTekst(totaal)}`;
}

/** Dezelfde regels als HTML-tabel voor de mail. */
export function regelsAlsHtml(
  regels: Offerteregel[],
  totaal: number,
  esc: (s: string) => string,
): string {
  if (regels.length === 0) return "";
  const rijen = regels
    .map(
      (r) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(r.omschrijving)}${
          r.opmerking
            ? `<br><span style="color:#666;font-size:12px">${esc(r.opmerking)}</span>`
            : ""
        }</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${r.aantal}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${esc(euroTekst(r.prijs))}${
          r.eenheid ? ` <span style="color:#666">${esc(r.eenheid)}</span>` : ""
        }</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${esc(euroTekst(r.bedrag))}</td></tr>`,
    )
    .join("");
  return (
    `<table style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">` +
    `<thead><tr><th style="text-align:left;padding:6px 8px">Omschrijving</th><th style="text-align:right;padding:6px 8px">Aantal</th><th style="text-align:right;padding:6px 8px">Prijs</th><th style="text-align:right;padding:6px 8px">Bedrag</th></tr></thead>` +
    `<tbody>${rijen}</tbody>` +
    `<tfoot><tr><td colspan="3" style="padding:8px;text-align:right"><strong>Totaal</strong></td><td style="padding:8px;text-align:right"><strong>${esc(euroTekst(totaal))}</strong></td></tr></tfoot>` +
    `</table>`
  );
}

/** Tot wanneer de offerte geldt, als "2026-11-17". */
export function geldigTot(vanaf: Date, dagen: unknown): string {
  const n = Number(dagen);
  const d = new Date(vanaf.getTime() + (Number.isFinite(n) && n > 0 ? n : 30) * 86_400_000);
  return d.toISOString().slice(0, 10);
}
