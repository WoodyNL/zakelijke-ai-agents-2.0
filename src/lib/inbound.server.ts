import { controleerHandtekening } from "@/lib/webhook-handtekening";
import { eersteEmail } from "@/lib/contactimport";

/**
 * Binnenkomende antwoorden van klanten.
 *
 * De agent verstuurt vanaf het eigen adres van de klant, maar die postbus staat
 * bij zijn eigen provider en deze site draait zonder vaste server. Antwoorden
 * bereiken ons daarom via een omweg: de klant stuurt een kopie door naar een
 * ontvangstadres bij Resend, en Resend meldt elk bericht hier.
 *
 * Twee dingen zijn bij dit soort eindpunten belangrijker dan de rest.
 *
 * Wat we teruggeven bepaalt of het opnieuw wordt aangeboden. Een 2xx betekent
 * "verwerkt, niet meer sturen" en een 5xx betekent "probeer straks nog eens".
 * Een bericht dat we bewust negeren moet dus 2xx krijgen, anders blijft het
 * eindeloos terugkomen; een database die even weg is moet 5xx krijgen, anders
 * is het antwoord voorgoed weg.
 *
 * En de tekst van de mail zit niet in de melding. Resend stuurt alleen de
 * gegevens erover; de inhoud moet apart worden opgehaald. Lukt dat niet, dan
 * bewaren we het antwoord alsnog met afzender en onderwerp. Een half bericht
 * waar iemand naar kan kijken is oneindig veel beter dan een verloren bericht.
 */

type InboundGegevens = {
  email_id?: string;
  /** Bij meldingen over uitgaande post: het id dat wij bij verzenden kregen. */
  id?: string;
  from?: string;
  to?: string[];
  received_for?: string[];
  subject?: string;
};

function lokaalDeel(adres: string): string | null {
  const schoon = adres.trim().replace(/^.*</, "").replace(/>.*$/, "");
  const at = schoon.indexOf("@");
  return at > 0 ? schoon.slice(0, at).toLowerCase() : null;
}

