import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent, nietGepauzeerd } from "@/lib/agent-toegang";

/**
 * Proefpakketten inplannen op een vrijdag.
 *
 * Dit is het enige station dat buiten de software valt: er rijdt een mens met
 * een bus. De software doet hier één ding, en dat is voorkomen dat er meer
 * wordt toegezegd dan er in die bus past.
 *
 * Dat de dag een vrijdag moet zijn, staat in de database als harde regel. Hier
 * wordt dat niet nog eens gecontroleerd — één plek waar zo'n regel staat is
 * beter dan twee die uit elkaar kunnen lopen.
 */

export const haalBezorgingen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase
      .from("outbound_deliveries")
      .select(
        "id, bezorgdag, adres, status, notitie, opvolging, bevestiging, bevestiging_op, adres_eerder, adres_bron, contact_id, outbound_contacts(naam, bedrijf, plaats, email)",
      )
      .eq("agent_id", data.agentId)
      .order("bezorgdag", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return rijen ?? [];
  });

/** Contacten die hebben geantwoord en nog geen bezorging hebben staan. */
export const haalKandidaten = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [{ data: antwoorden, error: aFout }, { data: bezorgd, error: bFout }] = await Promise.all(
      [
        context.supabase
          .from("outbound_replies")
          .select("contact_id, outbound_contacts(naam, bedrijf, plaats, email)")
          .eq("agent_id", data.agentId)
          .not("contact_id", "is", null),
        context.supabase
          .from("outbound_deliveries")
          .select("contact_id")
          .eq("agent_id", data.agentId),
      ],
    );
    if (aFout) throw new Error(aFout.message);
    if (bFout) throw new Error(bFout.message);

    const heeft = new Set((bezorgd ?? []).map((d) => d.contact_id));
    const gezien = new Set<string>();
    return (antwoorden ?? [])
      .filter((a) => {
        if (!a.contact_id || heeft.has(a.contact_id) || gezien.has(a.contact_id)) return false;
        gezien.add(a.contact_id);
        return true;
      })
      .map((a) => ({ contactId: a.contact_id!, contact: a.outbound_contacts }));
  });

export const planBezorging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        contactId: z.string().uuid(),
        bezorgdag: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een datum."),
        adres: z.string().max(300).nullable().optional(),
        notitie: z.string().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Het adres wordt hier overgenomen en niet later opgezocht. Een bezorging is
    // een afspraak voor een bepaalde dag; verhuist een zaak daarna, dan moet de
    // chauffeur nog steeds het adres zien waar hij naartoe zou gaan.
    let adres = data.adres ?? null;
    if (!adres) {
      const { data: c } = await context.supabase
        .from("outbound_contacts")
        .select("adres, postcode, plaats")
        .eq("id", data.contactId)
        .maybeSingle();
      const delen = [c?.adres, [c?.postcode, c?.plaats].filter(Boolean).join(" ")].filter(Boolean);
      adres = delen.length > 0 ? delen.join(", ") : null;
    }

    const { error } = await context.supabase.from("outbound_deliveries").insert({
      agent_id: data.agentId,
      contact_id: data.contactId,
      bezorgdag: data.bezorgdag,
      adres,
      notitie: data.notitie ?? null,
      status: "afgesproken",
    });
    if (error) {
      // De database weigert een andere dag dan vrijdag. Die melding is voor een
      // mens onleesbaar, dus vertalen we hem hier één keer.
      if (error.message.includes("bezorgdag_is_vrijdag")) {
        throw new Error("Kies een vrijdag — dat is de dag dat de chauffeur rijdt.");
      }
      if (error.message.includes("outbound_deliveries_uniek")) {
        throw new Error("Voor dit contact staat op die dag al een bezorging.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const zetBezorgingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["afgesproken", "bezorgd", "afgezegd"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("outbound_deliveries")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Vastleggen wat er ná de bezorging met een mens is gebeurd.
 *
 * Dit is het enige stuk van de trechter dat geen software doet, en juist
 * daarom hoort het bijgehouden te worden. Een warme klant die niet is gebeld,
 * verdwijnt tussen de honderd andere — en dat is precies de klant die het
 * meeste waard was.
 */
export const zetOpvolging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        opvolging: z.enum([
          "open",
          "navraag_uit",
          "wil_gesprek",
          "gebeld",
          "bezocht",
          "klant",
          "geen_interesse",
        ]),
        notitie: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("outbound_deliveries")
      .update({
        opvolging: data.opvolging,
        opvolging_op: new Date().toISOString(),
        ...(data.notitie !== undefined ? { opvolging_notitie: data.notitie } : {}),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Woensdag de vraag uitzetten: schikt het vrijdag?
 *
 * Eén knop per bezorgdag, en niet per pakket. Acht keer op een knopje drukken
 * om acht keer dezelfde vraag te stellen is werk dat de software hoort te doen,
 * en het is bovendien de handeling waarbij je er eentje overslaat.
 *
 * Er wordt meteen verstuurd en niet klaargezet. Een bevestiging voor overmorgen
 * die als concept blijft staan is geen bevestiging meer, en het gaat om het
 * aantal dat in één bus past — niet om honderd koude mails.
 */
export const vraagBevestiging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        bezorgdag: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een datum."),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { verstuurBevestigingen } = await import("@/lib/bezorgbevestiging.server");
    return verstuurBevestigingen(data.agentId, data.bezorgdag);
  });

/**
 * Een adreswijziging terugdraaien.
 *
 * Het adres wordt automatisch bijgewerkt als iemand er in zijn antwoord een
 * ander noemt, want anders staat de chauffeur vrijdag alsnog op het oude adres.
 * Maar een model dat een zin verkeerd leest bestaat, dus moet één klik het
 * kunnen terugzetten — en daarvoor is het oude adres bewaard.
 */
export const herstelAdres = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rij, error: leesFout } = await context.supabase
      .from("outbound_deliveries")
      .select("adres_eerder")
      .eq("id", data.id)
      .maybeSingle();
    if (leesFout) throw new Error(leesFout.message);
    const eerder = (rij as { adres_eerder?: string | null } | null)?.adres_eerder ?? null;

    const { error } = await context.supabase
      .from("outbound_deliveries")
      .update({
        adres: eerder,
        adres_eerder: null,
        adres_bron: null,
        bevestiging: "bevestigd",
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * De bevestiging met de hand zetten.
 *
 * Een pakket gaat alleen mee als de klant heeft bevestigd. Maar een klant
 * bevestigt niet altijd per mail: hij belt, of hij zegt het tegen de chauffeur
 * die er toch al langsreed. Zonder deze knop zou zo iemand alsnog afvallen, en
 * dan is de regel geen bescherming meer maar een obstakel.
 *
 * Wie het heeft gezet is hier niet te zien, en dat is bewust: dit scherm is van
 * één bedrijf en er kijkt één man naar. Een logboek dat niemand leest, is
 * alleen een kolom.
 */
export const zetBevestiging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        bevestiging: z.enum([
          "niet_gevraagd",
          "gevraagd",
          "bevestigd",
          "ander_adres",
          "verzet",
          "afgezegd",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("outbound_deliveries")
      .update({
        bevestiging: data.bevestiging,
        bevestiging_op: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
