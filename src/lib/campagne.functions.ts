import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { stelBerichtOp, type KennisRegel } from "@/lib/bericht-opstellen.server";
import type { TablesInsert } from "@/integrations/supabase/types";

/**
 * Campagnes instellen, en zien wat eruit komt voordat er iets weggaat.
 *
 * Het voorbeeld is hier geen extraatje. Een campagne is de enige handeling in
 * dit platform die je niet kunt terugdraaien: honderd berichten zijn honderd
 * berichten. Dus hoort er een moment tussen waarop een mens leest wat er staat,
 * met de echte kennisbank en een echte naam uit de lijst erin.
 */

const campagneSchema = z.object({
  id: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  naam: z.string().min(1).max(120),
  herkomst: z.enum(["oud_klant", "koud"]),
  verzendwijze: z.enum(["concept", "direct"]),
  afzenderNaam: z.string().max(120).nullable().optional(),
  afzenderEmail: z.string().email().max(254).nullable().optional(),
  antwoordNaar: z.string().email().max(254).nullable().optional(),
  aanbod: z.string().max(600).nullable().optional(),
  ondertekening: z.string().max(200).nullable().optional(),
  dagmaximum: z.number().int().min(1).max(500),
  actief: z.boolean(),
});

async function mijnAgent(context: { supabase: ReturnType<typeof Object> }, agentId: string) {
  const sb = (context as { supabase: any }).supabase;
  const { data, error } = await sb.from("agents").select("id, name").eq("id", agentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze agent bestaat niet, of is niet van jou.");
  return data as { id: string; name: string };
}

export const haalCampagnes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase
      .from("outbound_campaigns")
      .select("*")
      .eq("agent_id", data.agentId)
      .order("aangemaakt_op", { ascending: false });
    if (error) throw new Error(error.message);
    return rijen ?? [];
  });

export const bewaarCampagne = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => campagneSchema.parse(d))
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);

    const rij: TablesInsert<"outbound_campaigns"> = {
      agent_id: data.agentId,
      naam: data.naam,
      herkomst: data.herkomst,
      verzendwijze: data.verzendwijze,
      afzender_naam: data.afzenderNaam ?? null,
      afzender_email: data.afzenderEmail ?? null,
      antwoord_naar: data.antwoordNaar ?? null,
      aanbod: data.aanbod ?? null,
      ondertekening: data.ondertekening ?? null,
      dagmaximum: data.dagmaximum,
      actief: data.actief,
    };

    const { error } = data.id
      ? await context.supabase.from("outbound_campaigns").update(rij).eq("id", data.id)
      : await context.supabase.from("outbound_campaigns").insert(rij);
    if (error) throw new Error(error.message);
    return { ok: true, melding: data.id ? "Campagne bijgewerkt." : "Campagne aangemaakt." };
  });

/**
 * Stelt één bericht op zonder het te versturen of te bewaren.
 *
 * Er wordt met opzet een echt contact uit de lijst gebruikt en niet een
 * verzonnen "Jan Jansen". Een voorbeeld dat er goed uitziet op een bedachte
 * naam zegt niets over wat er gebeurt bij een contact waarvan alleen een
 * initiaal bekend is, of waar geen bedrijfsnaam bij staat.
 */
export const maakVoorbeeld = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        herkomst: z.enum(["oud_klant", "koud"]),
        aanbod: z.string().min(1).max(600),
        ondertekening: z.string().min(1).max(200),
        /** Leeg = de eerste passende uit de lijst. */
        contactId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);

    const zoeker = context.supabase
      .from("outbound_contacts")
      .select("id, naam, bedrijf, plaats, herkomst")
      .eq("agent_id", data.agentId)
      .is("afgemeld_op", null)
      .limit(1);

    const { data: contacten, error: cFout } = await (data.contactId
      ? zoeker.eq("id", data.contactId)
      : zoeker.eq("herkomst", data.herkomst));
    if (cFout) throw new Error(cFout.message);

    const contact = contacten?.[0];
    if (!contact) {
      throw new Error(
        data.contactId
          ? "Dat contact is niet gevonden."
          : `Er staat nog geen contact van dit soort in de lijst. Laad eerst een lijst in bij Contacten.`,
      );
    }

    const { data: kennis, error: kFout } = await context.supabase
      .from("knowledge_items")
      .select("category, title, content")
      .eq("agent_id", data.agentId)
      .eq("is_active", true)
      .order("sort_order")
      .limit(200);
    if (kFout) throw new Error(kFout.message);

    const concept = await stelBerichtOp({
      contact: {
        naam: contact.naam ?? undefined,
        bedrijf: contact.bedrijf ?? undefined,
        plaats: contact.plaats ?? undefined,
        herkomst: contact.herkomst as "oud_klant" | "koud",
      },
      kennis: (kennis ?? []) as KennisRegel[],
      bedrijfsnaam: data.ondertekening.split(",").pop()?.trim() || data.ondertekening,
      ondertekening: data.ondertekening,
      aanbod: data.aanbod,
    });

    return {
      ...concept,
      voor: {
        naam: contact.naam,
        bedrijf: contact.bedrijf,
        plaats: contact.plaats,
        herkomst: contact.herkomst,
      },
      kennisItems: kennis?.length ?? 0,
    };
  });
