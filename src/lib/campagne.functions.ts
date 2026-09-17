import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent } from "@/lib/agent-toegang";
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
  /** Voor wie deze campagne bedoeld is; zie de kolom in_bezorggebied. */
  doelgroep: z.enum(["alles", "binnen_gebied", "buiten_gebied"]).default("alles"),
  afzenderNaam: z.string().max(120).nullable().optional(),
  afzenderEmail: z.string().email().max(254).nullable().optional(),
  antwoordNaar: z.string().email().max(254).nullable().optional(),
  aanbod: z.string().max(600).nullable().optional(),
  ondertekening: z.string().max(200).nullable().optional(),
  dagmaximum: z.number().int().min(1).max(500),
  actief: z.boolean(),
});


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

/**
 * Hoeveel contacten raakt deze selectie?
 *
 * Twee keuzelijsten die "oud-klanten" en "binnen het bezorggebied" zeggen,
 * blijven abstract tot er een getal onder staat. Dat getal is ook de laatste
 * controle vóór het klaarzetten: staat er 211 waar je 37 verwachtte, dan klopt
 * er iets niet aan je selectie, en dat merk je nu in plaats van achteraf.
 *
 * De filters zijn met opzet letterlijk dezelfde als in bereidVoor. Twee keer
 * dezelfde regel op twee plekken opschrijven is een risico, maar een getal dat
 * anders telt dan er verstuurd wordt is erger dan een risico: dat is een
 * belofte die niet klopt.
 */
export const telDoelgroep = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        herkomst: z.enum(["oud_klant", "koud"]),
        doelgroep: z.enum(["alles", "binnen_gebied", "buiten_gebied"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const gebied = <T extends { or: (s: string) => T; is: (k: string, w: null | boolean) => T }>(
      q: T,
    ): T => {
      // Onbekend gebied telt mee bij "binnen": iemand buitensluiten omdat er
      // geen plaats is ingevuld, is erger dan hem een bericht sturen dat
      // misschien niet past.
      if (data.doelgroep === "binnen_gebied") {
        return q.or("in_bezorggebied.is.true,in_bezorggebied.is.null");
      }
      if (data.doelgroep === "buiten_gebied") return q.is("in_bezorggebied", false);
      return q;
    };

    const totaal = await gebied(
      context.supabase
        .from("outbound_contacts")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", data.agentId)
        .eq("herkomst", data.herkomst)
        .is("afgemeld_op", null)
        .is("bounce_op", null),
    );
    if (totaal.error) throw new Error(totaal.error.message);

    // Wie al een eerste bericht heeft gehad telt niet meer mee, ook niet als
    // dat uit een andere campagne kwam: bereidVoor kijkt naar de hele agent,
    // niet naar deze campagne. Een contact krijgt maar één keer een eerste
    // bericht, en de unieke index op (contact_id, stap) maakt deze join precies
    // één rij per contact.
    const gehad = await gebied(
      context.supabase
        .from("outbound_contacts")
        .select("id, outbound_messages!inner(id)", { count: "exact", head: true })
        .eq("agent_id", data.agentId)
        .eq("herkomst", data.herkomst)
        .is("afgemeld_op", null)
        .is("bounce_op", null)
        .eq("outbound_messages.stap", 1),
    );
    if (gehad.error) throw new Error(gehad.error.message);

    const aantal = totaal.count ?? 0;
    const alGehad = gehad.count ?? 0;
    return { aantal, alGehad, nieuw: Math.max(aantal - alGehad, 0) };
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
      doelgroep: data.doelgroep,
    } as TablesInsert<"outbound_campaigns">;

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

/**
 * Een portie berichten klaarzetten.
 *
 * De eigendomscontrole staat hier en niet in de uitvoering. Die draait met de
 * service-role en komt overal bij; wat hem tegenhoudt is dat hij alleen wordt
 * aangeroepen nadat hier is vastgesteld dat deze gebruiker bij deze campagne
 * hoort.
 */
export const bereidCampagneVoor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        campagneId: z.string().uuid(),
        // Klein beginnen is hier de bedoeling: na tien berichten weet je of de
        // toon klopt, en dan pas zet je de rest klaar.
        portie: z.number().int().min(1).max(50).default(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: campagne, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id, agent_id")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campagne) throw new Error("Deze campagne bestaat niet, of is niet van jou.");

    const { bereidVoor } = await import("@/lib/campagne-uitvoeren.server");
    return bereidVoor(data.campagneId, data.portie);
  });

/** De klaarstaande berichten inplannen bij Resend. */
export const verstuurCampagne = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: campagne, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id, agent_id")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campagne) throw new Error("Deze campagne bestaat niet, of is niet van jou.");

    const { verstuurKlaarstaande } = await import("@/lib/campagne-uitvoeren.server");
    return verstuurKlaarstaande(data.campagneId);
  });

