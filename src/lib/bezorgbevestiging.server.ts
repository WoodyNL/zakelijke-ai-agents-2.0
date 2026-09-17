import { stelBerichtOp, type KennisRegel } from "@/lib/bericht-opstellen.server";
import { planBericht } from "@/lib/verzenden.server";
import { alsDagInTekst, beoordeelUitkomst, type Uitkomst } from "@/lib/bevestiging-lezen";

/**
 * Woensdag vragen of het vrijdag schikt.
 *
 * Dit is de enige ronde die niet over verkopen gaat. De afspraak staat al; wat
 * hier gebeurt is voorkomen dat de chauffeur vrijdagochtend voor een dichte
 * deur staat. Van de contacten in dit bestand komt een deel uit een
 * relatielijst van jaren geleden, en in de horeca wordt verhuisd en
 * overgenomen.
 *
 * Twee keuzes die anders zijn dan bij de campagnes.
 *
 * Er wordt niet klaargezet en later verstuurd, maar meteen verstuurd. Een
 * bevestiging voor overmorgen die twee dagen als concept blijft staan, is geen
 * bevestiging meer. Het aantal is bovendien klein — het is wat er in één bus
 * past, niet honderdzevenendertig.
 *
 * En er wordt niet over dagen verdeeld. Het dagmaximum bestaat om een vers
 * verzenddomein te beschermen tegen honderd koude mails ineens; dit zijn acht
 * mails aan mensen die op een antwoord zitten te wachten.
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

/** De stap waaronder een bevestiging in outbound_messages terechtkomt. */
export const STAP_BEVESTIGING = 4;

export type BevestigingsRonde = {
  verstuurd: number;
  overgeslagen: Array<{ email: string; reden: string }>;
};


type Rij = {
  id: string;
  contact_id: string;
  bezorgdag: string;
  adres: string | null;
  outbound_contacts: {
    email: string;
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    herkomst: string;
    afmeld_sleutel: string;
    afgemeld_op: string | null;
    bounce_op: string | null;
  } | null;
};

/**
 * Stelt voor elke bezorging op deze dag een bevestiging op en verstuurt hem.
 *
 * Alleen bezorgingen waar nog niet naar gevraagd is. Twee keer dezelfde vraag
 * stellen over dezelfde doos is erger dan hem niet stellen: dan lijkt het alsof
 * er niemand meekijkt.
 */
