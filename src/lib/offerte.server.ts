/**
 * Offertes van begin tot eind: ontvangen, laten opstellen, versturen, opvolgen.
 * Alleen op de server, met de service-role; laad met een dynamische import.
 *
 * Wie iets mag, controleert de aanroeper: de webhook de handtekening van
 * Resend, de server functions het eigendom met mijnAgent(). Deze module doet
 * wat haar gevraagd wordt — net als support.server.ts, waar ze op lijkt.
 */

import { esc, opmaak } from "@/lib/mail.server";
import { meldFairUse } from "@/lib/fair-use.server";
import {
  bouwOfferte,
  geldigTot,
  leesPrijslijst,
  magDirect,
  regelsAlsHtml,
  regelsAlsTekst,
  type Offerteregel,
} from "@/lib/offerte-regels";
import { stelOfferteOp } from "@/lib/offerte-opstellen.server";

const RESEND = "https://api.resend.com";

function db() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase-instellingen ontbreken op de server.");
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

export type Aanvraag = {
  id: string;
  agent_id: string;
  provider_id: string;
  message_id: string | null;
  van_email: string;
  van_naam: string | null;
  bedrijf: string | null;
  onderwerp: string | null;
  vraag: string;
  status: string;
  regels: Offerteregel[];
  totaal: number | null;
  geldig_tot: string | null;
  concept_onderwerp: string | null;
  concept_tekst: string | null;
  ontbreekt: string[];
  opvolging_provider_id: string | null;
};

type Afzender = {
  afzender_naam: string | null;
  afzender_email: string | null;
  ondertekening: string | null;
};

