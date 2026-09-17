import { stelBerichtOp, type KennisRegel } from "@/lib/bericht-opstellen.server";
import { opvolgmoment, planBericht, verdeelOverDagen } from "@/lib/verzenden.server";

/**
 * Een campagne klaarzetten en verzenden.
 *
 * Dit is het enige stuk in het platform dat uit zichzelf post de deur uit doet,
 * dus het is opgeknipt in twee handelingen die allebei door een mens worden
 * gestart: eerst klaarzetten, dan verzenden. Daartussen kun je lezen wat er
 * staat.
 *
 * Klaarzetten gebeurt in porties. Honderdzevenendertig berichten opstellen in
 * één verzoek zou minutenlang duren en bij een storing halverwege een
 * onduidelijke toestand achterlaten. Per portie van tien is elk verzoek kort,
 * is de uitkomst na elke portie compleet, en kun je na de eerste tien besluiten
 * dat de toon nog niet klopt.
 *
 * Wat hier met opzet níét gebeurt, is controleren of een contact zich heeft
 * afgemeld. Dat doet de database, met een trigger die ook een verzoek van de
 * server tegenhoudt. Die controle hier herhalen zou hem twee plekken geven
 * waar hij kan verouderen.
 */

type Db = { url: string; headers: Record<string, string> };

function db(): Db {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase-instellingen ontbreken op de server.");
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

async function haal<T>(d: Db, pad: string): Promise<T[]> {
  const res = await fetch(`${d.url}/rest/v1/${pad}`, { headers: d.headers });
  if (!res.ok) throw new Error(`Ophalen mislukt [${res.status}]: ${await res.text()}`);
  return (await res.json()) as T[];
}

export type Campagne = {
  id: string;
  agent_id: string;
  naam: string;
  herkomst: "oud_klant" | "koud";
  verzendwijze: "concept" | "direct";
  doelgroep?: "alles" | "binnen_gebied" | "buiten_gebied";
  afzender_naam: string | null;
  afzender_email: string | null;
  antwoord_naar: string | null;
  aanbod: string | null;
  ondertekening: string | null;
  dagmaximum: number;
  actief: boolean;
};

export type Voorbereiding = {
  klaargezet: number;
  overgeslagen: Array<{ email: string; reden: string }>;
  resterend: number;
};

/**
 * Stelt voor een portie contacten een eerste bericht op en bewaart het als
 * concept. Er wordt niets verstuurd en niets ingepland.
 */
export async function bereidVoor(campagneId: string, portie = 10): Promise<Voorbereiding> {
  const d = db();

  const [campagne] = await haal<Campagne>(d, `outbound_campaigns?id=eq.${campagneId}`);
  if (!campagne) throw new Error("Deze campagne bestaat niet.");
  if (!campagne.aanbod || !campagne.ondertekening) {
    throw new Error("Vul eerst het aanbod en de ondertekening in bij de campagne.");
  }

  const kennis = await haal<KennisRegel>(
    d,
    `knowledge_items?select=category,title,content&agent_id=eq.${campagne.agent_id}&is_active=eq.true&order=sort_order`,
  );

  // Contacten van het juiste soort die nog geen enkel bericht hebben. De
  // database laat een tweede bericht voor stap 1 sowieso niet toe, maar zo
  // vragen we het model er ook niet voor niets om.
  const alVerstuurd = await haal<{ contact_id: string }>(
    d,
    `outbound_messages?select=contact_id&agent_id=eq.${campagne.agent_id}&stap=eq.1`,
  );
  const gehad = new Set(alVerstuurd.map((m) => m.contact_id));

  // Het filter op bezorggebied is geen netheid maar een belofte die je wel of
  // niet kunt waarmaken. "Onze chauffeur brengt vrijdag een proefpakket langs"
  // is naar iemand in Groningen een toezegging die niemand nakomt.
  //
  // Onbekend telt mee bij "binnen": iemand buitensluiten omdat er geen plaats
  // is ingevuld, is erger dan hem een bericht sturen dat misschien niet past.
  const gebiedsfilter =
    campagne.doelgroep === "binnen_gebied"
      ? "&or=(in_bezorggebied.is.true,in_bezorggebied.is.null)"
      : campagne.doelgroep === "buiten_gebied"
        ? "&in_bezorggebied=is.false"
        : "";

  const contacten = await haal<{
    id: string;
    email: string;
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    herkomst: string;
  }>(
    d,
    `outbound_contacts?select=id,email,naam,bedrijf,plaats,herkomst` +
      `&agent_id=eq.${campagne.agent_id}&herkomst=eq.${campagne.herkomst}` +
      `&afgemeld_op=is.null&bounce_op=is.null${gebiedsfilter}` +
      `&order=aangemaakt_op&limit=500`,
  );

  const teDoen = contacten.filter((c) => !gehad.has(c.id));
  const nu = teDoen.slice(0, portie);

  const overgeslagen: Voorbereiding["overgeslagen"] = [];
  let klaargezet = 0;

  for (const c of nu) {
    try {
      const concept = await stelBerichtOp({
        contact: {
          naam: c.naam ?? undefined,
          bedrijf: c.bedrijf ?? undefined,
          plaats: c.plaats ?? undefined,
          herkomst: c.herkomst as "oud_klant" | "koud",
        },
        kennis,
        bedrijfsnaam:
          campagne.afzender_naam ??
          campagne.ondertekening.split(",").pop()?.trim() ??
          campagne.ondertekening,
        ondertekening: campagne.ondertekening,
        aanbod: campagne.aanbod,
      });

      const res = await fetch(`${d.url}/rest/v1/outbound_messages`, {
        method: "POST",
        headers: { ...d.headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          agent_id: campagne.agent_id,
          campaign_id: campagne.id,
          contact_id: c.id,
          stap: 1,
          status: "concept",
          onderwerp: concept.onderwerp,
          tekst: concept.tekst,
        }),
      });

      if (!res.ok) {
        // 409 betekent dat er al een bericht voor deze stap staat. Dat is geen
        // storing maar precies waar die grendel voor is.
        const melding = res.status === 409 ? "had al een bericht" : await res.text();
        overgeslagen.push({ email: c.email, reden: melding.slice(0, 120) });
        continue;
      }
      klaargezet++;
    } catch (e) {
      overgeslagen.push({
        email: c.email,
        reden: e instanceof Error ? e.message.slice(0, 120) : "opstellen mislukt",
      });
    }
  }

  return { klaargezet, overgeslagen, resterend: Math.max(teDoen.length - nu.length, 0) };
}

