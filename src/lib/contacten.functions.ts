import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";
import { ligtInGebied } from "@/lib/bezorggebied";

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
  telefoon: z.string().max(60).optional(),
  /** Staat er in het bestand zelf of dit een klant of een prospect is, dan wint dat. */
  herkomst: z.enum(["oud_klant", "koud"]).optional(),
});

const importSchema = z.object({
  agentId: z.string().uuid(),
  /** De keuze bij de import; geldt voor elke rij die het zelf niet zegt. */
  herkomst: z.enum(["oud_klant", "koud"]),
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
      if (c.telefoon) rij.telefoon = c.telefoon;
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
    return rijen ?? [];
  });

/** Een antwoord afvinken, of weer openzetten. */
export const zetAntwoordAf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), afgehandeld: z.boolean() }).parse(d),
  )
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
