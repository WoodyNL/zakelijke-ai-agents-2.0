import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";
import { ligtInGebied } from "@/lib/bezorggebied";
import { eigenKlant } from "@/lib/klant";

/**
 * Contacten opslaan en teruglezen.
 *
 * De import telt drie uitkomsten apart: toegevoegd, stond er al, en
 * afgemeld. Dat laatste is geen detail. Wie zich heeft afgemeld en later
 * opnieuw in een aangeleverde lijst opduikt — en dat gebeurt, want die lijst
 * komt uit een boekhouding die van de afmelding niets weet — mag daardoor niet
 * stilzwijgend terugkeren in de verzendlijst.
 */

const contactSchema = z.object({
  email: z.string().email().max(254),
  naam: z.string().max(200).optional(),
  bedrijf: z.string().max(200).optional(),
  plaats: z.string().max(120).optional(),
  adres: z.string().max(200).optional(),
  postcode: z.string().max(20).optional(),
  telefoon: z.string().max(60).optional(),
  /** Achtergrond over deze zaak; de agent leest het mee maar citeert het niet. */
  notitie: z.string().max(600).optional(),
  prioriteit: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /** ISO-datum van de laatste bestelling, zoals contactimport hem teruggeeft. */
  laatst_besteld: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Staat er in het bestand zelf of dit een klant of een prospect is, dan wint dat. */
  herkomst: z.enum(["oud_klant", "koud", "test"]).optional(),
});

const importSchema = z.object({
  agentId: z.string().uuid(),
  /** De keuze bij de import; geldt voor elke rij die het zelf niet zegt. */
  herkomst: z.enum(["oud_klant", "koud", "test"]),
  contacten: z.array(contactSchema).min(1).max(5000),
});

export type Importuitkomst = {
  toegevoegd: number;
  bestond_al: number;
  afgemeld_overgeslagen: number;
  totaal_in_lijst: number;
};

export const importeerContacten = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => importSchema.parse(d))
  .handler(async ({ context, data }): Promise<Importuitkomst> => {
    // Eerst vaststellen dat deze agent van deze gebruiker is. RLS zou het ook
    // tegenhouden, maar dan als een mislukte insert zonder uitleg; hier kunnen
    // we zeggen wat er aan de hand is.
    const { data: agent, error: agentFout } = await context.supabase
      .from("agents")
      .select("id")
      .eq("id", data.agentId)
      .eq("client_id", await eigenKlant(context))
      .maybeSingle();
    if (agentFout) throw new Error(agentFout.message);
    if (!agent) throw new Error("Deze agent bestaat niet, of is niet van jou.");

    const adressen = data.contacten.map((c) => c.email.toLowerCase());

    // Wat staat er al? In blokken opvragen, want een `in`-filter met
    // duizenden waarden loopt tegen de lengte van een URL aan.
    const bestaand = new Map<string, { afgemeld: boolean }>();
    for (let i = 0; i < adressen.length; i += 200) {
      const blok = adressen.slice(i, i + 200);
      const { data: rijen, error } = await context.supabase
        .from("outbound_contacts")
        .select("email, afgemeld_op")
        .eq("agent_id", data.agentId)
        .in("email", blok);
      if (error) throw new Error(error.message);
      for (const r of rijen ?? []) {
        bestaand.set(r.email.toLowerCase(), { afgemeld: r.afgemeld_op !== null });
      }
    }

    let bestond_al = 0;
    let afgemeld_overgeslagen = 0;
    const nieuw: TablesInsert<"outbound_contacts">[] = [];

    for (const c of data.contacten) {
      const bekend = bestaand.get(c.email.toLowerCase());
      if (bekend) {
        // Een afgemeld contact dat opnieuw wordt aangeleverd, telt apart. Het
        // blijft afgemeld; we laten alleen zien dat het is voorgekomen.
        if (bekend.afgemeld) afgemeld_overgeslagen++;
        else bestond_al++;
        continue;
      }
      // Ligt dit contact op de vrijdagroute? Dat bepaalt of de agent straks een
      // bezorging mag toezeggen. Onbekend blijft leeg: dat is iets anders dan
      // buiten het gebied, en iemand buitensluiten om een ontbrekend veld is
      // erger dan het niet weten.
      const inGebied = ligtInGebied(c.plaats);

      const rij: TablesInsert<"outbound_contacts"> = {
        agent_id: data.agentId,
        email: c.email.toLowerCase(),
        // Het bestand weet het beter dan de keuzelijst: een export met een kolom
        // "Prospect/Klant" bevat allebei door elkaar, en die twee groepen
        // krijgen straks een heel ander eerste bericht.
        herkomst: c.herkomst ?? data.herkomst,
      };
      if (c.naam) rij.naam = c.naam;
      if (c.bedrijf) rij.bedrijf = c.bedrijf;
      if (c.plaats) rij.plaats = c.plaats;
      if (c.adres) (rij as Record<string, unknown>)["adres"] = c.adres;
      if (c.postcode) (rij as Record<string, unknown>)["postcode"] = c.postcode;
      if (c.telefoon) rij.telefoon = c.telefoon;
      if (c.notitie) rij.notitie = c.notitie;
      if (c.prioriteit) (rij as Record<string, unknown>)["prioriteit"] = c.prioriteit;
      if (c.laatst_besteld) rij.laatst_besteld_op = c.laatst_besteld;
      if (inGebied !== null) {
        (rij as Record<string, unknown>)["in_bezorggebied"] = inGebied;
      }
      nieuw.push(rij);
    }

    let toegevoegd = 0;
    for (let i = 0; i < nieuw.length; i += 500) {
      const blok = nieuw.slice(i, i + 500);
      const { error } = await context.supabase.from("outbound_contacts").insert(blok);
      if (error) {
        throw new Error(
          `Opslaan onderbroken na ${toegevoegd} contacten: ${error.message}. Wat al is opgeslagen blijft staan; opnieuw importeren voegt de rest toe.`,
        );
      }
      toegevoegd += blok.length;
    }

    return {
      toegevoegd,
      bestond_al,
      afgemeld_overgeslagen,
      totaal_in_lijst: data.contacten.length,
    };
  });

