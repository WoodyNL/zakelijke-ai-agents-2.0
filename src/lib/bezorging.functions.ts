import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .select("id, bezorgdag, adres, status, notitie, contact_id, outbound_contacts(naam, bedrijf, plaats, email)")
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
    const [{ data: antwoorden, error: aFout }, { data: bezorgd, error: bFout }] = await Promise.all([
      context.supabase
        .from("outbound_replies")
        .select("contact_id, outbound_contacts(naam, bedrijf, plaats, email)")
        .eq("agent_id", data.agentId)
        .not("contact_id", "is", null),
      context.supabase
        .from("outbound_deliveries")
        .select("contact_id")
        .eq("agent_id", data.agentId),
    ]);
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
    const { error } = await context.supabase.from("outbound_deliveries").insert({
      agent_id: data.agentId,
      contact_id: data.contactId,
      bezorgdag: data.bezorgdag,
      adres: data.adres ?? null,
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
