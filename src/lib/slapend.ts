/**
 * Wie slapend is, en wie we met rust laten.
 *
 * Pure rekenregels voor de heractivatie-agent, los van de database en de
 * server, zodat ze te testen zijn met `node scripts/test-slapend.ts` — in
 * beide tijdzones, want hier wordt met datums gerekend.
 *
 * Twee grenzen die allebei een reden hebben:
 *
 *   Slapend ná een aantal maanden (de klant kiest; standaard twaalf). Eerder
 *   aanschrijven is iemand lastigvallen die gewoon even geen kip nodig had.
 *
 *   Maar niet ouder dan drie jaar. De AVG staat toe dat je een oud-klant
 *   benadert op grond van de klantrelatie, en na drie jaar stilte ís er geen
 *   klantrelatie meer. Dan is het een koude lijst met een excuus.
 *
 * Een onbekende datum telt als slapend. Bij FJ Snacks hebben de 37 echte
 * oud-klanten geen datum — ze vertrokken na de overname — en juist die horen
 * aangeschreven te worden. Wie dat niet wil, zet ze op de lijst "nooit".
 */

export const MAX_SLAPEND_MAANDEN = 36;

/** Een datum (ISO "2025-03-14" of Date) als aantal hele maanden geleden. */
export function maandenGeleden(
  datum: string | Date | null | undefined,
  vandaag = new Date(),
): number | null {
  if (!datum) return null;
  const d = typeof datum === "string" ? leesDatum(datum) : datum;
  if (!d || Number.isNaN(d.getTime())) return null;
  // Rekenen op UTC-velden: dan doet dit overal hetzelfde, ook op Cloudflare.
  const maanden =
    (vandaag.getUTCFullYear() - d.getUTCFullYear()) * 12 +
    (vandaag.getUTCMonth() - d.getUTCMonth()) -
    (vandaag.getUTCDate() < d.getUTCDate() ? 1 : 0);
  return Math.max(maanden, 0);
}

/**
 * Leest de datums die in exports voorkomen: ISO, Nederlands met streepjes of
 * schuine strepen, en een Excel-serienummer. Geeft null bij alles wat niet
 * eenduidig is — een verkeerd gelezen datum maakt iemand ten onrechte slapend.
 */
export function leesDatum(ruw: string | number | null | undefined): Date | null {
  if (ruw === null || ruw === undefined) return null;
  if (typeof ruw === "number") {
    // Excel telt dagen vanaf 30 december 1899.
    if (ruw < 20000 || ruw > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + ruw * 86_400_000);
  }
  const t = ruw.trim();
  if (!t) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(t);
  if (m) return utc(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (m) return utc(Number(m[3]), Number(m[2]), Number(m[1]));

  // Vijfcijferig getal als tekst: een Excel-serienummer dat als tekst is
  // geëxporteerd.
  if (/^\d{5}$/.test(t)) return leesDatum(Number(t));
  return null;
}

function utc(jaar: number, maand: number, dag: number): Date | null {
  if (maand < 1 || maand > 12 || dag < 1 || dag > 31) return null;
  const d = new Date(Date.UTC(jaar, maand - 1, dag));
  // 31 februari schuift door naar maart; dat is geen datum maar een typefout.
  return d.getUTCMonth() === maand - 1 ? d : null;
}

/**
 * Is dit contact slapend volgens de instelling? Onbekend telt mee; ouder dan
 * drie jaar niet.
 */
export function isSlapend(
  laatstBesteld: string | Date | null | undefined,
  naMaanden: number,
  vandaag = new Date(),
): boolean {
  const geleden = maandenGeleden(laatstBesteld, vandaag);
  if (geleden === null) return true;
  return geleden >= naMaanden && geleden <= MAX_SLAPEND_MAANDEN;
}

/**
 * Staat dit contact op de lijst "nooit aanschrijven"? De lijst mag
 * e-mailadressen, domeinen (@bakker.nl) en bedrijfsnamen bevatten; hoofdletters
 * en spaties tellen niet.
 */
export function metRust(
  contact: { email: string; bedrijf?: string | null },
  lijst: readonly string[] | null | undefined,
): boolean {
  if (!lijst || lijst.length === 0) return false;
  const email = contact.email.trim().toLowerCase();
  const bedrijf = (contact.bedrijf ?? "").trim().toLowerCase();
  const domein = email.includes("@") ? email.slice(email.indexOf("@")) : "";
  return lijst.some((r) => {
    const regel = String(r).trim().toLowerCase();
    if (!regel) return false;
    if (regel.startsWith("@")) return domein === regel;
    if (regel.includes("@")) return email === regel;
    return bedrijf !== "" && bedrijf === regel;
  });
}

/** Wat het bericht aan de slapende klant noemt als reden om terug te komen. */
export function redenOmTerugTeKomen(
  campagneAanbod: string | null | undefined,
  agentAanbod: unknown,
): string | null {
  const c = (campagneAanbod ?? "").trim();
  if (c) return c;
  const a = typeof agentAanbod === "string" ? agentAanbod.trim() : "";
  return a || null;
}