export const haalContacten = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase
      .from("outbound_contacts")
      .select(
        "id, email, naam, bedrijf, plaats, herkomst, in_bezorggebied, afgemeld_op, bounce_op, aangemaakt_op",
      )
      .eq("agent_id", data.agentId)
      .order("aangemaakt_op", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rijen ?? [];
  });

/**
 * De antwoorden die zijn binnengekomen.
 *
 * Ook die van een onbekend adres. Dat lijkt rommel maar is het niet: iemand die
 * vanaf zijn privéadres terugschrijft, een collega die het overneemt, of een
 * testbericht — het zijn juist de berichten die iemand moet lezen, omdat de
 * software er zelf geen raad mee weet.
 */
/** Het antwoord dat de agent op een binnengekomen reactie terugstuurde. */
type Bericht = {
  id: string;
  in_antwoord_op: string | null;
  onderwerp: string;
  tekst: string;
  status: "concept" | "gepland" | "verzonden" | "mislukt" | "beantwoord";
  verzonden_op: string | null;
  fout: string | null;
};

export const haalAntwoorden = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase
      .from("outbound_replies")
      .select(
        "id, van_email, van_naam, onderwerp, tekst, ontvangen_op, afgehandeld_op, contact_id, outbound_contacts(naam, bedrijf)",
      )
      .eq("agent_id", data.agentId)
      .order("ontvangen_op", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const antwoorden = rijen ?? [];

    // Wat de agent hierop heeft teruggestuurd.
    //
    // Dit scherm liet alleen zien wat er binnenkwam, uit de tijd dat een
    // binnengekomen bericht niets anders deed dan de opvolging intrekken.
    // Sinds de agent zelf antwoordt is dat de helft van het verhaal: je zag
    // de vraag wel en het antwoord niet, en dus leek het alsof er niets
    // gebeurde. Het uitgaande bericht wijst met in_antwoord_op terug naar de
    // reactie, dus één extra vraag is genoeg.
    //
    // Bewust geen ingebedde selectie: die loopt over de naam van de
    // vreemde sleutel, en dat is een stille afhankelijkheid van een naam die
    // niemand hier ooit uitspreekt. Twee gewone vragen zijn duidelijker.
    if (antwoorden.length === 0) return [];

    // In groepjes, want de lijst hierboven gaat tot 200 reacties en PostgREST
    // zet de hele `in`-opsomming in de URL. Tweehonderd uuid's zijn ruim zeven
    // kilobyte aan adres, en dan loop je tegen de limiet van de webserver aan —
    // niet hier op kantoor met drie testadressen, wel zodra het druk wordt.
    const perReactie = new Map<string, Bericht>();
    for (let i = 0; i < antwoorden.length; i += 50) {
      const groep = antwoorden.slice(i, i + 50).map((a) => a.id);
      const { data: berichten, error: berichtFout } = await context.supabase
        .from("outbound_messages")
        .select("id, in_antwoord_op, onderwerp, tekst, status, verzonden_op, fout")
        .in("in_antwoord_op", groep);
      if (berichtFout) throw new Error(berichtFout.message);
      for (const b of berichten ?? []) {
        if (b.in_antwoord_op) perReactie.set(b.in_antwoord_op, b);
      }
    }
    return antwoorden.map((a) => ({ ...a, agentbericht: perReactie.get(a.id) ?? null }));
  });

