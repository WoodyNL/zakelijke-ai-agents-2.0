/**
 * Vastleggen wie wat veranderde.
 *
 * Eén regel per handeling, met de klant erbij zodat hij het in zijn eigen
 * portaal terugziet. De database bepaalt zelf wie het deed en met welke rol;
 * hier geven we alleen door wát er gebeurde.
 *
 * Twee regels voor wie dit aanroept:
 *
 *   Geen inhoud van de klant in `details` of in de omschrijving. Wel "fair use
 *   van 300 naar 500", niet de tekst van een bericht of de naam van een
 *   contact. De klant leest mee, en wij horen niet te bewaren wat we niet
 *   mogen zien.
 *
 *   Nooit de handeling tegenhouden als het vastleggen faalt. Een logregel die
 *   niet lukt is vervelend; een klant die zijn agent niet kan pauzeren omdat
 *   het logboek stuk is, is erger.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type Handeling = {
  /** Vaste code, bijvoorbeeld "agent.gewijzigd" of "klant.verwijderd". */
  actie: string;
  /** Eén leesbare zin; dit ziet de klant. */
  omschrijving: string;
  clientId?: string | null;
  agentId?: string | null;
  /** Alleen voor ons; geen inhoud van de klant. */
  details?: Record<string, unknown>;
};

export async function legVast(context: { supabase: unknown }, h: Handeling): Promise<void> {
  try {
    const { error } = await (context.supabase as Rpc).rpc("leg_vast", {
      _actie: h.actie,
      _omschrijving: h.omschrijving,
      _client_id: h.clientId ?? null,
      _agent_id: h.agentId ?? null,
      _details: h.details ?? {},
    });
    if (error) console.warn("logboek: vastleggen mislukt", error.message);
  } catch (e) {
    console.warn("logboek: vastleggen mislukt", e);
  }
}

/**
 * Wat er veranderde, in woorden die de klant begrijpt.
 *
 * Geeft alleen de velden terug die werkelijk anders zijn. Lange teksten
 * (instructies, een welkomsttekst) worden niet uitgeschreven; dan staat er dat
 * ze zijn aangepast. Dat houdt de regel leesbaar en voorkomt dat er een halve
 * kennisbank in het logboek terechtkomt.
 */
export function verschillen(
  voor: Record<string, unknown>,
  na: Record<string, unknown>,
  namen: Record<string, string>,
): { zin: string; details: Record<string, unknown> } {
  const stukken: string[] = [];
  const details: Record<string, unknown> = {};

  for (const [sleutel, nieuw] of Object.entries(na)) {
    const oud = voor[sleutel];
    if (JSON.stringify(oud ?? null) === JSON.stringify(nieuw ?? null)) continue;
    const label = namen[sleutel] ?? sleutel;
    details[sleutel] = { van: kort(oud), naar: kort(nieuw) };
    stukken.push(
      lang(nieuw) || lang(oud) ? `${label} aangepast` : `${label}: ${toon(oud)} → ${toon(nieuw)}`,
    );
  }
  return { zin: stukken.join("; "), details };
}

const lang = (v: unknown) => typeof v === "string" && v.length > 60;

function toon(v: unknown): string {
  if (v === null || v === undefined || v === "") return "leeg";
  if (typeof v === "boolean") return v ? "aan" : "uit";
  if (Array.isArray(v)) return v.length === 0 ? "leeg" : v.join(", ");
  return String(v);
}

function kort(v: unknown): unknown {
  if (typeof v === "string" && v.length > 60) return `${v.slice(0, 60)}…`;
  return v ?? null;
}
