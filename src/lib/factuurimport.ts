/**
 * Een lijst openstaande facturen inlezen uit een export.
 *
 * Dezelfde houding als bij contacten en prijzen: het bestand komt zoals het
 * komt. Kolommen raden op de kopregel, bedragen en datums tolerant lezen, en
 * alles wat niet eenduidig is overslaan met een reden — nooit gokken. Een
 * verkeerd gelezen bedrag wordt anders een herinnering voor het verkeerde
 * bedrag, en dat is erger dan een factuur die niet is ingelezen.
 */

import { eersteEmail } from "./contactimport.ts";
import { leesBedrag } from "./prijsimport.ts";
import { leesDatum } from "./slapend.ts";

export type Factuurkolom =
  "nummer" | "klant" | "email" | "bedrag" | "factuurdatum" | "vervaldatum" | "betaald" | "negeren";

const KOPPEN: Record<Exclude<Factuurkolom, "negeren">, string[]> = {
  nummer: ["factuurnummer", "factuurnr", "nummer", "invoice", "invoice number", "nr", "kenmerk"],
  klant: ["klant", "klantnaam", "debiteur", "relatie", "bedrijf", "naam", "customer", "company"],
  email: ["e-mail", "email", "mail", "e-mailadres", "emailadres"],
  bedrag: ["openstaand", "bedrag", "totaal", "te betalen", "amount", "total", "saldo", "incl"],
  factuurdatum: ["factuurdatum", "datum", "invoice date", "date"],
  vervaldatum: ["vervaldatum", "vervalt", "due", "due date", "betaaltermijn", "uiterlijk"],
  betaald: ["betaald", "betaaldatum", "voldaan", "paid", "paid date", "ontvangen op"],
};

const schoon = (kop: string) =>
  kop
    .toLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Raadt per kolom wat erin staat, op de kopregel. Eén kolom per soort. */
export function raadFactuurkolommen(rijen: string[][], heeftKop: boolean): Factuurkolom[] {
  const kop = heeftKop ? (rijen[0] ?? []) : [];
  const breedte = Math.max(...rijen.map((r) => r.length), 0);
  const uit: Factuurkolom[] = Array.from({ length: breedte }, () => "negeren");
  const vergeven = new Set<Factuurkolom>();

  // Specifieke koppen eerst, zodat "vervaldatum" niet als "datum" wordt
  // gelezen en "openstaand" wint van "bedrag".
  const volgorde: Array<Exclude<Factuurkolom, "negeren">> = [
    "vervaldatum",
    "betaald",
    "factuurdatum",
    "email",
    "nummer",
    "bedrag",
    "klant",
  ];
  for (const soort of volgorde) {
    let beste = -1;
    let besteScore = 0;
    kop.forEach((cel, i) => {
      if (uit[i] !== "negeren") return;
      const k = schoon(cel);
      const score = KOPPEN[soort].reduce(
        (s, w) => (k === w ? s + 3 : k.includes(w) ? s + 1 : s),
        0,
      );
      if (score > besteScore) {
        besteScore = score;
        beste = i;
      }
    });
    if (beste >= 0 && !vergeven.has(soort)) {
      uit[beste] = soort;
      vergeven.add(soort);
    }
  }
  // Geen kop herkend voor e-mail? Dan de eerste kolom waar adressen in staan.
  if (!vergeven.has("email")) {
    const data = heeftKop ? rijen.slice(1) : rijen;
    for (let i = 0; i < breedte; i++) {
      if (uit[i] === "negeren" && data.some((r) => eersteEmail(r[i] ?? "") !== null)) {
        uit[i] = "email";
        break;
      }
    }
  }
  return uit;
}

export type GelezenFactuur = {
  nummer: string;
  klant_naam: string | null;
  klant_email: string;
  bedrag: number;
  factuurdatum: string;
  vervaldatum: string;
  betaald_op: string | null;
};

