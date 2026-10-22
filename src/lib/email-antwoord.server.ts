import { stelBerichtOp, type KennisRegel } from "@/lib/bericht-opstellen.server";
import { planBericht } from "@/lib/verzenden.server";
import { beoordeelAntwoord, zonderCitaat, type Binnenkomend } from "@/lib/antwoordregels";
import { alsDagInTekst } from "@/lib/bevestiging-lezen";
import {
  adresRegel,
  bewaarAdresOpContact,
  leesWens,
  planEerstvolgendeVrijdag,
} from "@/lib/proefpakket.server";

/**
 * De agent antwoordt zelf op een binnengekomen reactie.
 *
 * Dit draait in de webhook, dus binnen seconden nadat iemand op "verzenden"
 * heeft gedrukt. Dat is de bedoeling — een vraag die een uur blijft liggen is
 * een vraag die niet meer leeft — maar het betekent ook dat er geen mens
 * tussen zit. Alles wat misgaat, gaat meteen de deur uit.
 *
 * De volgorde hieronder is daarom geen stijlkwestie:
 *
 *   1. oordeel vellen op basis van het binnengekomen bericht
 *   2. de rij in de database aanmaken
 *   3. pas daarna versturen
 *
 * Stap 2 vóór stap 3 is wat een dubbel antwoord onmogelijk maakt. Op
 * `in_antwoord_op` ligt een unieke index, dus van twee gelijktijdige
 * verwerkingen — en die bestaan, want Resend biedt een webhook opnieuw aan als
 * wij traag zijn — botst er precies één. Die ene verstuurt niets.
 *
 * Een controle in code zou dat niet kunnen: twee pogingen die tegelijk kijken
 * of er al iets staat, zien allebei niets.
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

/** De stap waaronder een antwoord in een gesprek terechtkomt. */
export const STAP_ANTWOORD = 5;

export type AntwoordUitkomst =
  | { gedaan: "verstuurd"; onderwerp: string }
  | { gedaan: "overgeslagen"; reden: string }
  | { gedaan: "mens"; reden: string };