export type Verzending = {
  ingepland: number;
  eerste?: string;
  laatste?: string;
  mislukt: Array<{ email: string; reden: string }>;
};

/**
 * Plant de klaarstaande concepten in bij Resend, verdeeld over werkdagen.
 *
 * Alles wordt vooruit ingepland en niet één voor één verstuurd. Dat is geen
 * gemak maar noodzaak: deze site draait zonder klok, dus er is niemand die
 * morgen de volgende tien wegstuurt. Resend bewaart de planning.
 */
export async function verstuurKlaarstaande(campagneId: string): Promise<Verzending> {
  const d = db();

  const [campagne] = await haal<Campagne>(d, `outbound_campaigns?id=eq.${campagneId}`);
  if (!campagne) throw new Error("Deze campagne bestaat niet.");
  if (!campagne.actief) throw new Error("Zet de campagne eerst op actief.");
  if (!campagne.afzender_email) throw new Error("Vul eerst het afzenderadres in.");
  if (!campagne.antwoord_naar) {
    throw new Error(
      "Vul eerst in waar antwoorden binnenkomen. Zonder dat adres ziet de agent geen enkel antwoord.",
    );
  }

  const concepten = await haal<{
    id: string;
    onderwerp: string;
    tekst: string;
    outbound_contacts: { email: string; afmeldsleutel: string } | null;
  }>(
    d,
    `outbound_messages?select=id,onderwerp,tekst,outbound_contacts(email,afmeldsleutel)` +
      `&campaign_id=eq.${campagneId}&status=eq.concept&order=aangemaakt_op`,
  );

  if (concepten.length === 0) return { ingepland: 0, mislukt: [] };

  const momenten = verdeelOverDagen(concepten.length, campagne.dagmaximum, new Date());
  const afzender = {
    naam: campagne.afzender_naam ?? campagne.ondertekening ?? "",
    email: campagne.afzender_email,
    antwoordNaar: campagne.antwoord_naar,
  };

  const mislukt: Verzending["mislukt"] = [];
  let ingepland = 0;

  for (let i = 0; i < concepten.length; i++) {
    const c = concepten[i]!;
    const email = c.outbound_contacts?.email;
    const sleutel = c.outbound_contacts?.afmeldsleutel;
    if (!email || !sleutel) {
      // Zonder afmeldsleutel gaat er niets weg. Een commerciele mail zonder
      // uitweg mag wettelijk niet, en het is precies de mail waarop mensen
      // "spam" drukken.
      mislukt.push({ email: email ?? "(onbekend)", reden: "geen adres of afmeldsleutel" });
      continue;
    }

    const uitkomst = await planBericht(
      {
        berichtId: c.id,
        naar: email,
        onderwerp: c.onderwerp,
        tekst: c.tekst,
        afmeldsleutel: sleutel,
        wanneer: momenten[i]!,
      },
      afzender,
    );

    if (uitkomst.ok) ingepland++;
    else mislukt.push({ email, reden: uitkomst.fout });
  }

  const eerste = momenten[0];
  const laatste = momenten[momenten.length - 1];
  return {
    ingepland,
    ...(eerste ? { eerste: eerste.toISOString() } : {}),
    ...(laatste ? { laatste: laatste.toISOString() } : {}),
    mislukt,
  };
}