export async function verstuurBevestigingen(
  agentId: string,
  bezorgdag: string,
): Promise<BevestigingsRonde> {
  const d = db();

  const rijen = await haal<Rij>(
    d,
    `outbound_deliveries?select=id,contact_id,bezorgdag,adres,` +
      `outbound_contacts(email,naam,bedrijf,plaats,herkomst,afmeld_sleutel,afgemeld_op,bounce_op)` +
      `&agent_id=eq.${agentId}&bezorgdag=eq.${bezorgdag}` +
      `&status=eq.afgesproken&bevestiging=eq.niet_gevraagd&limit=100`,
  );

  if (rijen.length === 0) return { verstuurd: 0, overgeslagen: [] };

  // Afzender en aanbod komen uit de campagne waar dit contact vandaan kwam.
  // Een bevestiging die van een ander adres komt dan de mail ervoor, leest als
  // een vreemde die over jouw bestelling begint.
  const campagnes = await haal<{
    contact_id: string;
    outbound_campaigns: {
      afzender_naam: string | null;
      afzender_email: string | null;
      antwoord_naar: string | null;
      aanbod: string | null;
      ondertekening: string | null;
    } | null;
  }>(
    d,
    `outbound_messages?select=contact_id,outbound_campaigns(afzender_naam,afzender_email,antwoord_naar,aanbod,ondertekening)` +
      `&agent_id=eq.${agentId}&stap=eq.1&order=verzonden_op.desc&limit=500`,
  );
  const perContact = new Map(campagnes.filter((c) => c.outbound_campaigns).map((c) => [c.contact_id, c.outbound_campaigns!]));

  const kennis = await haal<KennisRegel>(
    d,
    `knowledge_items?select=category,title,content&agent_id=eq.${agentId}&is_active=eq.true&order=sort_order`,
  );

  const [agent] = await haal<{ name: string }>(d, `agents?select=name&id=eq.${agentId}`);

  const overgeslagen: Array<{ email: string; reden: string }> = [];
  let verstuurd = 0;

  for (const rij of rijen) {
    const c = rij.outbound_contacts;
    if (!c) {
      overgeslagen.push({ email: "(onbekend)", reden: "contact niet gevonden" });
      continue;
    }
    // De database houdt een afgemeld contact sowieso tegen, maar dan is het
    // bericht al opgesteld en betaald. Hier scheelt het een modelaanroep.
    if (c.afgemeld_op || c.bounce_op) {
      overgeslagen.push({ email: c.email, reden: "afgemeld of onbestelbaar" });
      continue;
    }

    const camp = perContact.get(rij.contact_id);
    if (!camp?.afzender_email || !camp.aanbod || !camp.ondertekening) {
      overgeslagen.push({ email: c.email, reden: "geen campagnegegevens om vanaf te sturen" });
      continue;
    }

    let concept;
    try {
      concept = await stelBerichtOp({
        contact: {
          naam: c.naam ?? undefined,
          bedrijf: c.bedrijf ?? undefined,
          plaats: c.plaats ?? undefined,
          herkomst: c.herkomst as "oud_klant" | "koud",
        },
        kennis,
        bedrijfsnaam: agent?.name ?? "ons",
        ondertekening: camp.ondertekening,
        aanbod: camp.aanbod,
        soort: "bevestiging",
        bezorging: { dag: alsDagInTekst(rij.bezorgdag), adres: rij.adres },
      });
    } catch (e) {
      overgeslagen.push({
        email: c.email,
        reden: e instanceof Error ? e.message : "opstellen mislukt",
      });
      continue;
    }

    const maak = await fetch(`${d.url}/rest/v1/outbound_messages`, {
      method: "POST",
      headers: { ...d.headers, Prefer: "return=representation" },
      body: JSON.stringify({
        agent_id: agentId,
        contact_id: rij.contact_id,
        stap: STAP_BEVESTIGING,
        onderwerp: concept.onderwerp,
        tekst: concept.tekst,
        status: "concept",
      }),
    });
    if (!maak.ok) {
      overgeslagen.push({ email: c.email, reden: `opslaan mislukt (${maak.status})` });
      continue;
    }
    const [bericht] = (await maak.json()) as Array<{ id: string }>;
    if (!bericht) {
      overgeslagen.push({ email: c.email, reden: "opslaan gaf niets terug" });
      continue;
    }

    const uit = await planBericht(
      {
        berichtId: bericht.id,
        naar: c.email,
        onderwerp: concept.onderwerp,
        tekst: concept.tekst,
        afmeldsleutel: c.afmeld_sleutel,
      },
      {
        naam: camp.afzender_naam ?? agent?.name ?? "",
        email: camp.afzender_email,
        antwoordNaar: camp.antwoord_naar ?? camp.afzender_email,
      },
    );

    if (!uit.ok) {
      overgeslagen.push({ email: c.email, reden: uit.fout });
      continue;
    }

    await fetch(`${d.url}/rest/v1/outbound_deliveries?id=eq.${rij.id}`, {
      method: "PATCH",
      headers: { ...d.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ bevestiging: "gevraagd", bevestiging_op: new Date().toISOString() }),
    });
    verstuurd++;
  }

  return { verstuurd, overgeslagen };
}

/**
 * Wat er in een antwoord op de bevestiging staat.
 *
 * Dit is het enige punt in het platform waar een model iets verandert aan
 * gegevens waar een mens naar handelt: de chauffeur rijdt naar het adres dat
 * hieruit komt. Daarom drie dingen.
 *
 * Het model mag geen adres verzinnen. Het geeft de zin terug waar het adres in
 * stond, en die zin komt letterlijk uit de mail. Staat er geen adres in, dan is
 * er ook geen zin, en dan gebeurt er niets.
 *
 * Twijfel is een uitkomst, geen randgeval. Weet het model het niet, dan blijft
 * de bevestiging openstaan en leest een mens het antwoord op het
 * antwoordenscherm — waar het toch al stond.
 *
 * En het oude adres blijft bewaard. Een wijziging die je niet kunt terugzien,
 * is een wijziging die je niet durft te vertrouwen.
 */