/**
 * Een mislukt antwoord opnieuw versturen.
 *
 * Nodig omdat niets dat uit zichzelf doet. Het antwoord wordt opgesteld in de
 * webhook, en als het versturen daar strandt — Resend die hapert, een adres
 * dat geweigerd wordt — komt er nooit meer iemand langs. De tekst staat er
 * wel, netjes opgesteld, en de klant wacht.
 *
 * Automatisch opnieuw proberen zou hier verkeerd zijn. Weigert Resend de mail
 * om wat erin staat of naar wie hij gaat, dan verandert een tweede poging
 * niets en een tiende ook niet. Daarom is dit een knop: een mens leest wat er
 * misging, kijkt naar de tekst die eronder staat, en beslist.
 *
 * De ene rand die hieraan zit: lukte het versturen wél maar mislukte het
 * wegschrijven van de uitslag, dan staat de rij ook zonder provider_id. Een
 * herkansing stuurt de mail dan een tweede keer. Daar is geen controle tegen
 * zonder dat Resend ons een sleutel teruggeeft die wij vooraf kiezen. Wat er
 * wél is: zodra er een provider_id staat, weigert deze functie — dat dekt het
 * gewone geval dat iemand twee keer op de knop drukt.
 */
export const verstuurAntwoordOpnieuw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ berichtId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: bericht, error } = await context.supabase
      .from("outbound_messages")
      .select("id, agent_id, contact_id, onderwerp, tekst, status, provider_id, in_antwoord_op")
      .eq("id", data.berichtId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!bericht) throw new Error("Dat bericht bestaat niet.");
    if (bericht.provider_id) {
      throw new Error("Dit bericht is al verstuurd.");
    }

    const { data: contact } = await context.supabase
      .from("outbound_contacts")
      .select("email, afmeldsleutel, afgemeld_op, bounce_op")
      .eq("id", bericht.contact_id)
      .maybeSingle();
    if (!contact) throw new Error("Het contact bestaat niet meer.");
    if (contact.afgemeld_op || contact.bounce_op) {
      throw new Error("Dit contact is afgemeld of onbestelbaar.");
    }

    // De afzender komt uit dezelfde campagne als het eerste bericht, net als
    // bij het oorspronkelijke antwoord. Een herkansing die ineens van een
    // ander adres komt, leest als een vreemde.
    const { data: eerste } = await context.supabase
      .from("outbound_messages")
      .select("outbound_campaigns(afzender_naam, afzender_email, antwoord_naar)")
      .eq("contact_id", bericht.contact_id)
      .eq("stap", 1)
      .limit(1)
      .maybeSingle();
    const camp = eerste?.outbound_campaigns;
    if (!camp?.afzender_email) {
      throw new Error("Geen campagnegegevens om vanaf te versturen.");
    }

    // De draad: het Message-ID van de reactie waarop dit het antwoord is.
    let inAntwoordOp: string | null = null;
    if (bericht.in_antwoord_op) {
      const { data: reactie } = await context.supabase
        .from("outbound_replies")
        .select("message_id")
        .eq("id", bericht.in_antwoord_op)
        .maybeSingle();
      inAntwoordOp = reactie?.message_id ?? null;
    }

    const { planBericht } = await import("@/lib/verzenden.server");
    const uit = await planBericht(
      {
        berichtId: bericht.id,
        naar: contact.email,
        onderwerp: bericht.onderwerp,
        tekst: bericht.tekst,
        afmeldsleutel: contact.afmeldsleutel,
        ...(inAntwoordOp ? { inAntwoordOp } : {}),
      },
      {
        naam: camp.afzender_naam ?? "",
        email: camp.afzender_email,
        antwoordNaar: camp.antwoord_naar ?? camp.afzender_email,
      },
    );

    if (!uit.ok) {
      await context.supabase
        .from("outbound_messages")
        .update({ status: "mislukt", fout: uit.fout.slice(0, 500) })
        .eq("id", bericht.id);
      throw new Error(uit.fout);
    }
    return { ok: true };
  });