export type FactuurOvergeslagen = { rij: number; reden: string; inhoud: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function leesFacturen(
  rijen: string[][],
  kolommen: Factuurkolom[],
  heeftKop: boolean,
  standaardTermijnDagen = 30,
): { facturen: GelezenFactuur[]; overgeslagen: FactuurOvergeslagen[] } {
  const facturen: GelezenFactuur[] = [];
  const overgeslagen: FactuurOvergeslagen[] = [];
  const gezien = new Set<string>();
  const pak = (rij: string[], soort: Factuurkolom) => {
    const k = kolommen.indexOf(soort);
    return k >= 0 ? (rij[k] ?? "").trim() : "";
  };

  rijen.forEach((rij, i) => {
    if (heeftKop && i === 0) return;
    if (rij.every((c) => !c || !c.trim())) return;
    const nummer = i + 1;
    const inhoud = rij.filter(Boolean).join(" | ").slice(0, 80);

    const email = eersteEmail(pak(rij, "email"));
    if (!email)
      return void overgeslagen.push({ rij: nummer, reden: "geen geldig e-mailadres", inhoud });

    const bedrag = leesBedrag(pak(rij, "bedrag"));
    if (bedrag === null || bedrag < 0)
      return void overgeslagen.push({ rij: nummer, reden: "geen leesbaar bedrag", inhoud });

    const factuurdatum = leesDatum(pak(rij, "factuurdatum"));
    if (!factuurdatum)
      return void overgeslagen.push({ rij: nummer, reden: "geen leesbare factuurdatum", inhoud });

    const vervalRuw = leesDatum(pak(rij, "vervaldatum"));
    const vervaldatum =
      vervalRuw ?? new Date(factuurdatum.getTime() + standaardTermijnDagen * 86_400_000);

    let factuurnummer = pak(rij, "nummer");
    if (!factuurnummer) factuurnummer = `${iso(factuurdatum)}-${email}`;
    if (gezien.has(factuurnummer))
      return void overgeslagen.push({
        rij: nummer,
        reden: "factuurnummer staat al eerder in dit bestand",
        inhoud: factuurnummer,
      });
    gezien.add(factuurnummer);

    const betaald = leesDatum(pak(rij, "betaald"));
    const klant = pak(rij, "klant");
    facturen.push({
      nummer: factuurnummer.slice(0, 60),
      klant_naam: klant ? klant.slice(0, 120) : null,
      klant_email: email,
      bedrag,
      factuurdatum: iso(factuurdatum),
      vervaldatum: iso(vervaldatum),
      betaald_op: betaald ? iso(betaald) : null,
    });
  });
  return { facturen, overgeslagen };
}

/**
 * De rijen zoals ze in één keer worden opgeslagen.
 *
 * Eén regel die niet in het schema staat maar wel geldt: alle rijen in één
 * opslagactie moeten precies dezelfde velden hebben, anders weigert de
 * database-API het hele blok. Dat ging mis toen betaalde facturen een extra
 * veld `status` kregen en open facturen niet: een export met allebei erin
 * (de meeste exports) werd dan in zijn geheel geweigerd, "na 0 facturen".
 *
 * Daarom staat `status` hier niet in. Wat betaald is, wordt daarna apart op
 * betaald gezet. Een bestaande factuur die iemand met de hand op gepauzeerd
 * of uit handen had gezet, houdt zo ook zijn status: de import vult bij, hij
 * overschrijft niet wat een mens heeft besloten.
 */
export function importRijen(
  facturen: GelezenFactuur[],
  agentId: string,
  nu = new Date().toISOString(),
): Array<{
  agent_id: string;
  nummer: string;
  klant_naam: string | null;
  klant_email: string;
  bedrag: number;
  factuurdatum: string;
  vervaldatum: string;
  betaald_op: string | null;
  bron: "bestand";
  bijgewerkt_op: string;
}> {
  return facturen.map((f) => ({
    agent_id: agentId,
    nummer: f.nummer,
    klant_naam: f.klant_naam,
    klant_email: f.klant_email,
    bedrag: f.bedrag,
    factuurdatum: f.factuurdatum,
    vervaldatum: f.vervaldatum,
    betaald_op: f.betaald_op ?? null,
    bron: "bestand",
    bijgewerkt_op: nu,
  }));
}
