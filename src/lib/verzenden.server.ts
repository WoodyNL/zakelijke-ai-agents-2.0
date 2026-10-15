/**
 * Berichten inplannen, versturen en weer intrekken.
 *
 * Deze site draait zonder vaste server en zonder klok. Toch moet een campagne
 * verspreid over dagen weggaan, en moet een opvolging een week later komen —
 * maar alléén als er niet is geantwoord. Dat lijkt werk voor een draaiend
 * proces.
 *
 * Het kan zonder, omdat Resend berichten tot dertig dagen vooruit kan
 * inplannen en een ingepland bericht weer kan annuleren. De volgorde wordt
 * daarmee omgedraaid: in plaats van elke dag te kijken wat er weg moet, plannen
 * we alles vooruit en halen we weg wat niet meer nodig is.
 *
 * Dat heeft een gevolg dat je moet kennen. Een ingepland bericht ligt bij
 * Resend, niet bij ons. Raakt onze database en die planning uit de pas, dan
 * gaat er post uit waar wij niets meer van weten. Daarom bewaren we bij elk
 * bericht het id dat Resend teruggeeft: zonder dat id kunnen we het niet meer
 * tegenhouden.
 */

import { type Venster } from "@/lib/verzendvenster";

/**
 * Doorgegeven, niet opnieuw opgeschreven.
 *
 * Deze twee stonden hier omdat ze hier gebruikt werden, maar het is pure
 * rekenkunde op data zonder netwerk of sleutel. Zolang ze in een .server.ts
 * stonden, kon de test ze niet meer laden zodra dit bestand iets met een
 * alias importeerde — en dat is precies wat er gebeurde: de test op het
 * dagmaximum crashte drie dagen stil in plaats van een uitslag te geven.
 *
 * De aanroepers blijven ze hier vandaan halen; wie ze wil testen, haalt ze uit
 * verzendvenster.
 */
export { verdeelOverDagen, opvolgmoment } from "@/lib/verzendvenster";

const RESEND = "https://api.resend.com";

/**
 * Waar iemand landt die zich wil afmelden.
 *
 * Hardgecodeerd en niet uit een instelling: dit adres moet werken voor iemand
 * die het over een half jaar aanklikt, ook als er intussen van alles is
 * veranderd. Een afmeldlink die naar niets wijst is erger dan geen link.
 */
const AFMELDBASIS = "https://zakelijkeaiagents.nl/afmelden";

/**
 * De afmeldregel onder een bericht.
 *
 * Twee dingen tegelijk. De zichtbare regel is wettelijk verplicht bij
 * commerciele e-mail, en de kopregel List-Unsubscribe zorgt dat er in Gmail en
 * Outlook een eigen afmeldknop boven de mail verschijnt.
 *
 * Die tweede is geen extraatje. Wie geen knop ziet en toch van de lijst af wil,
 * drukt op "dit is spam" — en dat beschadigt het verzenddomein veel harder dan
 * een afmelding. De makkelijkste uitweg bieden is dus in je eigen belang.
 */
function afmeldregel(sleutel: string): string {
  return `\n\n—\nWil je geen post meer van ons? Meld je af via ${AFMELDBASIS}?s=${sleutel}`;
}

function sleutel(): string {
  const k = process.env["RESEND_API_KEY"];
  if (!k) throw new Error("RESEND_API_KEY ontbreekt op de server.");
  return k;
}

function db() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase-instellingen ontbreken op de server.");
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

export type TePlannen = {
  berichtId: string;
  naar: string;
  onderwerp: string;
  tekst: string;
  /** De afmeldsleutel van dit contact; zonder gaat er geen bericht weg. */
  afmeldsleutel: string;
  /** Wanneer het weg mag. Leeg betekent: meteen. */
  wanneer?: Date;
};

export type Afzender = {
  naam: string;
  email: string;
  /** Waar antwoorden heen gaan; bij ons het getagde adres van de klant zelf. */
  antwoordNaar: string;
};


/**
 * Zet één bericht klaar bij Resend en onthoudt het id.
 *
 * Eerst versturen, dan pas vastleggen zou betekenen dat een mislukte opslag een
 * al verstuurde mail onzichtbaar maakt. Daarom slaan we het id meteen na het
 * antwoord van Resend op, en laat een mislukking daar een duidelijk spoor na.
 */
