import { controleerHandtekening } from "@/lib/webhook-handtekening";
import { eersteEmail } from "@/lib/contactimport";
import type { Stopmelding } from "@/lib/bounces.server";

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
async function haalTekst(
  emailId: string,
): Promise<{
  tekst: string;
  onderwerp?: string;
  messageId?: string;
  /** In kleine letters, want afzenders schrijven ze allemaal anders. */
  kopregels: Record<string, string>;
}> {
  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel) return { tekst: "", kopregels: {} };
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${sleutel}` },
    });
    if (!res.ok) return { tekst: "", kopregels: {} };
    const body = (await res.json()) as {
      text?: string | null;
      subject?: string;
      message_id?: string;
      headers?: Record<string, string>;
    };
    // Alles in kleine letters: "Auto-Submitted", "auto-submitted" en
    // "AUTO-SUBMITTED" komen allemaal voor, en de regels die hierop beslissen
    // moeten niet van de schrijfwijze van de afzender afhangen.
    const kopregels: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.headers ?? {})) {
      kopregels[k.toLowerCase()] = String(v);
    }

    const uit: {
      tekst: string;
      onderwerp?: string;
      messageId?: string;
      kopregels: Record<string, string>;
    } = {
      tekst: (body.text ?? "").slice(0, 20_000),
      kopregels,
    };
    if (body.subject) uit.onderwerp = body.subject;
    // Nodig om een antwoord in dezelfde draad te laten landen (In-Reply-To).
    const messageId =
      body.message_id ?? body.headers?.["message-id"] ?? body.headers?.["Message-ID"];
    if (messageId) uit.messageId = messageId;
    return uit;
  } catch {
    return { tekst: "", kopregels: {} };
  }
}

export async function verwerkInboundWebhook(
  request: Request,
  /** Werk dat na het antwoord mag doorlopen (Cloudflare ctx.waitUntil). */
  naAfloop?: (werk: Promise<unknown>) => void,
): Promise<Response> {
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

      // De database beslist of dit een grens overschrijdt. Zo ja, dan is er
      // post in te trekken en moet de klant het weten. Dat mag na het antwoord
      // aan Resend: die wil binnen een paar seconden een 200 zien.
      const stops = (await res.json()) as Stopmelding[];
      for (const stop of stops ?? []) {
        const werk = (async () => {
          const { verwerkStopmelding } = await import("@/lib/bounces.server");
          await verwerkStopmelding(stop);
        })();
        if (naAfloop) naAfloop(werk);
        else await werk;
      }
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
  let agentSoort: string | null = null;
  for (const local of locals) {
    const res = await fetch(
      `${db.url}/rest/v1/agents?select=id,kind&inbound_local=eq.${encodeURIComponent(local)}&limit=1`,
      { headers: db.headers },
    );
    if (!res.ok) return new Response("Lookup failed", { status: 503 });
    const rijen = (await res.json()) as Array<{ id: string; kind: string }>;
    if (rijen[0]) {
      agentId = rijen[0].id;
      agentSoort = rijen[0].kind;
      break;
    }
  }

  if (!agentId) {
    // Post op een adres dat bij niemand hoort. Niets aan te doen en niets aan
    // te verwijten; niet opnieuw aanbieden.
    console.warn("Inbound voor onbekend ontvangstadres:", locals.join(", "));
    return new Response("ok", { status: 200 });
  }

  // Een inbox-assistent krijgt geen antwoorden op een campagne maar
  // supportmail: een vraag van een klant van de klant, die beantwoord moet
  // worden. Eerst vastleggen (lukt dat niet, dan 5xx zodat Resend het opnieuw
  // biedt), dan pas opstellen. Het opstellen duurt seconden en mag na het
  // antwoord aan Resend doorlopen; mislukt het, dan staat de mail als
  // 'mislukt' in het portaal met een knop om het opnieuw te proberen.
  if (agentSoort === "inbox_draft") {
    const inhoud = await haalTekst(emailId);
    const support = await import("@/lib/support.server");
    let mailId: string | null;
    try {
      mailId = await support.ontvangSupportMail({
        agentId,
        providerId: emailId,
        messageId: inhoud.messageId ?? null,
        vanEmail: van,
        vanNaam:
          (d.from ?? "")
            .replace(/<[^>]*>/, "")
            .replace(/"/g, "")
            .trim() || null,
        onderwerp: inhoud.onderwerp ?? d.subject ?? null,
        vraag: inhoud.tekst,
      });
    } catch (e) {
      console.error("Supportmail opslaan mislukt:", e);
      return new Response("Storage failed", { status: 503 });
    }
    if (mailId) {
      const werk = support.verwerkSupportMail(mailId).catch((e) => {
        console.error("Supportmail verwerken mislukt:", e);
      });
      if (naAfloop) naAfloop(werk);
      else await werk;
    }
    return new Response("ok", { status: 200 });
  }

  // Een sales-assistent krijgt leads: beoordelen en een eerste antwoord
  // klaarzetten, zelfde patroon als offertes.
  if (agentSoort === "sales_assistent") {
    const inhoud = await haalTekst(emailId);
    const sales = await import("@/lib/sales.server");
    let leadId: string | null;
    try {
      leadId = await sales.ontvangLead({
        agentId,
        providerId: `mail:${emailId}`,
        bron: "mail",
        naam:
          (d.from ?? "")
            .replace(/<[^>]*>/, "")
            .replace(/"/g, "")
            .trim() || null,
        email: van,
        bericht: [inhoud.onderwerp ?? d.subject ?? "", inhoud.tekst].filter(Boolean).join("\n\n"),
        messageId: inhoud.messageId ?? null,
      });
    } catch (e) {
      console.error("Lead opslaan mislukt:", e);
      return new Response("Storage failed", { status: 503 });
    }
    if (leadId) {
      const werk = sales
        .verwerkLead(leadId)
        .catch((e) => console.error("Lead verwerken mislukt:", e));
      if (naAfloop) naAfloop(werk);
      else await werk;
    }
    return new Response("ok", { status: 200 });
  }

  // Een afsprakenagent krijgt antwoorden op herinneringen: ja, verzetten,
  // afzeggen. De agent legt het vast en de ondernemer hoort alles behalve ja.
  if (agentSoort === "afspraken") {
    const inhoud = await haalTekst(emailId);
    const { verwerkAntwoordOpAfspraak } = await import("@/lib/afspraken.server");
    const werk = verwerkAntwoordOpAfspraak(agentId, van, inhoud.tekst).catch((e) => {
      console.error("Antwoord op afspraak verwerken mislukt:", e);
    });
    if (naAfloop) naAfloop(werk);
    else await werk;
    return new Response("ok", { status: 200 });
  }

  // Een betaalherinnering-agent krijgt antwoorden van debiteuren: de reeks
  // pauzeert en de klant hoort het. Niets opstellen, niets terugsturen.
  if (agentSoort === "betaalherinnering") {
    const inhoud = await haalTekst(emailId);
    const { verwerkReactie } = await import("@/lib/herinneringen.server");
    const werk = verwerkReactie(
      agentId,
      van,
      inhoud.onderwerp ?? d.subject ?? null,
      inhoud.tekst,
    ).catch((e) => {
      console.error("Reactie op herinnering verwerken mislukt:", e);
    });
    if (naAfloop) naAfloop(werk);
    else await werk;
    return new Response("ok", { status: 200 });
  }

  // Een offerte-agent krijgt aanvragen. Zelfde patroon als supportmail: eerst
  // vastleggen (lukt dat niet, dan 5xx zodat Resend het opnieuw biedt), dan
  // opstellen na het antwoord aan Resend.
  if (agentSoort === "offerte") {
    const inhoud = await haalTekst(emailId);
    const offerte = await import("@/lib/offerte.server");
    let aanvraagId: string | null;
    try {
      aanvraagId = await offerte.ontvangAanvraag({
        agentId,
        providerId: emailId,
        messageId: inhoud.messageId ?? null,
        vanEmail: van,
        vanNaam:
          (d.from ?? "")
            .replace(/<[^>]*>/, "")
            .replace(/"/g, "")
            .trim() || null,
        onderwerp: inhoud.onderwerp ?? d.subject ?? null,
        vraag: inhoud.tekst,
      });
    } catch (e) {
      console.error("Offerteaanvraag opslaan mislukt:", e);
      return new Response("Storage failed", { status: 503 });
    }
    if (aanvraagId) {
      const werk = offerte.verwerkAanvraag(aanvraagId).catch((e) => {
        console.error("Offerteaanvraag verwerken mislukt:", e);
      });
      if (naAfloop) naAfloop(werk);
      else await werk;
    }
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
    // De id komt terug omdat de agent hem nodig heeft: zijn antwoord wordt
    // aan dít binnengekomen bericht gekoppeld, en op die koppeling ligt de
    // unieke index die een tweede antwoord onmogelijk maakt.
    headers: { ...db.headers, Prefer: "return=representation" },
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

  const [bewaard] = (await opslaan.json().catch(() => [])) as Array<{ id?: string }>;
  const replyId = bewaard?.id ?? null;

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

    // Staat er een bezorging open waar we naar hebben gevraagd, dan zit het
    // antwoord op die vraag in deze mail. Dat is de enige plek waar een model
    // iets wijzigt waar een mens naar handelt — de chauffeur rijdt ernaartoe —
    // dus mag het alleen iets doen als het zeker is, en wordt het oude adres
    // bewaard.
    //
    // Om dezelfde reden als hierboven mag dit de afhandeling niet laten
    // struikelen: het antwoord is bewaard, en dat is het gegeven dat telt.
    try {
      const { verwerkBevestigingsAntwoord } = await import("@/lib/bezorgbevestiging.server");
      const stand = await verwerkBevestigingsAntwoord(agentId, contactId, inhoud.tekst);
      if (stand) console.info(`Bevestiging voor contact ${contactId}: ${stand}`);
    } catch (e) {
      console.error("Bevestiging verwerken mislukt:", e);
    }
  }

  /**
   * En dan het antwoord zelf.
   *
   * Dit staat als laatste met opzet. Alles ervoor — het antwoord bewaren, de
   * opvolging intrekken, de bezorging bijwerken — moet gebeuren, ook als het
   * opstellen mislukt of het model traag is.
   *
   * Een fout hier mag de afhandeling niet laten struikelen. Het antwoord is
   * al opgeslagen en een mens ziet het op het antwoordenscherm; een 5xx zou de
   * hele melding opnieuw laten aanbieden en dan begint de verwerking van voren
   * af aan. Dat er geen tweede antwoord uitgaat is geborgd in de database, maar
   * de rest nog eens overdoen heeft geen zin.
   */
  if (replyId) {
    try {
      const { beantwoordReactie } = await import("@/lib/email-antwoord.server");
      const uit = await beantwoordReactie({
        agentId,
        replyId,
        contactId,
        tekst: inhoud.tekst,
        onderwerp: inhoud.onderwerp ?? d.subject ?? null,
        kopregels: inhoud.kopregels,
        messageId: inhoud.messageId ?? null,
      });
      console.info(
        `Antwoord op ${van}: ${uit.gedaan}${"reden" in uit ? ` (${uit.reden})` : ""}`,
      );
    } catch (e) {
      console.error("Automatisch antwoorden mislukt:", e);
    }
  }

  return new Response("ok", { status: 200 });
}