const MODEL = "claude-sonnet-5";

export async function leesBevestiging(
  tekst: string,
  huidigAdres: string | null,
): Promise<Uitkomst> {
  const sleutel = process.env["ANTHROPIC_API_KEY"];
  if (!sleutel) return { stand: "onduidelijk" };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": sleutel,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: `Je leest één antwoord op een mail waarin stond dat er vrijdag een proefpakket wordt bezorgd${huidigAdres ? ` op dit adres: ${huidigAdres}` : ""}.

Je bepaalt wat de afzender zegt, en niets meer. Je schrijft geen mail en je geeft geen advies.

De mogelijkheden:
- "bevestigd": het schikt, de bezorging kan doorgaan zoals hij staat.
- "ander_adres": het gaat door, maar op een ander adres dan hierboven. Alleen deze uitkomst als er een ander adres in de mail staat.
- "verzet": hij wil het pakket wel, maar niet op die dag.
- "afgezegd": hij wil het pakket niet meer.
- "onduidelijk": alles wat hier niet duidelijk onder valt.

Bij twijfel kies je "onduidelijk". Dat is geen fout antwoord — er kijkt een mens naar. Een verkeerde "bevestigd" stuurt een bus naar een dichte deur, en een verkeerde "afgezegd" laat iemand voor niets wachten.

Bij "ander_adres":
- "adres" is het volledige nieuwe adres zoals je het op een pakket zou schrijven.
- "citaat" is de zin uit de mail waar dat adres in staat, letterlijk overgenomen. Verzin die zin niet en vat hem niet samen. Kun je geen letterlijke zin aanwijzen, kies dan "onduidelijk".
- Noemt hij een adres dat hetzelfde is als hierboven, dan is het "bevestigd" en geen "ander_adres".
- Noemt hij een tweede vestiging zonder te zeggen dat het pakket daarheen moet, dan is dat "onduidelijk".

Geef uitsluitend JSON terug, zonder omhulsel:
{"stand": "...", "adres": "...", "citaat": "..."}
De velden "adres" en "citaat" laat je weg als ze niet van toepassing zijn.`,
      messages: [{ role: "user", content: tekst.slice(0, 4000) }],
    }),
  });

  if (!res.ok) return { stand: "onduidelijk" };

  const antwoord = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return beoordeelUitkomst(antwoord.content?.find((b) => b.type === "text")?.text ?? "", tekst);
}


/**
 * Het antwoord verwerken in de bezorging.
 *
 * Mag nooit de afhandeling van de webhook laten struikelen: het antwoord zelf
 * is op dat moment al bewaard, en een fout hier zou de hele melding opnieuw
 * laten aanbieden.
 */
export async function verwerkBevestigingsAntwoord(
  agentId: string,
  contactId: string,
  tekst: string,
): Promise<Uitkomst["stand"] | null> {
  if (!tekst.trim()) return null;
  const d = db();

  const vandaag = new Date().toISOString().slice(0, 10);
  const open = await haal<{ id: string; adres: string | null }>(
    d,
    `outbound_deliveries?select=id,adres&agent_id=eq.${agentId}&contact_id=eq.${contactId}` +
      `&bevestiging=eq.gevraagd&bezorgdag=gte.${vandaag}&order=bezorgdag.asc&limit=1`,
  );
  const bezorging = open[0];
  if (!bezorging) return null;

  const uit = await leesBevestiging(tekst, bezorging.adres);
  if (uit.stand === "onduidelijk") return "onduidelijk";

  const wijziging: Record<string, unknown> = {
    bevestiging: uit.stand,
    bevestiging_op: new Date().toISOString(),
  };
  if (uit.stand === "ander_adres" && uit.adres) {
    wijziging["adres"] = uit.adres;
    wijziging["adres_eerder"] = bezorging.adres;
    wijziging["adres_bron"] = uit.citaat ?? null;
  }

  await fetch(`${d.url}/rest/v1/outbound_deliveries?id=eq.${bezorging.id}`, {
    method: "PATCH",
    headers: { ...d.headers, Prefer: "return=minimal" },
    body: JSON.stringify(wijziging),
  });

  return uit.stand;
}