type EersteBericht = {
  id: string;
  contact_id: string;
  onderwerp: string;
  tekst: string;
  verzonden_op: string | null;
  outbound_contacts: {
    id: string;
    email: string;
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    herkomst: string;
  } | null;
};

/**
 * Stelt opvolgberichten op voor wie niet heeft geantwoord.
 *
 * Wie wél antwoordde valt er vanzelf buiten: de trigger bij een binnengekomen
 * antwoord zet het eerste bericht op 'beantwoord', en hier wordt alleen naar
 * 'verzonden' gekeken. Die ene statuswijziging is dus het hele filter — geen
 * tweede lijst die kan verouderen.
 */
export async function bereidOpvolgingVoor(campagneId: string, portie = 10): Promise<Voorbereiding> {
  const d = db();

  const [campagne] = await haal<Campagne & { opvolg_na_dagen?: number }>(
    d,
    `outbound_campaigns?id=eq.${campagneId}`,
  );
  if (!campagne) throw new Error("Deze campagne bestaat niet.");
  if (!campagne.aanbod || !campagne.ondertekening) {
    throw new Error("Vul eerst het aanbod en de ondertekening in bij de campagne.");
  }

  const kennis = await haal<KennisRegel>(
    d,
    `knowledge_items?select=category,title,content&agent_id=eq.${campagne.agent_id}&is_active=eq.true&order=sort_order`,
  );

  const eerste = await haal<EersteBericht>(
    d,
    `outbound_messages?select=id,contact_id,onderwerp,tekst,verzonden_op,` +
      `outbound_contacts(id,email,naam,bedrijf,plaats,herkomst)` +
      `&campaign_id=eq.${campagneId}&stap=eq.1&status=eq.verzonden&order=verzonden_op&limit=500`,
  );

  const heeftOpvolging = new Set(
    (
      await haal<{ contact_id: string }>(
        d,
        `outbound_messages?select=contact_id&campaign_id=eq.${campagneId}&stap=eq.2`,
      )
    ).map((m) => m.contact_id),
  );

  const teDoen = eerste.filter((m) => !heeftOpvolging.has(m.contact_id) && m.outbound_contacts);
  const nu = teDoen.slice(0, portie);

  const overgeslagen: Voorbereiding["overgeslagen"] = [];
  let klaargezet = 0;

  for (const m of nu) {
    const c = m.outbound_contacts!;
    try {
      const concept = await stelBerichtOp({
        contact: {
          naam: c.naam ?? undefined,
          bedrijf: c.bedrijf ?? undefined,
          plaats: c.plaats ?? undefined,
          herkomst: c.herkomst as "oud_klant" | "koud",
        },
        kennis,
        bedrijfsnaam:
          campagne.afzender_naam ??
          campagne.ondertekening.split(",").pop()?.trim() ??
          campagne.ondertekening,
        ondertekening: campagne.ondertekening,
        aanbod: campagne.aanbod,
        vorigBericht: m.tekst,
      });

      const res = await fetch(`${d.url}/rest/v1/outbound_messages`, {
        method: "POST",
        headers: { ...d.headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          agent_id: campagne.agent_id,
          campaign_id: campagne.id,
          contact_id: c.id,
          stap: 2,
          status: "concept",
          onderwerp: concept.onderwerp,
          tekst: concept.tekst,
          // Het moment ligt hier al vast, zodat het inplannen straks niet
          // opnieuw hoeft uit te rekenen wanneer het eerste bericht wegging.
          gepland_voor: opvolgmoment(
            m.verzonden_op ? new Date(m.verzonden_op) : new Date(),
            campagne.opvolg_na_dagen ?? 7,
          ).toISOString(),
        }),
      });

      if (!res.ok) {
        const melding = res.status === 409 ? "had al een opvolging" : await res.text();
        overgeslagen.push({ email: c.email, reden: melding.slice(0, 120) });
        continue;
      }
      klaargezet++;
    } catch (e) {
      overgeslagen.push({
        email: c.email,
        reden: e instanceof Error ? e.message.slice(0, 120) : "opstellen mislukt",
      });
    }
  }

  return { klaargezet, overgeslagen, resterend: Math.max(teDoen.length - nu.length, 0) };
}

