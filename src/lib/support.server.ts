/**
 * Supportmail van begin tot eind: ontvangen, een antwoord laten opstellen, en
 * versturen. Alleen op de server, met de service-role; laad met een dynamische
 * import binnen een handler.
 *
 * Wie iets mag, wordt niet hier gecontroleerd maar bij de aanroeper: de
 * webhook controleert de handtekening van Resend, en de server functions voor
 * het portaal controleren eigendom met mijnAgent(). Deze module doet wat haar
 * gevraagd wordt.
 */

import { meldFairUse } from "@/lib/fair-use.server";
import { stelSupportAntwoordOp } from "@/lib/support-antwoord.server";

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

type Mail = {
  id: string;
  agent_id: string;
  message_id: string | null;
  van_email: string;
  van_naam: string | null;
  onderwerp: string | null;
  vraag: string;
  status: string;
  concept_onderwerp: string | null;
  concept_tekst: string | null;
};

type Instellingen = {
  modus: "concept" | "direct";
  afzender_naam: string | null;
  afzender_email: string | null;
  ondertekening: string | null;
};

async function patch(id: string, velden: Record<string, unknown>, voorwaarde = "") {
  const d = db();
  const res = await fetch(`${d.url}/rest/v1/support_mails?id=eq.${id}${voorwaarde}`, {
    method: "PATCH",
    headers: { ...d.headers, Prefer: "return=representation" },
    body: JSON.stringify({ ...velden, bijgewerkt_op: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Bijwerken mislukt [${res.status}]`);
  return (await res.json()) as Mail[];
}

async function haal<T>(pad: string): Promise<T[]> {
  const d = db();
  const res = await fetch(`${d.url}/rest/v1/${pad}`, { headers: d.headers });
  if (!res.ok) throw new Error(`Ophalen mislukt [${res.status}]`);
  return (await res.json()) as T[];
}

/**
 * Legt een binnengekomen supportmail vast. Geeft null terug als hij er al
 * stond: een webhook die opnieuw wordt aangeboden, levert geen tweede mail op.
 */
export async function ontvangSupportMail(m: {
  agentId: string;
  providerId: string;
  messageId?: string | null;
  vanEmail: string;
  vanNaam?: string | null;
  onderwerp?: string | null;
  vraag: string;
}): Promise<string | null> {
  const d = db();
  const res = await fetch(`${d.url}/rest/v1/support_mails`, {
    method: "POST",
    headers: { ...d.headers, Prefer: "return=representation" },
    body: JSON.stringify({
      agent_id: m.agentId,
      provider_id: m.providerId,
      message_id: m.messageId ?? null,
      van_email: m.vanEmail,
      van_naam: m.vanNaam ?? null,
      onderwerp: m.onderwerp ?? null,
      vraag: m.vraag,
    }),
  });
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(`Supportmail opslaan mislukt [${res.status}]: ${await res.text()}`);
  const [rij] = (await res.json()) as Array<{ id: string }>;
  return rij?.id ?? null;
}

/**
 * Stelt een antwoord op en beslist wat ermee gebeurt.
 *
 *   - Staat de agent op pauze, dan blijft de mail staan als 'nieuw'. Pauze
 *     betekent: de agent doet niets. Hervat de klant hem, dan kan hij de mail
 *     alsnog laten opstellen.
 *   - Is het antwoord niet uit de kennisbank te halen: 'mens_nodig', met een
 *     concept dat de klant kan aanvullen.
 *   - Staat direct versturen aan, is het antwoord zeker en de agent live:
 *     versturen. Anders een concept.
 *
 * Eerst claimen (nieuw of mislukt wordt bezig), zodat twee gelijktijdige
 * aanroepen niet twee keer opstellen en niet twee keer versturen.
 */
export async function verwerkSupportMail(mailId: string): Promise<string> {
  const [mail] = await patch(mailId, { status: "bezig", fout: null }, "&status=in.(nieuw,mislukt)");
  if (!mail) return "al in behandeling";

  try {
    const [agent] = await haal<{
      id: string;
      name: string;
      status: string;
      tone: string | null;
      extra_instructions: string | null;
      model: string | null;
      client_id: string;
    }>(
      `agents?select=id,name,status,tone,extra_instructions,model,client_id&id=eq.${mail.agent_id}`,
    );
    if (!agent) throw new Error("Agent niet gevonden");

    // Automatische post (bevestigingsmail bij het instellen van doorsturen,
    // bounces, nieuwsbrieven) tonen we wel, want soms staat er iets in wat de
    // klant nodig heeft, zoals de bevestigingscode van Gmail. Maar niet
    // beantwoorden: dat kost een gesprek uit de fair use, en een antwoord aan
    // een no-reply-adres komt nergens aan.
    if (isAutomatischeAfzender(mail.van_email)) {
      await patch(mailId, {
        status: "mens_nodig",
        toelichting:
          "Automatisch bericht van een no-reply-adres. Niet beantwoord; bekijk het en handel het zelf af.",
      });
      return "automatisch";
    }

    if (agent.status === "paused") {
      await patch(mailId, { status: "nieuw", toelichting: "De agent stond op pauze." });
      return "gepauzeerd";
    }

    const [inst] = await haal<Instellingen>(
      `support_instellingen?select=modus,afzender_naam,afzender_email,ondertekening&agent_id=eq.${mail.agent_id}`,
    );
    const [klant] = await haal<{ name: string; email: string }>(
      `profiles?select=name,email&id=eq.${agent.client_id}`,
    );
    const kennis = await haal<{ category: string; title: string; content: string }>(
      `knowledge_items?select=category,title,content&agent_id=eq.${mail.agent_id}&is_active=eq.true&order=category,sort_order`,
    );

    const bedrijfsnaam = inst?.afzender_naam || klant?.name || agent.name;
    const concept = await stelSupportAntwoordOp({
      bedrijfsnaam,
      ondertekening: inst?.ondertekening || `Met vriendelijke groet,\n${bedrijfsnaam}`,
      toon: agent.tone,
      extraInstructies: agent.extra_instructions,
      kennis,
      mail: { vanNaam: mail.van_naam, onderwerp: mail.onderwerp, tekst: mail.vraag },
      model: agent.model,
    });

    await telVerbruik(mail.agent_id, concept.verbruik);

    const velden = {
      concept_onderwerp: concept.onderwerp,
      concept_tekst: concept.tekst,
      bronnen: concept.bronnen,
      zekerheid: concept.zekerheid,
      toelichting: concept.toelichting || null,
    };

    if (!concept.beantwoordbaar) {
      await patch(mailId, { ...velden, status: "mens_nodig" });
      return "mens_nodig";
    }

    const magZelf =
      inst?.modus === "direct" &&
      concept.zekerheid === "hoog" &&
      agent.status === "live" &&
      !!inst.afzender_email;

    if (!magZelf) {
      await patch(mailId, { ...velden, status: "concept" });
      return "concept";
    }

    await patch(mailId, { ...velden, status: "concept" });
    try {
      await verstuurSupportAntwoord(mailId, {
        onderwerp: concept.onderwerp,
        tekst: concept.tekst,
        door: null,
      });
      return "verzonden";
    } catch (e) {
      // Het concept is er; alleen het versturen lukte niet. Dan hoort het bij
      // de klant te liggen als concept, met de reden erbij, en niet als een
      // mislukte mail zonder antwoord.
      const fout = e instanceof Error ? e.message : "Versturen mislukt";
      await patch(mailId, {
        status: "concept",
        fout: `Automatisch versturen lukte niet: ${fout}`.slice(0, 500),
      });
      return "concept";
    }
  } catch (e) {
    const fout = e instanceof Error ? e.message : "Onbekende fout";
    await patch(mailId, { status: "mislukt", fout: fout.slice(0, 500) }).catch(() => {});
    return "mislukt";
  }
}

const AUTOMATISCH =
  /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|bounce[s]?|notifications?|forwarding-noreply)([+._-].*)?@/i;

/** Een adres waar geen mens achter zit en waar een antwoord nergens aankomt. */
export function isAutomatischeAfzender(adres: string): boolean {
  return AUTOMATISCH.test(adres.trim());
}

/** Telt de mail mee voor de fair use, zoals een gesprek met de chat-assistent. */
async function telVerbruik(agentId: string, v: { input: number; output: number; cache: number }) {
  const d = db();
  try {
    await fetch(`${d.url}/rest/v1/rpc/claim_agent_request`, {
      method: "POST",
      headers: d.headers,
      body: JSON.stringify({ _agent_id: agentId }),
    });
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
    // Een telfout mag geen klantantwoord tegenhouden.
    console.warn("support: verbruik tellen mislukt", e);
  }
}

/**
 * Verstuurt het antwoord vanaf het supportadres van de klant, als antwoord op
 * de oorspronkelijke mail, zodat het in dezelfde draad terechtkomt.
 *
 * door: wie op versturen drukte, of null als de agent het zelf deed. Dat
 * onderscheid is de hele meting van vertrouwen in het portaal.
 */
export async function verstuurSupportAntwoord(
  mailId: string,
  a: { onderwerp: string; tekst: string; door: string | null },
) {
  const [voor] = await haal<Mail>(`support_mails?select=*&id=eq.${mailId}`);
  if (!voor) throw new Error("Deze mail bestaat niet.");
  if (voor.status === "verzonden") throw new Error("Deze mail is al beantwoord.");

  // Eerst claimen. Twee keer snel op versturen drukken, of versturen terwijl de
  // agent zelf verstuurt, mag geen twee mails opleveren.
  const [mail] = await patch(
    mailId,
    { status: "bezig" },
    "&status=in.(concept,mens_nodig,mislukt,nieuw,zelf)",
  );
  if (!mail) throw new Error("Deze mail wordt al verstuurd of is al beantwoord.");
  const terug = () => patch(mailId, { status: voor.status }).catch(() => {});

  const [inst] = await haal<Instellingen>(
    `support_instellingen?select=modus,afzender_naam,afzender_email,ondertekening&agent_id=eq.${mail.agent_id}`,
  );
  if (!inst?.afzender_email) {
    await terug();
    throw new Error("Vul eerst bij de instellingen het adres in waarvandaan de agent antwoordt.");
  }

  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel) {
    await terug();
    throw new Error("RESEND_API_KEY ontbreekt op de server.");
  }

  const headers: Record<string, string> = {};
  if (mail.message_id) {
    headers["In-Reply-To"] = mail.message_id;
    headers["References"] = mail.message_id;
  }

  let res: Response;
  try {
    res = await fetch(`${RESEND}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: inst.afzender_naam
          ? `${inst.afzender_naam} <${inst.afzender_email}>`
          : inst.afzender_email,
        to: [mail.van_email],
        reply_to: inst.afzender_email,
        subject: a.onderwerp,
        text: a.tekst,
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

  await patch(mailId, {
    status: "verzonden",
    verzonden_onderwerp: a.onderwerp,
    verzonden_tekst: a.tekst,
    verzonden_op: new Date().toISOString(),
    verzonden_door: a.door,
    fout: null,
  });
}