/** Wat er klaarstaat, gepland is of al weg is. */
export const haalBerichten = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase
      .from("outbound_messages")
      .select(
        "id, stap, status, onderwerp, tekst, gepland_voor, verzonden_op, fout, aangemaakt_op, outbound_contacts(naam, bedrijf, email)",
      )
      .eq("agent_id", data.agentId)
      .order("aangemaakt_op", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return rijen ?? [];
  });

/** Opvolgberichten klaarzetten voor wie niet heeft geantwoord. */
export const bereidOpvolgingVoor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        campagneId: z.string().uuid(),
        portie: z.number().int().min(1).max(50).default(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: campagne, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campagne) throw new Error("Deze campagne bestaat niet, of is niet van jou.");

    const mod = await import("@/lib/campagne-uitvoeren.server");
    return mod.bereidOpvolgingVoor(data.campagneId, data.portie);
  });

/** De klaarstaande opvolgingen inplannen, elk op zijn eigen moment. */
export const verstuurOpvolging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: campagne, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campagne) throw new Error("Deze campagne bestaat niet, of is niet van jou.");

    const mod = await import("@/lib/campagne-uitvoeren.server");
    return mod.verstuurOpvolging(data.campagneId);
  });

/** De trechter: van lijst tot doos op de toonbank. */
export const haalTrechter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rijen, error } = await context.supabase.rpc("outbound_trechter", {
      _agent_id: data.agentId,
    });
    if (error) throw new Error(error.message);
    // Geen rij betekent geen toegang of geen gegevens; in beide gevallen is
    // nul tonen eerlijker dan een foutmelding op het dashboard.
    const r = rijen?.[0];
    return (
      r ?? {
        contacten: 0,
        bereikbaar: 0,
        aangeschreven: 0,
        opgevolgd: 0,
        in_gesprek: 0,
        afspraak: 0,
        bezorgd: 0,
        gesproken: 0,
        klant: 0,
        afgemeld: 0,
        gebouncet: 0,
      }
    );
  });

export type Trechter = {
  contacten: number;
  bereikbaar: number;
  aangeschreven: number;
  opgevolgd: number;
  in_gesprek: number;
  afspraak: number;
  bezorgd: number;
  gesproken: number;
  klant: number;
  afgemeld: number;
  gebouncet: number;
};

/** Navraag klaarzetten voor wie een proefpakket heeft gehad. */
export const bereidNavraagVoor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ campagneId: z.string().uuid(), portie: z.number().int().min(1).max(50).default(10) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: c, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Deze campagne bestaat niet, of is niet van jou.");
    const mod = await import("@/lib/campagne-uitvoeren.server");
    return mod.bereidNavraagVoor(data.campagneId, data.portie);
  });

/** De klaarstaande navraagberichten inplannen. */
export const verstuurNavraag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: c, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Deze campagne bestaat niet, of is niet van jou.");
    const mod = await import("@/lib/campagne-uitvoeren.server");
    return mod.verstuurNavraag(data.campagneId);
  });

/**
 * Een campagne verwijderen.
 *
 * Berichten overleven dit: die hangen er met ON DELETE SET NULL aan, dus ze
 * blijven staan en raken alleen hun campagne kwijt. Dat is precies waarom er
 * een grendel op zit. Een campagne waarvan al post is vertrokken, is de enige
 * uitleg bij die berichten — wie hem weggooit, houdt een geschiedenis over
 * waarvan niemand meer weet waar hij bij hoorde.
 *
 * Klaargezette concepten mogen wel weg. Die zijn nooit verstuurd en niemand
 * heeft ze gezien.
 */
export const verwijderCampagne = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: campagne, error } = await context.supabase
      .from("outbound_campaigns")
      .select("id, naam")
      .eq("id", data.campagneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campagne) throw new Error("Deze campagne bestaat niet, of is niet van jou.");

    const { data: verstuurd, error: telFout } = await context.supabase
      .from("outbound_messages")
      .select("id")
      .eq("campaign_id", data.campagneId)
      .in("status", ["gepland", "verzonden", "beantwoord"])
      .limit(1);
    if (telFout) throw new Error(telFout.message);

    if (verstuurd && verstuurd.length > 0) {
      throw new Error(
        `Uit "${campagne.naam}" is al post vertrokken of ingepland. Die campagne is de enige uitleg bij die berichten, dus hij blijft staan. Zet hem op uit als je hem niet meer wilt gebruiken.`,
      );
    }

    // Klaargezette concepten horen mee te gaan: zonder campagne zijn ze
    // stuurloos, en niemand heeft ze ooit gezien.
    const { error: conceptFout } = await context.supabase
      .from("outbound_messages")
      .delete()
      .eq("campaign_id", data.campagneId)
      .eq("status", "concept");
    if (conceptFout) throw new Error(conceptFout.message);

    const { error: wegFout } = await context.supabase
      .from("outbound_campaigns")
      .delete()
      .eq("id", data.campagneId);
    if (wegFout) throw new Error(wegFout.message);

    return { ok: true, naam: campagne.naam };
  });