/** Plant de klaarstaande opvolgingen in, elk op zijn eigen moment. */
export async function verstuurOpvolging(campagneId: string): Promise<Verzending> {
  return verstuurStap(campagneId, 2);
}

/**
 * Plant de klaarstaande berichten van één stap in.
 *
 * Er wordt hier bewust niet opnieuw over dagen verdeeld: dat moment stond al
 * vast toen het bericht werd klaargezet, geteld vanaf de eigen eerste mail of
 * de eigen bezorgdag van dat contact.
 */
async function verstuurStap(campagneId: string, stap: number): Promise<Verzending> {
  const d = db();

  const [campagne] = await haal<Campagne>(d, `outbound_campaigns?id=eq.${campagneId}`);
  if (!campagne) throw new Error("Deze campagne bestaat niet.");
  if (!campagne.actief) throw new Error("Zet de campagne eerst op actief.");
  if (!campagne.afzender_email || !campagne.antwoord_naar) {
    throw new Error("Vul eerst het afzenderadres en het antwoordadres in.");
  }

  const concepten = await haal<{
    id: string;
    onderwerp: string;
    tekst: string;
    gepland_voor: string | null;
    outbound_contacts: { email: string; afmeldsleutel: string } | null;
  }>(
    d,
    `outbound_messages?select=id,onderwerp,tekst,gepland_voor,outbound_contacts(email,afmeldsleutel)` +
      `&campaign_id=eq.${campagneId}&stap=eq.${stap}&status=eq.concept&order=gepland_voor`,
  );

  if (concepten.length === 0) return { ingepland: 0, mislukt: [] };

  const afzender = {
    naam: campagne.afzender_naam ?? campagne.ondertekening ?? "",
    email: campagne.afzender_email,
    antwoordNaar: campagne.antwoord_naar,
  };

  const mislukt: Verzending["mislukt"] = [];
  let ingepland = 0;
  let eerste: string | undefined;
  let laatste: string | undefined;

  for (const c of concepten) {
    const email = c.outbound_contacts?.email;
    const sleutel = c.outbound_contacts?.afmeldsleutel;
    if (!email || !sleutel) {
      mislukt.push({ email: email ?? "(onbekend)", reden: "geen adres of afmeldsleutel" });
      continue;
    }
    const wanneer = c.gepland_voor ? new Date(c.gepland_voor) : new Date(Date.now() + 5 * 60_000);
    const uitkomst = await planBericht(
      {
        berichtId: c.id,
        naar: email,
        onderwerp: c.onderwerp,
        tekst: c.tekst,
        afmeldsleutel: sleutel,
        wanneer,
      },
      afzender,
    );
    if (uitkomst.ok) {
      ingepland++;
      eerste ??= wanneer.toISOString();
      laatste = wanneer.toISOString();
    } else {
      mislukt.push({ email, reden: uitkomst.fout });
    }
  }

  return { ingepland, ...(eerste ? { eerste } : {}), ...(laatste ? { laatste } : {}), mislukt };
}

type BezorgdPakket = {
  id: string;
  contact_id: string;
  bezorgdag: string;
  opvolging: string;
  outbound_contacts: {
    id: string;
    email: string;
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    herkomst: string;
  } | null;
};