/** Een antwoord afvinken, of weer openzetten. */
export const zetAntwoordAf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), afgehandeld: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("outbound_replies")
      .update({ afgehandeld_op: data.afgehandeld ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Het bezorggebied opnieuw bepalen voor alle contacten van een agent.
 *
 * Nodig omdat de route pas is vastgelegd toen er al een lijst in stond, en
 * nodig blijft: een chauffeur die er een dorp bij neemt verandert de route, en
 * dan moet de hele lijst opnieuw langs de meetlat.
 */
export const bepaalGebiedOpnieuw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase
      .from("outbound_contacts")
      .select("id, plaats")
      .eq("agent_id", data.agentId)
      .limit(5000);
    if (error) throw new Error(error.message);

    let binnen = 0;
    let buiten = 0;
    let onbekend = 0;

    // Per uitkomst één opdracht in plaats van één per contact: bij honderden
    // contacten is dat het verschil tussen drie verzoeken en driehonderd.
    const groepen = new Map<string, string[]>();
    for (const r of rijen ?? []) {
      const uit = ligtInGebied(r.plaats);
      if (uit === null) onbekend++;
      else if (uit) binnen++;
      else buiten++;
      const sleutel = uit === null ? "leeg" : String(uit);
      groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), r.id]);
    }

    for (const [sleutel, ids] of groepen) {
      const waarde = sleutel === "leeg" ? null : sleutel === "true";
      for (let i = 0; i < ids.length; i += 200) {
        const { error: bijwerkFout } = await context.supabase
          .from("outbound_contacts")
          .update({ in_bezorggebied: waarde } as never)
          .in("id", ids.slice(i, i + 200));
        if (bijwerkFout) throw new Error(bijwerkFout.message);
      }
    }

    return { binnen, buiten, onbekend, totaal: rijen?.length ?? 0 };
  });

/**
 * Alles wat er met één contact is gebeurd, op volgorde.
 *
 * In één verzoek en niet in vier, want dit is een scherm dat je openslaat om
 * snel te zien waar iemand staat. Vier losse vragen zouden ook kunnen, maar dan
 * zie je de tijdlijn stukje bij beetje opbouwen en dat leest slechter dan hem
 * in één keer compleet te krijgen.
 */
export const haalContactReis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ contactId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: contact, error } = await context.supabase
      .from("outbound_contacts")
      .select("*")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contact) throw new Error("Dit contact bestaat niet, of is niet van jou.");

    const [berichten, antwoorden, bezorgingen] = await Promise.all([
      context.supabase
        .from("outbound_messages")
        .select(
          "id, stap, status, onderwerp, tekst, gepland_voor, verzonden_op, fout, aangemaakt_op",
        )
        .eq("contact_id", data.contactId)
        .order("stap"),
      context.supabase
        .from("outbound_replies")
        .select("id, onderwerp, tekst, ontvangen_op, afgehandeld_op")
        .eq("contact_id", data.contactId)
        .order("ontvangen_op"),
      context.supabase
        .from("outbound_deliveries")
        .select("id, bezorgdag, status, opvolging, opvolging_notitie, opvolging_op, notitie")
        .eq("contact_id", data.contactId)
        .order("bezorgdag"),
    ]);

    if (berichten.error) throw new Error(berichten.error.message);
    if (antwoorden.error) throw new Error(antwoorden.error.message);
    if (bezorgingen.error) throw new Error(bezorgingen.error.message);

    return {
      contact,
      berichten: berichten.data ?? [],
      antwoorden: antwoorden.data ?? [],
      bezorgingen: bezorgingen.data ?? [],
    };
  });