function supabase(serviceRole = true) {
  const url = process.env["SUPABASE_URL"];
  const key = serviceRole
    ? process.env["SUPABASE_SERVICE_ROLE_KEY"]
    : process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

/** De tekst van de mail ophalen. Mislukt dit, dan gaan we zonder tekst verder. */
async function haalTekst(emailId: string): Promise<{ tekst: string; onderwerp?: string }> {
  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel) return { tekst: "" };
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${sleutel}` },
    });
    if (!res.ok) return { tekst: "" };
    const body = (await res.json()) as { text?: string | null; subject?: string };
    const uit: { tekst: string; onderwerp?: string } = { tekst: (body.text ?? "").slice(0, 20_000) };
    if (body.subject) uit.onderwerp = body.subject;
    return uit;
  } catch {
    return { tekst: "" };
  }
}

export async function verwerkInboundWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const geheim = process.env["RESEND_WEBHOOK_SECRET"];
  if (!geheim) {
    // Liever helemaal niets aannemen dan ongecontroleerd iets opslaan. Dit is
    // geen 5xx: opnieuw proberen lost een ontbrekende instelling niet op.
    console.error("RESEND_WEBHOOK_SECRET ontbreekt; webhook geweigerd.");
    return new Response("Not configured", { status: 503 });
  }

  const ruw = await request.text();
  const controle = await controleerHandtekening({
    geheim,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    handtekening: request.headers.get("svix-signature"),
    body: ruw,
  });
  if (!controle.ok) {
    console.warn("Webhook geweigerd:", controle.reden);
    return new Response("Invalid signature", { status: 401 });
  }

  let melding: { type?: string; data?: InboundGegevens };
  try {
    melding = JSON.parse(ruw) as typeof melding;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // Meldingen over uitgaande post: bevestiging dat een ingepland bericht
  // werkelijk is vertrokken, of dat het adres niet bestaat.
  //
  // Zonder deze melding weten we nooit of een ingepland bericht is verstuurd —
  // de planning ligt bij Resend, niet bij ons. En opvolgen mag alleen na een
  // bericht dat werkelijk weg is, anders krijgt iemand een herinnering aan post
  // die hij nooit heeft gehad.
  if (
    melding.type === "email.sent" ||
    melding.type === "email.delivered" ||
    melding.type === "email.bounced" ||
    melding.type === "email.complained"
  ) {
    const providerId = melding.data?.id ?? melding.data?.email_id;
    if (!providerId) return new Response("ok", { status: 200 });

    const db = supabase();
    if (!db) return new Response("Database unavailable", { status: 503 });

    if (melding.type === "email.bounced" || melding.type === "email.complained") {
      // Een klacht telt hier net zo zwaar als een bounce: wie op "dit is spam"
      // drukt, moet niets meer krijgen. Dat is geen beleefdheid maar het enige
      // wat het verzenddomein beschermt.
      const res = await fetch(`${db.url}/rest/v1/rpc/outbound_meld_bounce`, {
        method: "POST",
        headers: db.headers,
        body: JSON.stringify({
          _provider_id: providerId,
          _reden: melding.type === "email.complained" ? "gemeld als spam" : "adres bestaat niet",
        }),
      });
      if (!res.ok) return new Response("Bounce failed", { status: 503 });
      return new Response("ok", { status: 200 });
    }

    // Verzonden: alleen bijwerken wat nog niet verstuurd was. Een bericht dat
    // al is beantwoord mag niet terugvallen naar 'verzonden'.
    const res = await fetch(
      `${db.url}/rest/v1/outbound_messages?provider_id=eq.${encodeURIComponent(providerId)}&status=eq.gepland`,
      {
        method: "PATCH",
        headers: { ...db.headers, Prefer: "return=minimal" },
        body: JSON.stringify({ status: "verzonden", verzonden_op: new Date().toISOString() }),
      },
    );
    if (!res.ok) return new Response("Update failed", { status: 503 });
    return new Response("ok", { status: 200 });
  }

  // Alles wat we verder niet verwerken krijgt 2xx, anders blijft het terugkomen.
  if (melding.type !== "email.received") return new Response("ok", { status: 200 });

  const d = melding.data ?? {};
  const emailId = d.email_id;
  const van = eersteEmail(d.from ?? "");
  if (!emailId || !van) {
    console.warn("Inbound zonder id of afzender; overgeslagen.");
    return new Response("ok", { status: 200 });
  }

  const db = supabase();
  if (!db) {
    // Dit is wél tijdelijk op te lossen, dus 5xx zodat Resend het opnieuw biedt.
    console.error("Supabase-instellingen ontbreken op de server.");
    return new Response("Database unavailable", { status: 503 });
  }

  // Bij welke klant hoort dit? Het ontvangstadres zegt het, en dat is
  // betrouwbaarder dan de afzender: mensen schrijven geregeld terug vanaf een
  // ander adres dan waar de mail heen ging.
  const ontvangers = [...(d.received_for ?? []), ...(d.to ?? [])];
  const locals = [...new Set(ontvangers.map(lokaalDeel).filter((x): x is string => x !== null))];

  let agentId: string | null = null;
  for (const local of locals) {
    const res = await fetch(
      `${db.url}/rest/v1/agents?select=id&inbound_local=eq.${encodeURIComponent(local)}&limit=1`,
      { headers: db.headers },
    );
    if (!res.ok) return new Response("Lookup failed", { status: 503 });
    const rijen = (await res.json()) as Array<{ id: string }>;
    if (rijen[0]) {
      agentId = rijen[0].id;
      break;
    }
  }

  if (!agentId) {
    // Post op een adres dat bij niemand hoort. Niets aan te doen en niets aan
    // te verwijten; niet opnieuw aanbieden.
    console.warn("Inbound voor onbekend ontvangstadres:", locals.join(", "));
    return new Response("ok", { status: 200 });
  }

  // Het contact erbij zoeken. Vinden we niets, dan slaan we het antwoord
  // alsnog op zonder koppeling: dan kijkt er een mens naar.
  let contactId: string | null = null;
  const cRes = await fetch(
    `${db.url}/rest/v1/outbound_contacts?select=id&agent_id=eq.${agentId}&email=eq.${encodeURIComponent(van)}&limit=1`,
    { headers: db.headers },
  );
  if (cRes.ok) {
    const rijen = (await cRes.json()) as Array<{ id: string }>;
    contactId = rijen[0]?.id ?? null;
  }

  const inhoud = await haalTekst(emailId);

  const rij = {
    agent_id: agentId,
    contact_id: contactId,
    van_email: van,
    onderwerp: inhoud.onderwerp ?? d.subject ?? null,
    tekst: inhoud.tekst,
    provider_id: emailId,
  };

  const opslaan = await fetch(`${db.url}/rest/v1/outbound_replies`, {
    method: "POST",
    headers: { ...db.headers, Prefer: "return=minimal" },
    body: JSON.stringify(rij),
  });

  // 409 betekent dat dit antwoord er al staat. Dat is precies waar de unieke
  // index voor is: een webhook die opnieuw wordt aangeboden mag niet leiden tot
  // twee antwoorden en twee reacties.
  if (opslaan.status === 409) return new Response("ok", { status: 200 });

  if (!opslaan.ok) {
    console.error("Antwoord opslaan mislukt:", opslaan.status, await opslaan.text());
    return new Response("Storage failed", { status: 503 });
  }

  // Wie heeft geantwoord, krijgt geen herinnering meer die al klaarstond. Die
  // ligt ingepland bij Resend en moet daar actief worden weggehaald.
  //
  // Dit mag de afhandeling niet laten struikelen: het antwoord is al bewaard,
  // en een 5xx hierna zou de hele melding opnieuw laten aanbieden — met een
  // dubbel antwoord tot gevolg als de unieke index er ooit naast zit. Lukt het
  // intrekken niet, dan is dat een vervelende mail, geen verloren gegeven.
  if (contactId) {
    try {
      const { trekOpvolgingIn } = await import("@/lib/verzenden.server");
      const aantal = await trekOpvolgingIn(contactId);
      if (aantal > 0) console.info(`Opvolging ingetrokken voor contact ${contactId}: ${aantal}`);
    } catch (e) {
      console.error("Opvolging intrekken mislukt:", e);
    }
  }

  return new Response("ok", { status: 200 });
}
