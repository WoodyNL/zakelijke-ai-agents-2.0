/**
 * Van "ja graag" naar een vrijdag in de agenda.
 *
 * Dit is het enige punt waar de agent uit zichzelf iets vastlegt waar een
 * mens naar handelt: er komt een regel in de bezorglijst en de chauffeur
 * rijdt vrijdag naar dat adres. Alles hier is daarom geschreven vanuit de
 * vraag "wat als dit fout gaat", niet vanuit "wat als dit goed gaat".
 *
 * De volgorde is streng:
 *
 *   1. het model leest wat de afzender zegt
 *   2. de regels in proefpakket-lezen.ts controleren dat oordeel
 *   3. pas bij "bevestigd" wordt er een dag gekozen en vastgelegd
 *   4. de dag gaat mee in het antwoord dat toch al geschreven wordt
 *
 * Stap 3 gebeurt vóór het antwoord wordt opgesteld, zodat de klant de datum
 * in dezelfde mail leest. Twee mails — eerst "ja leuk", dan "het wordt de
 * 23e" — is precies het soort gesprek dat een mens niet voert.
 *
 * En de regel waar het om draait: er wordt nooit ingepland op een adres dat
 * de ontvanger niet zelf heeft bevestigd. Een adres uit de import is een
 * aanname, geen afspraak. Staat er wel een adres maar heeft hij het niet
 * bevestigd, dan legt de agent het hem voor en plant niets.
 */

import { PAKKETTEN_PER_VRIJDAG } from "@/lib/busvracht";
import { kiesBezorgdag } from "@/lib/bezorgdag";
import { beoordeelWens, type Omstandigheden, type Wens } from "@/lib/proefpakket-lezen";

const MODEL = "claude-sonnet-5";

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

/** Het adres zoals het nu in de lijst staat, als één regel. */
export function adresRegel(c: {
  adres: string | null;
  postcode: string | null;
  plaats: string | null;
}): string | null {
  const delen = [c.adres, [c.postcode, c.plaats].filter(Boolean).join(" ")].filter(
    (x) => x && String(x).trim().length > 0,
  );
  return delen.length > 0 ? delen.join(", ") : null;
}

/**
 * Wat zegt deze afzender over het proefpakket?
 *
 * Bij elke twijfel komt er "onduidelijk" uit, en dan gebeurt er niets
 * automatisch — de agent schrijft gewoon een antwoord en een mens ziet het
 * gesprek op het scherm. Dat is de goedkope fout. De dure fout is een bus die
 * vrijdag voor een dichte deur staat.
 */
export async function leesWens(tekst: string, omst: Omstandigheden): Promise<Wens> {
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
      system: `Je leest één bericht van iemand aan wie een gratis proefpakket is aangeboden${
        omst.adresInLijst ? `. In onze lijst staat bij hem dit adres: ${omst.adresInLijst}` : ""
      }.

Je bepaalt wat de afzender zegt, en niets meer. Je schrijft geen mail en je geeft geen advies.

De mogelijkheden:
- "bevestigd": hij wil het pakket én het bezorgadres staat vast. Alleen deze uitkomst als hij óf zelf een adres noemt, óf met zoveel woorden bevestigt dat het adres hierboven klopt.
- "wil_pakket": hij wil het pakket, maar over het adres is niets gezegd of het is nog niet rond.
- "geen_pakket": hij wil het niet, nu niet of helemaal niet.
- "onduidelijk": alles wat hier niet duidelijk onder valt. Ook een vraag zonder antwoord op het aanbod.

Bij twijfel kies je "onduidelijk". Dat is geen fout antwoord — er kijkt een mens naar het gesprek.

Over "bevestigd", lees dit goed:
- "citaat" is de zin uit zijn bericht waarop je dat baseert, letterlijk overgenomen. Verzin die zin niet en vat hem niet samen. Kun je geen letterlijke zin aanwijzen, kies dan "onduidelijk".
- Noemt hij zélf een adres, zet dat dan in "adres", volledig zoals je het op een pakket zou schrijven.
- Bevestigt hij alleen het adres dat hierboven staat ("ja dat klopt", "dat adres is goed"), laat "adres" dan weg. Schrijf het adres uit onze lijst niet over.
- "ja graag" of "stuur maar langs" zonder iets over het adres is "wil_pakket" en niet "bevestigd". Ook als er hierboven een adres staat: dat heeft hij dan niet bevestigd.

Geef uitsluitend JSON terug, zonder omhulsel:
{"stand": "...", "adres": "...", "citaat": "..."}
De velden "adres" en "citaat" laat je weg als ze niet van toepassing zijn.`,
      messages: [{ role: "user", content: tekst.slice(0, 4000) }],
    }),
  });

  if (!res.ok) return { stand: "onduidelijk" };

  const antwoord = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return beoordeelWens(antwoord.content?.find((b) => b.type === "text")?.text ?? "", tekst, omst);
}