/**
 * Bestaande contacten aanvullen uit een nieuwe versie van dezelfde lijst.
 *
 * Nodig omdat een lijst eerder kan zijn ingelezen dan dat er velden voor
 * bestonden: de 137 relaties van FJ Snacks stonden er al voordat er een
 * adreskolom was. Opnieuw importeren helpt dan niet, want die slaat bestaande
 * adressen over.
 *
 * Er wordt alleen ingevuld wat leeg is, nooit overschreven. Iemand kan een naam
 * met de hand hebben verbeterd of een adres hebben gecorrigeerd na een
 * verhuizing; een import die dat terugdraait naar wat er in een oud bestand
 * stond, maakt stilletjes werk ongedaan.
 */
export const vulContactenAan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        contacten: z.array(contactSchema).min(1).max(5000),
        /**
         * Zet de soort relatie op deze waarde voor iedereen uit dit bestand.
         *
         * Dit is het enige veld dat wél overschreven mag worden, en alleen als
         * je er uitdrukkelijk om vraagt. Het bestaat omdat een lijst met één
         * verkeerde keuze kan worden ingelezen — en dan krijgen honderd
         * strandtenten het verhaal over een overleden eigenaar die ze nooit
         * hebben gekend. Het bestand zelf is de beste afbakening van wie het
         * betreft: precies de rijen die erin staan.
         */
        herkomst: z.enum(["oud_klant", "koud", "test"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: agent, error: agentFout } = await context.supabase
      .from("agents")
      .select("id")
      .eq("id", data.agentId)
      .eq("client_id", await eigenKlant(context))
      .maybeSingle();
    if (agentFout) throw new Error(agentFout.message);
    if (!agent) throw new Error("Deze agent bestaat niet, of is niet van jou.");

    const perEmail = new Map(data.contacten.map((c) => [c.email.toLowerCase(), c]));
    const adressen = [...perEmail.keys()];

    type Rij = {
      id: string;
      email: string;
      naam: string | null;
      bedrijf: string | null;
      plaats: string | null;
      telefoon: string | null;
      notitie: string | null;
      adres: string | null;
      postcode: string | null;
      laatst_besteld_op: string | null;
      herkomst: string;
    };

    const bestaand: Rij[] = [];
    for (let i = 0; i < adressen.length; i += 200) {
      const { data: rijen, error } = await context.supabase
        .from("outbound_contacts")
        .select(
          "id, email, naam, bedrijf, plaats, telefoon, notitie, adres, postcode, herkomst, laatst_besteld_op",
        )
        .eq("agent_id", data.agentId)
        .in("email", adressen.slice(i, i + 200));
      if (error) throw new Error(error.message);
      bestaand.push(...((rijen ?? []) as unknown as Rij[]));
    }

    let aangevuld = 0;
    let ongewijzigd = 0;
    let herkomstGewijzigd = 0;
    const velden = [
      "naam",
      "bedrijf",
      "plaats",
      "telefoon",
      "adres",
      "postcode",
      "notitie",
    ] as const;

    for (const rij of bestaand) {
      const bron = perEmail.get(rij.email.toLowerCase());
      if (!bron) continue;

      const bij: Record<string, string> = {};
      for (const veld of velden) {
        const huidig = rij[veld];
        const nieuw = (bron as Record<string, string | undefined>)[veld];
        if (nieuw && (huidig === null || String(huidig).trim() === "")) bij[veld] = nieuw;
      }
      // De datum van de laatste bestelling heet in het bestand anders dan in
      // de tabel; daarom apart. Ook hier: alleen invullen wat leeg was.
      if (bron.laatst_besteld && !rij.laatst_besteld_op) {
        bij["laatst_besteld_op"] = bron.laatst_besteld;
      }

      // De rij in het bestand mag zijn eigen herkomst meebrengen; die wint,
      // want daar staat het per contact. Anders geldt de keuze voor het hele
      // bestand.
      const nieuweHerkomst = bron.herkomst ?? data.herkomst;
      if (nieuweHerkomst && nieuweHerkomst !== rij.herkomst) {
        bij["herkomst"] = nieuweHerkomst;
      }

      if (Object.keys(bij).length === 0) {
        ongewijzigd++;
        continue;
      }
      if (bij["herkomst"]) herkomstGewijzigd++;

      const { error } = await context.supabase
        .from("outbound_contacts")
        .update(bij as never)
        .eq("id", rij.id);
      if (error) throw new Error(error.message);
      aangevuld++;
    }

    return {
      aangevuld,
      ongewijzigd,
      herkomstGewijzigd,
      nietGevonden: perEmail.size - bestaand.length,
      inLijst: perEmail.size,
    };
  });
