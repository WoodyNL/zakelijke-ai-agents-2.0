import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSlapend, metRust } from "@/lib/slapend";
import { mijnAgent, mijnCampagne } from "@/lib/agent-toegang";
import { bevatBedrag } from "@/lib/bedragen";
import { stelBerichtOp, zonderPrijzen, type KennisRegel } from "@/lib/bericht-opstellen.server";
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
  herkomst: z.enum(["oud_klant", "koud", "test"]),
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
        herkomst: z.enum(["oud_klant", "koud", "test"]),
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

    // De heractivatie-agent telt anders: alleen wie slapend is, niet wie met
    // rust gelaten wordt, en niet wie al terug is. Dat zijn dezelfde regels als
    // in bereidVoor (slapend.ts), zodat het getal klopt met wat er straks
    // werkelijk wordt klaargezet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kolommen die de gegenereerde types pas na de migratie kennen
    const { data: agent } = await (context.supabase as unknown as { from: (t: string) => any })
      .from("agents")
      .select("kind, opties")
      .eq("id", data.agentId)
      .maybeSingle();
    const heractivatie = (agent as { kind?: string } | null)?.kind === "heractivatie";
    const opties = ((agent as { opties?: Record<string, unknown> } | null)?.opties ?? {}) as Record<
      string,
      unknown
    >;

    const rijen = await gebied(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kolommen die de gegenereerde types pas na de migratie kennen
      (context.supabase as unknown as { from: (t: string) => any })
        .from("outbound_contacts")
        .select("id, email, bedrijf, laatst_besteld_op, teruggekomen_op, outbound_messages(stap)")
        .eq("agent_id", data.agentId)
        .eq("herkomst", data.herkomst)
        .is("afgemeld_op", null)
        .is("bounce_op", null)
        .limit(2000),
    );
    if (rijen.error) throw new Error(rijen.error.message);

    const slapendNa = Number(opties["slapend_na_maanden"]) || 12;
    const rust = Array.isArray(opties["nooit_aanschrijven"])
      ? (opties["nooit_aanschrijven"] as string[])
      : [];
    const inSelectie = (
      (rijen.data ?? []) as Array<{
        id: string;
        email: string;
        bedrijf: string | null;
        laatst_besteld_op: string | null;
        teruggekomen_op: string | null;
        outbound_messages: Array<{ stap: number }> | null;
      }>
    ).filter(
      (c) =>
        !heractivatie ||
        (!c.teruggekomen_op && isSlapend(c.laatst_besteld_op, slapendNa) && !metRust(c, rust)),
    );

    // Wie al een eerste bericht heeft gehad telt niet meer mee, ook niet als
    // dat uit een andere campagne kwam: bereidVoor kijkt naar de hele agent.
    const aantal = inSelectie.length;
    const alGehad = inSelectie.filter((c) =>
      (c.outbound_messages ?? []).some((m) => m.stap === 1),
    ).length;
    return { aantal, alGehad, nieuw: Math.max(aantal - alGehad, 0) };
  });

