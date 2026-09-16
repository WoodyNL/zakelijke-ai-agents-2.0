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

const RESEND = "https://api.resend.com";

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
 * Verdeelt berichten over dagen volgens het dagmaximum.
 *
 * Een vers verzenddomein dat op dag één honderd mails wegstuurt, valt op bij
 * spamfilters en krijgt dat nauwelijks meer terug. Deze functie is dus geen
 * netheid maar de rem die dat voorkomt.
 *
 * De verzendtijden liggen binnen kantooruren en lopen per bericht een paar
 * minuten uit elkaar. Honderd mails op precies hetzelfde tijdstip is een
 * patroon dat een mens nooit maakt.
 */
export function verdeelOverDagen(
  aantal: number,
  perDag: number,
  vanaf: Date,
  beginUur = 9,
): Date[] {
  const uit: Date[] = [];
  const max = Math.max(perDag, 1);
  const stapMinuten = Math.max(Math.floor((8 * 60) / max), 3);

  // Werkdagen vooruit lopen in plaats van een datum uitrekenen en daarna het
  // weekend overslaan. Die eerste aanpak lijkt hetzelfde maar is het niet: een
  // zaterdag en een zondag schuiven dan allebei naar dezelfde maandag, en dan
  // staan er drie dagen berichten op één dag. Precies de piek die het
  // dagmaximum moest voorkomen.
  const dag = new Date(vanaf);
  dag.setHours(beginUur, 0, 0, 0);
  const naarWerkdag = (d: Date) => {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  };
  naarWerkdag(dag);

  let opDezeDag = 0;
  for (let i = 0; i < aantal; i++) {
    if (opDezeDag === max) {
      dag.setDate(dag.getDate() + 1);
      naarWerkdag(dag);
      dag.setHours(beginUur, 0, 0, 0);
      opDezeDag = 0;
    }

    const moment = new Date(dag);
    moment.setMinutes(moment.getMinutes() + opDezeDag * stapMinuten);
    opDezeDag++;

    // Nooit in het verleden inplannen; Resend weigert dat en dan valt er één uit.
    uit.push(moment.getTime() < Date.now() ? new Date(Date.now() + 60_000) : moment);
  }
  return uit;
}

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
  const lichaam: Record<string, unknown> = {
    from: `${afzender.naam} <${afzender.email}>`,
    to: [bericht.naar],
    reply_to: afzender.antwoordNaar,
    subject: bericht.onderwerp,
    text: bericht.tekst,
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