export async function planBericht(
  bericht: TePlannen,
  afzender: Afzender,
): Promise<{ ok: true; providerId: string } | { ok: false; fout: string }> {
  // De afmeldlink wordt hier toegevoegd en niet bij het opstellen, zodat er
  // geen bericht kan bestaan dat wél is verstuurd maar géén uitweg bood.
  const afmeldlink = `${AFMELDBASIS}?s=${bericht.afmeldsleutel}`;

  const lichaam: Record<string, unknown> = {
    from: `${afzender.naam} <${afzender.email}>`,
    to: [bericht.naar],
    reply_to: afzender.antwoordNaar,
    subject: bericht.onderwerp,
    text: bericht.tekst + afmeldregel(bericht.afmeldsleutel),
    headers: {
      "List-Unsubscribe": `<${afmeldlink}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
  if (bericht.wanneer) lichaam["scheduled_at"] = bericht.wanneer.toISOString();

  let res: Response;
  try {
    res = await fetch(`${RESEND}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel()}`, "Content-Type": "application/json" },
      body: JSON.stringify(lichaam),
    });
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : "Versturen mislukt." };
  }

  const antwoord = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !antwoord.id) {
    return { ok: false, fout: antwoord.message ?? `Resend gaf ${res.status}` };
  }

  const d = db();
  await fetch(`${d.url}/rest/v1/outbound_messages?id=eq.${bericht.berichtId}`, {
    method: "PATCH",
    headers: { ...d.headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      provider_id: antwoord.id,
      status: bericht.wanneer ? "gepland" : "verzonden",
      gepland_voor: bericht.wanneer?.toISOString() ?? null,
      verzonden_op: bericht.wanneer ? null : new Date().toISOString(),
    }),
  });

  return { ok: true, providerId: antwoord.id };
}

/**
 * Haalt de nog niet verstuurde opvolging weg zodra iemand heeft geantwoord.
 *
 * Dit is de reden dat vooruit plannen werkt. Wie terugschrijft, hoort geen
 * herinnering meer te krijgen die al klaarstaat — dat is de irritatie waar
 * mensen zich af melden, en het is precies wat er gebeurt als niemand ingrijpt.
 *
 * Mislukt het annuleren bij Resend, dan laten we de status op 'gepland' staan.
 * Doen alsof het is ingetrokken terwijl de mail toch vertrekt, is erger dan het
 * eerlijk laten staan.
 */
export async function trekOpvolgingIn(contactId: string): Promise<number> {
  const d = db();
  const res = await fetch(
    `${d.url}/rest/v1/outbound_messages?select=id,provider_id&contact_id=eq.${contactId}&status=eq.gepland`,
    { headers: d.headers },
  );
  if (!res.ok) return 0;

  const rijen = (await res.json()) as Array<{ id: string; provider_id: string | null }>;
  let ingetrokken = 0;

  for (const r of rijen) {
    if (!r.provider_id) continue;
    const annuleer = await fetch(`${RESEND}/emails/${r.provider_id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel()}` },
    });
    if (!annuleer.ok) {
      console.warn(`Opvolging ${r.id} kon niet worden ingetrokken: ${annuleer.status}`);
      continue;
    }
    await fetch(`${d.url}/rest/v1/outbound_messages?id=eq.${r.id}`, {
      method: "PATCH",
      headers: { ...d.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "mislukt", fout: "ingetrokken: contact had geantwoord" }),
    });
    ingetrokken++;
  }
  return ingetrokken;
}

/**
 * Trekt alles in wat voor deze agent bij Resend klaarstaat. Voor de pauzeknop.
 *
 * Een e-mailagent pauzeren zonder dit zou niets doen: de berichten staan dan
 * al ingepland bij Resend en gaan gewoon de deur uit. Wie op pauze drukt,
 * verwacht dat er niets meer vertrekt.
 *
 * Wat niet kon worden ingetrokken blijft op 'gepland' staan en wordt geteld,
 * zodat het scherm eerlijk kan zeggen dat er nog iets onderweg is.
 */
export async function trekGeplandeBerichtenIn(
  agentId: string,
  /** Alleen deze campagne; zonder dit alles wat van de agent openstaat. */
  campagneId?: string,
): Promise<{ ingetrokken: number; nietGelukt: number }> {
  const d = db();
  const res = await fetch(
    `${d.url}/rest/v1/outbound_messages?select=id,provider_id&agent_id=eq.${agentId}&status=eq.gepland` +
      (campagneId ? `&campaign_id=eq.${campagneId}` : ""),
    { headers: d.headers },
  );
  if (!res.ok) throw new Error(`Ingeplande berichten ophalen mislukt [${res.status}]`);

  const rijen = (await res.json()) as Array<{ id: string; provider_id: string | null }>;
  let ingetrokken = 0;
  let nietGelukt = 0;

  for (const r of rijen) {
    if (!r.provider_id) {
      nietGelukt++;
      continue;
    }
    const annuleer = await fetch(`${RESEND}/emails/${r.provider_id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel()}` },
    });
    if (!annuleer.ok) {
      console.warn(`Bericht ${r.id} kon niet worden ingetrokken: ${annuleer.status}`);
      nietGelukt++;
      continue;
    }
    await fetch(`${d.url}/rest/v1/outbound_messages?id=eq.${r.id}`, {
      method: "PATCH",
      headers: { ...d.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "mislukt", fout: "ingetrokken: agent gepauzeerd" }),
    });
    ingetrokken++;
  }
  return { ingetrokken, nietGelukt };
}