export async function beantwoordReactie(o: {
  agentId: string;
  replyId: string;
  contactId: string | null;
  tekst: string;
  onderwerp: string | null;
  kopregels: Record<string, string>;
  /** De Message-ID van het binnengekomen bericht, voor de draad. */
  messageId: string | null;
}): Promise<AntwoordUitkomst> {
  const d = db();

  // Hoe vaak heeft de agent dit contact al geantwoord? Dat is de rem op een
  // gesprek dat blijft duren, en hij telt op het contact en niet op de
  // campagne: iemand die twee campagnes heeft gehad, is nog steeds één persoon.
  let eerdereAntwoorden: Array<{ tekst: string }> = [];
  if (o.contactId) {
    eerdereAntwoorden = await haal<{ tekst: string }>(
      d,
      `outbound_messages?select=tekst&contact_id=eq.${o.contactId}&stap=eq.${STAP_ANTWOORD}` +
        `&order=aangemaakt_op.asc&limit=10`,
    );
  }

  const binnen: Binnenkomend = {
    tekst: o.tekst,
    onderwerp: o.onderwerp,
    kopregels: o.kopregels,
    bekendContact: o.contactId !== null,
    eerdereAntwoorden: eerdereAntwoorden.length,
  };

  const oordeel = beoordeelAntwoord(binnen);
  if (oordeel.doen !== "beantwoorden") {
    return { gedaan: oordeel.doen === "negeren" ? "overgeslagen" : "mens", reden: oordeel.reden };
  }

  const [contact] = await haal<{
    id: string;
    email: string;
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    adres: string | null;
    postcode: string | null;
    herkomst: string;
    afmeldsleutel: string;
    afgemeld_op: string | null;
    bounce_op: string | null;
  }>(d, `outbound_contacts?id=eq.${o.contactId}`);

  if (!contact) return { gedaan: "mens", reden: "contact niet gevonden" };
  if (contact.afgemeld_op || contact.bounce_op) {
    return { gedaan: "overgeslagen", reden: "contact is afgemeld of onbestelbaar" };
  }

  // De campagne waaruit dit contact post heeft gehad, voor afzender en aanbod.
  // Een antwoord dat van een ander adres komt dan de mail ervoor, leest als
  // een vreemde die over jouw gesprek begint.
  const [vorig] = await haal<{
    outbound_campaigns: {
      afzender_naam: string | null;
      afzender_email: string | null;
      antwoord_naar: string | null;
      aanbod: string | null;
      ondertekening: string | null;
    } | null;
  }>(
    d,
    `outbound_messages?select=outbound_campaigns(afzender_naam,afzender_email,antwoord_naar,aanbod,ondertekening)` +
      `&contact_id=eq.${o.contactId}&stap=eq.1&limit=1`,
  );
  const camp = vorig?.outbound_campaigns;
  if (!camp?.afzender_email || !camp.aanbod || !camp.ondertekening) {
    return { gedaan: "mens", reden: "geen campagnegegevens om vanaf te antwoorden" };
  }

  const kennis = await haal<KennisRegel>(
    d,
    `knowledge_items?select=category,title,content&agent_id=eq.${o.agentId}&is_active=eq.true&order=sort_order`,
  );
  const [agent] = await haal<{ name: string }>(d, `agents?select=name&id=eq.${o.agentId}`);

  /*
   * Wat wil deze persoon, en kan er een vrijdag op?
   *
   * Dit gebeurt vóór het opstellen, zodat de datum in dezelfde mail staat als
   * het antwoord. Anders krijgt iemand eerst "leuk dat u het wilt" en daarna
   * los "het wordt de 23e", en zo praat geen mens.
   *
   * Alles hier is afgeschermd: gaat het lezen of het vastleggen mis, dan
   * wordt er niets ingepland, niets toegezegd en gewoon een antwoord
   * geschreven. Een gemiste inplanning ziet een mens op het bezorgscherm; een
   * verkeerde inplanning ziet hij pas als de chauffeur voor een dichte deur
   * staat.
   */
  const adresInLijst = adresRegel(contact);
  let bezorging: { dag: string; adres: string | null } | undefined;
  let adresvraag: { bekendAdres: string | null } | undefined;

  try {
    const wens = await leesWens(zonderCitaat(o.tekst), {
      adresInLijst,
      eerderGeantwoord: eerdereAntwoorden.length > 0,
    });

    if (wens.stand === "bevestigd" && wens.adres && wens.citaat) {
      const plan = await planEerstvolgendeVrijdag({
        agentId: o.agentId,
        contactId: contact.id,
        adres: wens.adres,
        citaat: wens.citaat,
      });
      if (plan.gelukt) {
        bezorging = { dag: alsDagInTekst(plan.dag), adres: plan.adres };
        // Het adres dat hij zelf opschreef is beter dan wat er stond.
        if (plan.nieuw && wens.bron === "zelf_geschreven") {
          await bewaarAdresOpContact(contact.id, wens.adres);
        }
      } else {
        // Geen dag gevonden of niet kunnen vastleggen. Dan zegt de agent niets
        // toe over een datum; het gesprek loopt gewoon door.
        adresvraag = undefined;
      }
    } else if (wens.stand === "wil_pakket") {
      // Hij wil het, maar het adres is niet door hém bevestigd. Ook niet als
      // er al jaren een adres in de lijst staat: dat is een aanname en geen
      // afspraak. Eerst voorleggen, dan pas een vrijdag.
      adresvraag = { bekendAdres: adresInLijst };
    }
  } catch {
    // Stil: een antwoord zonder afspraak is beter dan geen antwoord.
  }

  let concept;
  try {
    concept = await stelBerichtOp({
      contact: {
        naam: contact.naam ?? undefined,
        bedrijf: contact.bedrijf ?? undefined,
        plaats: contact.plaats ?? undefined,
        herkomst: contact.herkomst as "oud_klant" | "koud" | "test",
      },
      kennis,
      bedrijfsnaam: agent?.name ?? "ons",
      ondertekening: camp.ondertekening,
      aanbod: camp.aanbod,
      soort: "antwoord",
      gesprek: {
        binnen: zonderCitaat(o.tekst),
        eerder: eerdereAntwoorden.map((e) => e.tekst),
      },
      ...(bezorging ? { bezorging } : {}),
      ...(adresvraag ? { adresvraag } : {}),
    });
  } catch (e) {
    return { gedaan: "mens", reden: e instanceof Error ? e.message : "opstellen mislukt" };
  }

  // Eerst de rij, dan pas de post. Wie de unieke index verliest, verstuurt
  // niets — en dat is precies de bedoeling.
  const maak = await fetch(`${d.url}/rest/v1/outbound_messages`, {
    method: "POST",
    headers: { ...d.headers, Prefer: "return=representation" },
    body: JSON.stringify({
      agent_id: o.agentId,
      contact_id: contact.id,
      stap: STAP_ANTWOORD,
      in_antwoord_op: o.replyId,
      onderwerp: concept.onderwerp,
      tekst: concept.tekst,
      status: "concept",
    }),
  });

  if (maak.status === 409) {
    return { gedaan: "overgeslagen", reden: "op dit bericht is al geantwoord" };
  }
  if (!maak.ok) {
    return { gedaan: "mens", reden: `opslaan mislukt (${maak.status})` };
  }
  const [bericht] = (await maak.json()) as Array<{ id: string }>;
  if (!bericht) return { gedaan: "mens", reden: "opslaan gaf niets terug" };

  const uit = await planBericht(
    {
      berichtId: bericht.id,
      naar: contact.email,
      onderwerp: concept.onderwerp,
      tekst: concept.tekst,
      afmeldsleutel: contact.afmeldsleutel,
      ...(o.messageId ? { inAntwoordOp: o.messageId } : {}),
    },
    {
      naam: camp.afzender_naam ?? agent?.name ?? "",
      email: camp.afzender_email,
      antwoordNaar: camp.antwoord_naar ?? camp.afzender_email,
    },
  );

  if (!uit.ok) {
    /*
     * De mail ging niet weg. Dat moet op de rij komen te staan.
     *
     * planBericht raakt de rij alleen aan als het lukt, dus zonder dit blijft
     * hij op "concept" staan — en dat las op het antwoordenscherm als "de
     * agent heeft een antwoord klaarstaan", alsof het zo weggaat. Er is
     * niemand die het alsnog verstuurt: dit draait in een webhook en niemand
     * drukt hier later nog op verzenden.
     *
     * Erger nog: op in_antwoord_op ligt een unieke index. Die bestaat om een
     * tweede antwoord te voorkomen, maar hij houdt net zo goed een hérkansing
     * tegen. De rij staat er, dus een nieuwe poging botst — terwijl er niets
     * is verstuurd. Daarom markeren we hem hier, zodat het scherm het laat
     * zien en er één klik overheen kan.
     */
    await fetch(`${d.url}/rest/v1/outbound_messages?id=eq.${bericht.id}`, {
      method: "PATCH",
      headers: { ...d.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "mislukt", fout: uit.fout.slice(0, 500) }),
    }).catch(() => {
      // Stil: het antwoord is hieronder toch al als mislukt gemeld.
    });
    return { gedaan: "mens", reden: uit.fout };
  }
  return { gedaan: "verstuurd", onderwerp: concept.onderwerp };
}