async function patch(id: string, velden: Record<string, unknown>, voorwaarde = "") {
  const d = db();
  const res = await fetch(`${d.url}/rest/v1/offerte_aanvragen?id=eq.${id}${voorwaarde}`, {
    method: "PATCH",
    headers: { ...d.headers, Prefer: "return=representation" },
    body: JSON.stringify({ ...velden, bijgewerkt_op: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Bijwerken mislukt [${res.status}]`);
  return (await res.json()) as Aanvraag[];
}

async function haal<T>(pad: string): Promise<T[]> {
  const d = db();
  const res = await fetch(`${d.url}/rest/v1/${pad}`, { headers: d.headers });
  if (!res.ok) throw new Error(`Ophalen mislukt [${res.status}]`);
  return (await res.json()) as T[];
}

/** Legt een aanvraag vast. Null als we hem al kenden (zelfde provider_id). */
export async function ontvangAanvraag(a: {
  agentId: string;
  providerId: string;
  messageId?: string | null;
  vanEmail: string;
  vanNaam?: string | null;
  bedrijf?: string | null;
  onderwerp?: string | null;
  vraag: string;
}): Promise<string | null> {
  const d = db();
  const res = await fetch(`${d.url}/rest/v1/offerte_aanvragen`, {
    method: "POST",
    headers: { ...d.headers, Prefer: "return=representation" },
    body: JSON.stringify({
      agent_id: a.agentId,
      provider_id: a.providerId,
      message_id: a.messageId ?? null,
      van_email: a.vanEmail.toLowerCase(),
      van_naam: a.vanNaam ?? null,
      bedrijf: a.bedrijf ?? null,
      onderwerp: a.onderwerp ?? null,
      vraag: a.vraag,
    }),
  });
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(`Aanvraag opslaan mislukt [${res.status}]: ${await res.text()}`);
  const [rij] = (await res.json()) as Array<{ id: string }>;
  return rij?.id ?? null;
}

async function telVerbruik(agentId: string, v: { input: number; output: number; cache: number }) {
  const d = db();
  try {
    await fetch(`${d.url}/rest/v1/rpc/record_agent_tokens`, {
      method: "POST",
      headers: d.headers,
      body: JSON.stringify({
        _agent_id: agentId,
        _input: v.input,
        _output: v.output,
        _cache_read: v.cache,
      }),
    });
    await meldFairUse(agentId);
  } catch (e) {
    console.warn("offerte: verbruik vastleggen mislukt", e);
  }
}

/**
 * Stelt de offerte op en beslist wat ermee gebeurt.
 *
 *   - Agent op pauze: blijft 'nieuw' staan.
 *   - Niet te beantwoorden of er ontbreekt iets: 'mens_nodig', met wat er wél
 *     is als voorzet.
 *   - Anders een concept. Direct versturen alleen als de klant dat aanzette,
 *     het totaal onder zijn grens blijft en er niets ontbreekt (magDirect).
 *
 * Eerst claimen, zodat twee gelijktijdige aanroepen niet twee keer opstellen.
 */
export async function verwerkAanvraag(id: string): Promise<string> {
  const [aanvraag] = await patch(id, { status: "bezig", fout: null }, "&status=in.(nieuw,mislukt)");
  if (!aanvraag) return "al in behandeling";

  try {
    const [agent] = await haal<{
      id: string;
      name: string;
      status: string;
      tone: string | null;
      extra_instructions: string | null;
      model: string | null;
      client_id: string;
      opties: Record<string, unknown> | null;
    }>(
      `agents?select=id,name,status,tone,extra_instructions,model,client_id,opties&id=eq.${aanvraag.agent_id}`,
    );
    if (!agent) throw new Error("Agent niet gevonden");
    const opties = agent.opties ?? {};

    if (agent.status === "paused") {
      await patch(id, { status: "nieuw", toelichting: "De agent stond op pauze." });
      return "gepauzeerd";
    }

    const [afz] = await haal<Afzender>(
      `support_instellingen?select=afzender_naam,afzender_email,ondertekening&agent_id=eq.${aanvraag.agent_id}`,
    );
    const [klant] = await haal<{ name: string }>(`profiles?select=name&id=eq.${agent.client_id}`);
    const kennis = await haal<{ id: string; category: string; title: string; content: string }>(
      `knowledge_items?select=id,category,title,content&agent_id=eq.${aanvraag.agent_id}&is_active=eq.true&order=category,sort_order`,
    );
    const prijslijst = leesPrijslijst(kennis);
    const bedrijfsnaam = afz?.afzender_naam || klant?.name || agent.name;

    const concept = await stelOfferteOp({
      bedrijfsnaam,
      ondertekening: afz?.ondertekening || `Met vriendelijke groet,\n${bedrijfsnaam}`,
      toon: agent.tone,
      extraInstructies: agent.extra_instructions,
      voorwaarden:
        typeof opties["offerte_voorwaarden"] === "string" ? opties["offerte_voorwaarden"] : null,
      kennis,
      prijslijst,
      aanvraag: {
        vanNaam: aanvraag.van_naam,
        bedrijf: aanvraag.bedrijf,
        onderwerp: aanvraag.onderwerp,
        tekst: aanvraag.vraag,
      },
      model: agent.model,
    });
    await telVerbruik(aanvraag.agent_id, concept.verbruik);

    const offerte = bouwOfferte(concept.keuzes, prijslijst);
    const velden = {
      regels: offerte.regels,
      totaal: offerte.totaal,
      geldig_tot: geldigTot(new Date(), opties["offerte_geldig_dagen"]),
      concept_onderwerp: concept.onderwerp,
      concept_tekst: concept.tekst,
      ontbreekt: [...concept.ontbreekt, ...offerte.fouten],
      toelichting: concept.toelichting || null,
      concept_op: new Date().toISOString(),
    };

    if (!concept.beantwoordbaar || offerte.regels.length === 0) {
      await patch(id, { ...velden, status: "mens_nodig" });
      return "mens_nodig";
    }

    const direct = magDirect({
      modus: opties["offerte_modus"],
      maxDirect: opties["offerte_max_direct"],
      beantwoordbaar: concept.beantwoordbaar,
      ontbreekt: concept.ontbreekt,
      fouten: offerte.fouten,
      totaal: offerte.totaal,
    });

    if (!direct || !afz?.afzender_email) {
      await patch(id, { ...velden, status: "concept" });
      return "concept";
    }

    await patch(id, { ...velden, status: "concept" });
    try {
      await verstuurOfferte(id, {
        onderwerp: concept.onderwerp,
        tekst: concept.tekst,
        regels: offerte.regels,
        door: null,
      });
      return "verstuurd";
    } catch (e) {
      await patch(id, {
        status: "concept",
        fout: `Direct versturen mislukte: ${e instanceof Error ? e.message : "onbekend"}`.slice(
          0,
          300,
        ),
      });
      return "concept";
    }
  } catch (e) {
    await patch(id, {
      status: "mislukt",
      fout: (e instanceof Error ? e.message : "Onbekende fout").slice(0, 300),
    }).catch(() => {});
    throw e;
  }
}

/**
 * Verstuurt de offerte vanaf het afzenderadres van de klant, en plant de
 * opvolging in als de klant dat heeft ingesteld.
 */
export async function verstuurOfferte(
  id: string,
  a: { onderwerp: string; tekst: string; regels: Offerteregel[]; door: string | null },
) {
  const [voor] = await haal<Aanvraag>(`offerte_aanvragen?select=*&id=eq.${id}`);
  if (!voor) throw new Error("Deze aanvraag bestaat niet.");
  if (voor.status === "verstuurd" || voor.status === "geaccepteerd") {
    throw new Error("Deze offerte is al verstuurd.");
  }

  // Eerst claimen: twee keer snel klikken mag geen twee offertes opleveren.
  const [aanvraag] = await patch(
    id,
    { status: "bezig" },
    "&status=in.(concept,mens_nodig,mislukt,nieuw,zelf,afgewezen)",
  );
  if (!aanvraag) throw new Error("Deze offerte wordt al verstuurd.");
  const terug = () => patch(id, { status: voor.status }).catch(() => {});

  const [afz] = await haal<Afzender>(
    `support_instellingen?select=afzender_naam,afzender_email,ondertekening&agent_id=eq.${voor.agent_id}`,
  );
  if (!afz?.afzender_email) {
    await terug();
    throw new Error("Vul eerst bij de instellingen het adres in waarvandaan offertes vertrekken.");
  }
  const [agent] = await haal<{ opties: Record<string, unknown> | null }>(
    `agents?select=opties&id=eq.${voor.agent_id}`,
  );
  const opties = agent?.opties ?? {};

  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel) {
    await terug();
    throw new Error("RESEND_API_KEY ontbreekt op de server.");
  }

  const totaal = Math.round(a.regels.reduce((s, r) => s + r.bedrag, 0) * 100) / 100;
  const geldig = voor.geldig_tot ?? geldigTot(new Date(), opties["offerte_geldig_dagen"]);
  const voorwaarden =
    typeof opties["offerte_voorwaarden"] === "string" ? opties["offerte_voorwaarden"].trim() : "";
  const geldigTekst = `Deze offerte is geldig tot ${new Date(geldig).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}.`;

  const tekst = [a.tekst, regelsAlsTekst(a.regels, totaal), geldigTekst, voorwaarden]
    .filter(Boolean)
    .join("\n\n");
  const html = opmaak([
    ...a.tekst.split(/\n{2,}/).map(esc),
    regelsAlsHtml(a.regels, totaal, esc),
    esc(geldigTekst),
    ...(voorwaarden ? [`<span style="color:#666;font-size:12px">${esc(voorwaarden)}</span>`] : []),
  ]);
  const van = afz.afzender_naam
    ? `${afz.afzender_naam} <${afz.afzender_email}>`
    : afz.afzender_email;
  const headers: Record<string, string> = {};
  if (voor.message_id) {
    headers["In-Reply-To"] = voor.message_id;
    headers["References"] = voor.message_id;
  }

  let res: Response;
  try {
    res = await fetch(`${RESEND}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: van,
        to: [voor.van_email],
        reply_to: afz.afzender_email,
        subject: a.onderwerp,
        text: tekst,
        html,
        headers,
      }),
    });
  } catch (e) {
    await terug();
    throw e;
  }
  const antwoord = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !antwoord.id) {
    await terug();
    throw new Error(antwoord.message ?? `Versturen mislukt: Resend gaf ${res.status}`);
  }

  // De opvolging: één vriendelijke vraag na x dagen, vooruit ingepland bij
  // Resend. Zegt de klant van de klant intussen ja of nee, dan trekken we hem
  // in (zie besluit).
  let opvolgingId: string | null = null;
  const naDagen = Number(opties["offerte_opvolgen_na"]);
  if (Number.isFinite(naDagen) && naDagen > 0) {
    try {
      const wanneer = new Date(Date.now() + naDagen * 86_400_000).toISOString();
      const opv = await fetch(`${RESEND}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: van,
          to: [voor.van_email],
          reply_to: afz.afzender_email,
          subject: `Re: ${a.onderwerp}`,
          text: `Beste ${voor.van_naam || "relatie"},\n\nEen paar dagen geleden stuurden we je een offerte. Zijn er nog vragen over, of kunnen we iets aanpassen? Een reactie op deze mail is genoeg.\n\n${afz.ondertekening || afz.afzender_naam || ""}`,
          scheduled_at: wanneer,
          headers,
        }),
      });
      const j = (await opv.json().catch(() => ({}))) as { id?: string };
      if (opv.ok && j.id) opvolgingId = j.id;
    } catch (e) {
      console.warn("offerte: opvolging inplannen mislukt", e);
    }
  }

  await patch(id, {
    status: "verstuurd",
    regels: a.regels,
    totaal,
    geldig_tot: geldig,
    verzonden_onderwerp: a.onderwerp,
    verzonden_tekst: tekst,
    verzonden_op: new Date().toISOString(),
    verzonden_door: a.door,
    opvolging_provider_id: opvolgingId,
    fout: null,
  });
}

/** Geaccepteerd of afgewezen: vastleggen, en de opvolging intrekken. */
export async function besluitOfferte(id: string, besluit: "geaccepteerd" | "afgewezen" | "zelf") {
  const [a] = await haal<Aanvraag>(`offerte_aanvragen?select=*&id=eq.${id}`);
  if (!a) throw new Error("Deze aanvraag bestaat niet.");

  if (a.opvolging_provider_id) {
    const sleutel = process.env["RESEND_API_KEY"];
    if (sleutel) {
      await fetch(`${RESEND}/emails/${a.opvolging_provider_id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sleutel}` },
      }).catch((e) => console.warn("offerte: opvolging intrekken mislukt", e));
    }
  }
  await patch(id, {
    status: besluit,
    besloten_op: new Date().toISOString(),
    opvolging_provider_id: null,
  });
}