/**
 * Navraag klaarzetten voor wie een pakket heeft gehad.
 *
 * Dit is het bericht waar het geld zit. Iemand die het product heeft geproefd
 * staat dichter bij klant worden dan wie ook in de lijst — maar alleen als er
 * daarna iemand belt. De mail probeert dus niets af te sluiten; hij vraagt hoe
 * het was en of er gebeld mag worden.
 *
 * Alleen bezorgde pakketten tellen. Een afspraak die nog moet plaatsvinden of
 * is afgezegd levert niets om naar te vragen.
 */
export async function bereidNavraagVoor(campagneId: string, portie = 10): Promise<Voorbereiding> {
  const d = db();

  const [campagne] = await haal<Campagne & { navraag_na_dagen?: number }>(
    d,
    `outbound_campaigns?id=eq.${campagneId}`,
  );
  if (!campagne) throw new Error("Deze campagne bestaat niet.");
  if (!campagne.aanbod || !campagne.ondertekening) {
    throw new Error("Vul eerst het aanbod en de ondertekening in bij de campagne.");
  }

  const kennis = await haal<KennisRegel>(
    d,
    `knowledge_items?select=category,title,content&agent_id=eq.${campagne.agent_id}&is_active=eq.true&order=sort_order`,
  );

  const bezorgd = await haal<BezorgdPakket>(
    d,
    `outbound_deliveries?select=id,contact_id,bezorgdag,opvolging,` +
      `outbound_contacts(id,email,naam,bedrijf,plaats,herkomst)` +
      `&agent_id=eq.${campagne.agent_id}&status=eq.bezorgd&order=bezorgdag&limit=500`,
  );

  const heeftNavraag = new Set(
    (
      await haal<{ contact_id: string }>(
        d,
        `outbound_messages?select=contact_id&agent_id=eq.${campagne.agent_id}&stap=eq.3`,
      )
    ).map((m) => m.contact_id),
  );

  const teDoen = bezorgd.filter((b) => !heeftNavraag.has(b.contact_id) && b.outbound_contacts);
  const nu = teDoen.slice(0, portie);

  const overgeslagen: Voorbereiding["overgeslagen"] = [];
  let klaargezet = 0;

  for (const b of nu) {
    const c = b.outbound_contacts!;
    try {
      const concept = await stelBerichtOp({
        contact: {
          naam: c.naam ?? undefined,
          bedrijf: c.bedrijf ?? undefined,
          plaats: c.plaats ?? undefined,
          herkomst: c.herkomst as "oud_klant" | "koud",
        },
        kennis,
        bedrijfsnaam:
          campagne.afzender_naam ??
          campagne.ondertekening.split(",").pop()?.trim() ??
          campagne.ondertekening,
        ondertekening: campagne.ondertekening,
        aanbod: campagne.aanbod,
        soort: "navraag",
      });

      const wanneer = opvolgmoment(
        new Date(b.bezorgdag + "T12:00:00"),
        campagne.navraag_na_dagen ?? 7,
      );

      const res = await fetch(`${d.url}/rest/v1/outbound_messages`, {
        method: "POST",
        headers: { ...d.headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          agent_id: campagne.agent_id,
          campaign_id: campagne.id,
          contact_id: c.id,
          stap: 3,
          status: "concept",
          onderwerp: concept.onderwerp,
          tekst: concept.tekst,
          gepland_voor: wanneer.toISOString(),
        }),
      });

      if (!res.ok) {
        const melding = res.status === 409 ? "had al een navraag" : await res.text();
        overgeslagen.push({ email: c.email, reden: melding.slice(0, 120) });
        continue;
      }

      // De bezorging onthoudt dat er is nagevraagd, zodat het scherm kan laten
      // zien wie er nog niets heeft gehoord.
      await fetch(`${d.url}/rest/v1/outbound_deliveries?id=eq.${b.id}&opvolging=eq.open`, {
        method: "PATCH",
        headers: { ...d.headers, Prefer: "return=minimal" },
        body: JSON.stringify({ opvolging: "navraag_uit" }),
      });

      klaargezet++;
    } catch (e) {
      overgeslagen.push({
        email: c.email,
        reden: e instanceof Error ? e.message.slice(0, 120) : "opstellen mislukt",
      });
    }
  }

  return { klaargezet, overgeslagen, resterend: Math.max(teDoen.length - nu.length, 0) };
}

/** De klaarstaande navraagberichten inplannen, elk op zijn eigen moment. */
export async function verstuurNavraag(campagneId: string): Promise<Verzending> {
  return verstuurStap(campagneId, 3);
}