export type Inplanning =
  /** `nieuw: false` betekent: er stond er al een, en dit is die afspraak. */
  | { gelukt: true; nieuw: boolean; dag: string; adres: string }
  | { gelukt: false; reden: string };

/**
 * De eerstvolgende vrijdag met ruimte vastleggen.
 *
 * Twee dingen voorkomen dat dit dubbel gebeurt. Er wordt eerst gekeken of dit
 * contact al een bezorging heeft staan, en de dag wordt bepaald uit de
 * agenda — twee verwerkingen die tegelijk binnenkomen kiezen dus dezelfde
 * vrijdag, en daar ligt een unieke index op (contact_id, bezorgdag). Eén van
 * de twee botst en plant niets.
 *
 * De bezorging gaat er meteen als bevestigd in. Dat is geen afkorting: de
 * klant heeft het adres zojuist zelf bevestigd, en dat is precies wat de
 * woensdagse ronde anders was komen vragen.
 */
export async function planEerstvolgendeVrijdag(o: {
  agentId: string;
  contactId: string;
  adres: string;
  citaat: string;
  nu?: Date;
}): Promise<Inplanning> {
  const d = db();
  const nu = o.nu ?? new Date();

  const bestaand = await haal<{
    id: string;
    bezorgdag: string;
    status: string;
    adres: string | null;
  }>(
    d,
    `outbound_deliveries?select=id,bezorgdag,status,adres&contact_id=eq.${o.contactId}&limit=5`,
  );
  // Staat er al een rit? Dan is dat de afspraak, en die geeft de agent terug
  // in plaats van er een tweede naast te zetten. Hij moet de dag wél kunnen
  // noemen: iemand die nog eens bevestigt, hoort te horen wanneer het is.
  const lopend = bestaand.find((b) => b.status !== "afgezegd");
  if (lopend) {
    return {
      gelukt: true,
      nieuw: false,
      dag: lopend.bezorgdag,
      adres: lopend.adres ?? o.adres,
    };
  }

  // Hoe vol de komende vrijdagen zitten. Over alle contacten van deze agent,
  // want de bus is van Frank en niet van één campagne.
  const gepland = await haal<{ bezorgdag: string }>(
    d,
    `outbound_deliveries?select=bezorgdag&agent_id=eq.${o.agentId}` +
      `&status=neq.afgezegd&bezorgdag=gte.${isoVandaag(nu)}&limit=1000`,
  );
  const bezet = new Map<string, number>();
  for (const g of gepland) bezet.set(g.bezorgdag, (bezet.get(g.bezorgdag) ?? 0) + 1);

  const dag = kiesBezorgdag(nu, bezet, PAKKETTEN_PER_VRIJDAG);
  if (!dag) {
    return { gelukt: false, reden: "de komende vrijdagen zitten vol" };
  }

  const res = await fetch(`${d.url}/rest/v1/outbound_deliveries`, {
    method: "POST",
    headers: d.headers,
    body: JSON.stringify({
      agent_id: o.agentId,
      contact_id: o.contactId,
      bezorgdag: dag,
      adres: o.adres,
      adres_bron: o.citaat,
      status: "afgesproken",
      bevestiging: "bevestigd",
      bevestiging_op: new Date().toISOString(),
      notitie: "Automatisch ingepland nadat het adres per e-mail is bevestigd.",
    }),
  });

  if (res.status === 409) {
    return { gelukt: false, reden: "er werd al een bezorging voor deze dag vastgelegd" };
  }
  if (!res.ok) {
    return { gelukt: false, reden: `vastleggen mislukt (${res.status})` };
  }

  return { gelukt: true, nieuw: true, dag, adres: o.adres };
}

/**
 * Het bevestigde adres ook op het contact zetten.
 *
 * Mag de afhandeling niet laten struikelen: de bezorging staat op dat moment
 * al vast en die draagt zijn eigen adres. Dit is het bijwerken van de lijst
 * voor de volgende keer, geen voorwaarde voor de rit.
 */
export async function bewaarAdresOpContact(contactId: string, adres: string): Promise<void> {
  try {
    const d = db();
    await fetch(`${d.url}/rest/v1/outbound_contacts?id=eq.${contactId}`, {
      method: "PATCH",
      headers: d.headers,
      body: JSON.stringify({ adres }),
    });
  } catch {
    // Bewust stil.
  }
}

/** Vandaag als `2026-10-21`, in UTC — alleen als ondergrens voor de agenda. */
function isoVandaag(nu: Date): string {
  return nu.toISOString().slice(0, 10);
}