export const bewaarCampagne = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => campagneSchema.parse(d))
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);

    // Weigeren bij het opslaan en niet pas bij het opstellen. Een campagne met
    // een prijs erin mag niet bestaan: dan staat hij klaar, denkt iedereen dat
    // het goed is, en komt de fout pas boven op het moment dat er honderd
    // berichten klaargezet worden.
    for (const [veld, tekst] of [
      ["Wat bied je aan?", data.aanbod],
      ["de ondertekening", data.ondertekening],
    ] as const) {
      if (tekst && bevatBedrag(tekst)) {
        throw new Error(
          `Er staat een bedrag in "${veld}". Deze agent noemt geen prijzen: wie ernaar vraagt, wordt gebeld. Haal het bedrag eruit.`,
        );
      }
    }

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
        herkomst: z.enum(["oud_klant", "koud", "test"]),
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
        herkomst: contact.herkomst as "oud_klant" | "koud" | "test",
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
      // Wat de agent werkelijk heeft gezien, en wat is weggelaten. De ruwe
      // telling zou hier misleiden: de regel eronder nodigt je uit om te
      // controleren of alles uit de kennisbank komt, en dan moet het getal
      // slaan op wat er in de opdracht stond en niet op wat er in de database
      // staat.
      kennisItems: zonderPrijzen((kennis ?? []) as KennisRegel[]).length,
      kennisWeggelaten:
        (kennis?.length ?? 0) - zonderPrijzen((kennis ?? []) as KennisRegel[]).length,
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
    // Eigendom, niet leesbaarheid: hierna gaat het door met de service-role.
    await mijnCampagne(context as never, data.campagneId);

    const { bereidVoor, verstuurKlaarstaande } = await import("@/lib/campagne-uitvoeren.server");
    const voorbereiding = await bereidVoor(data.campagneId, data.portie);

    /**
     * Staat de campagne op "zelf versturen", dan gaat de post er in dezelfde
     * handeling uit.
     *
     * Dit is de enige plek in het platform waar één druk op de knop post de
     * deur uit doet zonder dat er een mens tussen heeft gelezen. Dat is een
     * bewuste keuze van de klant, instelbaar per campagne, en hij staat niet
     * standaard aan.
     *
     * Drie dingen houden hem in toom. De campagne moet op actief staan, en dat
     * is een tweede handeling. Er gaat hoogstens één portie tegelijk weg, dus
     * tien berichten en niet honderdzevenendertig. En het verzendvenster en
     * het dagmaximum gelden onverkort, want die zitten in het inplannen zelf.
     *
     * Staat de campagne uit, dan wordt er wél klaargezet en niets verstuurd.
     * Dat is geen storing maar precies de rem: de concepten staan er, en ze
     * gaan weg zodra je de campagne aanzet en op verzenden drukt.
     */
    // Eén vaste vorm, ook als er niets is verstuurd. Een veld dat soms wel en
    // soms niet bestaat, dwingt elke aanroeper tot raden.
    const uit: Klaarzetuitkomst = { ...voorbereiding, verstuurd: null, nietVerstuurd: null };

    const [campagne] = (await haalCampagneRij(context as never, data.campagneId)) ?? [];
    if (campagne?.verzendwijze !== "direct") return uit;

    if (!campagne.actief) {
      return { ...uit, nietVerstuurd: "de campagne staat uit, dus er ging niets weg" };
    }
    if (voorbereiding.klaargezet === 0) return uit;

    return { ...uit, verstuurd: await verstuurKlaarstaande(data.campagneId) };
  });

export type Klaarzetuitkomst = {
  klaargezet: number;
  overgeslagen: Array<{ email: string; reden: string }>;
  resterend: number;
  /** Alleen gevuld bij "zelf versturen", en alleen als er echt iets wegging. */
  verstuurd: { ingepland: number; mislukt: Array<{ email: string; reden: string }> } | null;
  /** Waarom er bij "zelf versturen" tóch niets wegging. */
  nietVerstuurd: string | null;
};

/** De twee velden die bepalen of er direct verstuurd mag worden. */
async function haalCampagneRij(
  context: { supabase: unknown },
  campagneId: string,
): Promise<Array<{ verzendwijze: string; actief: boolean }> | null> {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, w: string) => Promise<{ data: unknown }>;
      };
    };
  };
  const { data } = await sb
    .from("outbound_campaigns")
    .select("verzendwijze, actief")
    .eq("id", campagneId);
  return (data as Array<{ verzendwijze: string; actief: boolean }> | null) ?? null;
}

/** De klaarstaande berichten inplannen bij Resend. */
export const verstuurCampagne = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Eigendom, niet leesbaarheid: hierna gaat het door met de service-role.
    await mijnCampagne(context as never, data.campagneId);

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
        "id, campaign_id, stap, status, onderwerp, tekst, gepland_voor, verzonden_op, fout, aangemaakt_op, outbound_contacts(naam, bedrijf, email)",
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
    // Eigendom, niet leesbaarheid: hierna gaat het door met de service-role.
    await mijnCampagne(context as never, data.campagneId);

    const mod = await import("@/lib/campagne-uitvoeren.server");
    return mod.bereidOpvolgingVoor(data.campagneId, data.portie);
  });

/** De klaarstaande opvolgingen inplannen, elk op zijn eigen moment. */
export const verstuurOpvolging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Eigendom, niet leesbaarheid: hierna gaat het door met de service-role.
    await mijnCampagne(context as never, data.campagneId);

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
      .object({
        campagneId: z.string().uuid(),
        portie: z.number().int().min(1).max(50).default(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Eigendom, niet leesbaarheid: hierna gaat het door met de service-role.
    await mijnCampagne(context as never, data.campagneId);
    const mod = await import("@/lib/campagne-uitvoeren.server");
    return mod.bereidNavraagVoor(data.campagneId, data.portie);
  });

/** De klaarstaande navraagberichten inplannen. */
export const verstuurNavraag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ campagneId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Eigendom, niet leesbaarheid: hierna gaat het door met de service-role.
    await mijnCampagne(context as never, data.campagneId);
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
