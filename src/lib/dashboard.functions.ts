import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { leesKlant } from "@/lib/klant";
import { ALLE_SCHERMEN, SOORTEN, type AgentSoort, type Scherm } from "@/lib/agent-soorten";

type Ctx = { supabase: any; userId: string };

/** Voor tabellen die nog niet in de gegenereerde types staan. */
type Ongetypt = {
  from: (tabel: string) => {
    select: (kolommen: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Beheerder of support: mag het overzicht in /admin zien, niets wijzigen. */
async function assertStaf(context: Ctx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const rollen = ((data ?? []) as Array<{ role: string }>).map((r) => r.role as string);
  if (!rollen.includes("admin") && !rollen.includes("support")) {
    throw new Error("Geen toegang tot het beheer");
  }
}

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Geen beheerdersrechten");
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    const rollen = (roles ?? []).map((r: { role: string }) => r.role as string);
    const isAdmin = rollen.includes("admin");
    // Staf: wie bij ons werkt. Een support-medewerker ziet /admin en mag
    // meekijken, maar wijzigt niets (fase 5).
    const isStaf = isAdmin || rollen.includes("support");
    // Eigenaar van het klantaccount, of een teamlid dat is uitgenodigd. Staat
    // de functie er nog niet, dan is iedereen eigenaar, zoals tot nu toe.
    const eigenaar = await (context.supabase as unknown as Rpc).rpc("ben_eigenaar");
    return {
      id: context.userId,
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      isAdmin,
      isStaf,
      isEigenaar: eigenaar.error ? true : eigenaar.data === true,
    };
  });

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Alleen de agents van de eigen klant, ook voor een beheerder. RLS laat een
    // beheerder alle agents zien, want die heeft hij nodig in /admin; maar het
    // klantportaal is voor ieder zijn eigen portaal. Tijdens meekijken is dat
    // het portaal van de klant bij wie wordt meegekeken (zie lib/klant.ts).
    const { data: agents, error } = await context.supabase
      .from("agents")
      .select("*")
      .eq("client_id", await leesKlant(context))
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (agents ?? []).map((a: { id: string }) => a.id);
    if (ids.length === 0) return [];

    const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const { data: stats } = await context.supabase
      .from("agent_stats")
      .select("*")
      .in("agent_id", ids)
      .gte("date", since)
      .order("date", { ascending: true });

    // Naast de handmatige metingen ook wat we automatisch tellen: gesprekken,
    // leads en het verbruik per dag. Een chat-assistent heeft geen metingen;
    // zonder dit stond er "0 acties" bij een agent die wel degelijk praatte.
    const db = context.supabase as unknown as Rpc;
    const geteld = await Promise.all(
      (agents ?? []).map(async (a: { id: string }) => {
        const [kern, dagen] = await Promise.all([
          db.rpc("agent_kerncijfers", { _agent_id: a.id, _dagen: 30 }),
          db.rpc("agent_usage_daily", { _agent_id: a.id, _days: 30 }),
        ]);
        const k = ((kern.data ?? []) as Array<{ gesprekken: number; leads: number }>)[0];
        return {
          id: a.id,
          gesprekken30: Number(k?.gesprekken ?? 0),
          leads30: Number(k?.leads ?? 0),
          verbruikPerDag: ((dagen.data ?? []) as Array<{ dag: string; requests: number }>).map(
            (d) => ({ date: d.dag, output_count: Number(d.requests) }),
          ),
        };
      }),
    );

    return (agents ?? []).map((a: any) => {
      const rows = (stats ?? []).filter((s: any) => s.agent_id === a.id);
      const total = rows.reduce((sum: number, s: any) => sum + (s.output_count ?? 0), 0);
      const scored = rows.filter((s: any) => s.performance_score != null);
      const score = scored.length
        ? scored.reduce((sum: number, s: any) => sum + Number(s.performance_score), 0) /
          scored.length
        : null;
      const g = geteld.find((x) => x.id === a.id);
      return {
        ...a,
        total30: total,
        score30: score,
        series: rows,
        gesprekken30: g?.gesprekken30 ?? 0,
        leads30: g?.leads30 ?? 0,
        verbruikPerDag: g?.verbruikPerDag ?? [],
      };
    });
  });

export const getAgent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ agentId: z.string().uuid(), days: z.number().int().min(0).max(3650) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: agent, error } = await context.supabase
      .from("agents")
      .select("*")
      .eq("id", data.agentId)
      .eq("client_id", await leesKlant(context))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agent) throw new Error("Agent niet gevonden");

    let query = context.supabase
      .from("agent_stats")
      .select("*")
      .eq("agent_id", data.agentId)
      .order("date", { ascending: true });
    if (data.days > 0) {
      const since = new Date(Date.now() - (data.days - 1) * 86400000).toISOString().slice(0, 10);
      query = query.gte("date", since);
    }
    const { data: stats } = await query;
    return { agent, stats: stats ?? [] };
  });

/** Het begin van de huidige maand in Nederlandse tijd, als ISO-tijdstip. */
function begin_van_maand_amsterdam(nu = new Date()) {
  const deel = (opties: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", ...opties }).format(nu);
  const jaar = deel({ year: "numeric" });
  const maand = deel({ month: "2-digit" });
  // Op de eerste van de maand om middernacht geldt dezelfde tijdzone als nu,
  // behalve in de nacht van een zomertijdwissel; die valt nooit op de eerste.
  const verschil = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    timeZoneName: "shortOffset",
  })
    .formatToParts(nu)
    .find((p) => p.type === "timeZoneName")
    ?.value.replace("GMT", "");
  const uren = Number(verschil || "+1");
  const teken = uren < 0 ? "-" : "+";
  return `${jaar}-${maand}-01T00:00:00${teken}${String(Math.abs(uren)).padStart(2, "0")}:00`;
}

export const adminListClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaf(context as Ctx);
    const [{ data: profiles }, { data: agents }, { data: rollen }, leden] = await Promise.all([
      context.supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      context.supabase.from("agents").select("*").order("created_at", { ascending: true }),
      context.supabase.from("user_roles").select("user_id, role"),
      (context.supabase as unknown as Ongetypt).from("klantleden").select("user_id, client_id"),
    ]);

    // Een klant is een profiel zonder staf-rol dat geen teamlid van een ander
    // account is. Medewerkers en teamleden staan anders als losse "klant" in
    // de lijst, zonder agents.
    const staf = new Set(
      ((rollen ?? []) as Array<{ user_id: string; role: string }>)
        .filter((r) => r.role === "admin" || r.role === "support")
        .map((r) => r.user_id),
    );
    const teamleden = (leden.data ?? []) as Array<{ user_id: string; client_id: string }>;
    const isTeamlid = new Set(teamleden.map((l) => l.user_id));

    // Wat een beheerder per agent moet weten om te zien of hij draait: wanneer
    // hij voor het laatst iets deed, en hoeveel hij deze maand verbruikt
    // tegenover de afgesproken fair use. Allemaal aantallen, geen inhoud.
    // Rechtstreeks uit agent_usage en niet via agent_month_summary: die functie
    // kent alleen de beheerder, en support moet hetzelfde getal zien.
    const vanaf = begin_van_maand_amsterdam();
    const bijgewerkt = await Promise.all(
      (agents ?? []).map(async (a: any) => {
        const [laatste, maand] = await Promise.all([
          context.supabase
            .from("agent_usage")
            .select("hour")
            .eq("agent_id", a.id)
            .gt("requests", 0)
            .order("hour", { ascending: false })
            .limit(1)
            .maybeSingle(),
          context.supabase
            .from("agent_usage")
            .select("billable_requests")
            .eq("agent_id", a.id)
            .gte("hour", vanaf),
        ]);
        const verbruik = ((maand.data ?? []) as Array<{ billable_requests: number }>).reduce(
          (som, r) => som + Number(r.billable_requests ?? 0),
          0,
        );
        return {
          ...a,
          laatste_activiteit: (laatste.data as { hour: string } | null)?.hour ?? null,
          verbruik_maand: verbruik,
        };
      }),
    );

    // Een medewerker met eigen agents (onze website-assistent hangt aan het
    // account van de beheerder) komt er wél in, gemarkeerd als eigen. Anders
    // ontbreekt juist de agent die altijd live staat.
    return (profiles ?? [])
      .map((p: any) => ({
        ...p,
        eigen: staf.has(p.id),
        teamleden: teamleden.filter((l) => l.client_id === p.id).length,
        agents: bijgewerkt.filter((a: any) => a.client_id === p.id),
      }))
      .filter((p: any) => !isTeamlid.has(p.id) && (!p.eigen || p.agents.length > 0));
  });

export const adminCreateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error) throw new Error(error.message);
    const id = created.user?.id;
    if (id) {
      await supabaseAdmin.from("profiles").update({ name: data.name }).eq("id", id);
    }
    return { id };
  });

export const adminSaveAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        clientId: z.string().uuid(),
        name: z.string().min(1),
        description: z.string().default(""),
        metricLabel: z.string().default("acties"),
        scoreLabel: z.string().default("prestatiescore"),
        status: z.enum(["live", "paused", "setup"]),
        // Uit SOORTEN en niet met de hand: een eigen lijst hier liep achter,
        // waardoor "Uitgaande e-mailagent" niet op te slaan was.
        kind: z.enum(Object.keys(SOORTEN) as [AgentSoort, ...AgentSoort[]]).optional(),

        // De afspraken met de klant waarmee het dashboard berichten omrekent
        // naar tijd en geld. Leeg mag: dan toont het dashboard dat cijfer niet,
        // en dat is beter dan een getal dat nergens op rust.
        minutesSavedPerAction: z.number().min(0).max(600).nullable().optional(),
        minutesSavedBasis: z.string().max(200).nullable().optional(),
        hourlyRate: z.number().min(0).max(1000).nullable().optional(),
        hourlyRateBasis: z.string().max(200).nullable().optional(),
        fairUsePerMonth: z.number().int().min(0).max(1000000).nullable().optional(),
        overagePrice: z.number().min(0).max(100).optional(),
        /**
         * Het stuk vóór de apenstaart van het ontvangstadres waarop antwoorden
         * van klanten binnenkomen. Leeg betekent: deze agent ontvangt niets.
         * Alleen kleine letters, cijfers, punt en streepje — dat is wat een
         * e-mailadres links van de apenstaart betrouwbaar aankan.
         */
        /**
         * De publieke naam waarmee de website deze agent opzoekt. Alleen kleine
         * letters, cijfers en streepjes.
         *
         * Dit veld ontbrak, en dat heeft geld gekost: toen de website-assistent
         * per ongeluk werd verwijderd, kon hij niet opnieuw worden aangemaakt
         * zonder dat er iemand rechtstreeks in de database ging. Een waarde
         * waar de site op draait, hoort bereikbaar te zijn voor wie de site
         * beheert.
         */
        slug: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9-]{2,64}$/, "Alleen kleine letters, cijfers en streepjes.")
          .nullable()
          .optional(),
        inboundLocal: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9._-]{1,64}$/, "Alleen kleine letters, cijfers, punt en streepje.")
          .nullable()
          .optional(),
        // Welke schermen de klant krijgt; null is de standaard van de soort.
        modules: z
          .array(z.enum(ALLE_SCHERMEN as [Scherm, ...Scherm[]]))
          .nullable()
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    // Alleen meesturen wat is ingevuld: een veld dat niet in het formulier zat
    // mag niet stilletzwijgend op null worden gezet bij het opslaan van iets
    // anders, zoals een statuswijziging.
    const optioneel = <T>(waarde: T | undefined, sleutel: string) =>
      waarde === undefined ? {} : { [sleutel]: waarde };

    const row = {
      client_id: data.clientId,
      name: data.name,
      description: data.description,
      metric_label: data.metricLabel,
      score_label: data.scoreLabel,
      status: data.status,
      ...optioneel(data.kind, "kind"),
      ...optioneel(data.minutesSavedPerAction, "minutes_saved_per_action"),
      ...optioneel(data.minutesSavedBasis, "minutes_saved_basis"),
      ...optioneel(data.hourlyRate, "hourly_rate"),
      ...optioneel(data.hourlyRateBasis, "hourly_rate_basis"),
      ...optioneel(data.fairUsePerMonth, "fair_use_per_month"),
      ...optioneel(data.overagePrice, "overage_price"),
      ...optioneel(data.slug, "slug"),
      ...optioneel(data.inboundLocal, "inbound_local"),
      ...optioneel(data.modules, "modules"),
    };
    const { error } = data.id
      ? await context.supabase.from("agents").update(row).eq("id", data.id)
      : await context.supabase.from("agents").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { error } = await context.supabase.from("agents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveStat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        date: z.string().min(10),
        outputCount: z.number().int().min(0),
        performanceScore: z.number().min(0).max(100).nullable(),
        notes: z.string().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { error } = await context.supabase.from("agent_stats").upsert(
      {
        agent_id: data.agentId,
        date: data.date,
        output_count: data.outputCount,
        performance_score: data.performanceScore,
        notes: data.notes,
      },
      { onConflict: "agent_id,date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Verbruik per dag van één agent, plus de aanname over tijdwinst.
 *
 * Loopt via twee database-functies die zelf controleren of deze gebruiker
 * eigenaar is. Dat is strenger dan een controle hier, want hij geldt ook als
 * deze server function ooit vanaf een andere plek wordt aangeroepen.
 */
export const getAgentUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), days: z.number().int().min(1).max(365).default(30) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const [verbruik, instellingen] = await Promise.all([
      context.supabase.rpc("agent_usage_daily", { _agent_id: data.agentId, _days: data.days }),
      context.supabase.rpc("my_agent_settings", { _agent_id: data.agentId }),
    ]);

    if (verbruik.error) throw new Error(verbruik.error.message);
    if (instellingen.error) throw new Error(instellingen.error.message);

    const agent = (instellingen.data ?? [])[0] ?? null;

    return {
      dagen: verbruik.data ?? [],
      minutenPerActie: agent?.minutes_saved_per_action ?? null,
      grondslag: agent?.minutes_saved_basis ?? null,
    };
  });

/**
 * De maandstand van alle agents van deze gebruiker bij elkaar.
 *
 * Voor het dashboard: totaal aantal berichten, wat dat aan tijd en geld scheelt
 * volgens de afgesproken aannames, en hoeveel er boven de fair-use-grens zit.
 * Per agent apart erbij, zodat een klant met meerdere agents ziet waar het
 * vandaan komt.
 */
export const getMaandstand = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as unknown as {
      rpc: (
        naam: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data: agents, error } = await context.supabase
      .from("agents")
      .select("id, name, kind, status")
      .eq("client_id", await leesKlant(context));
    if (error) throw new Error(error.message);

    type Stand = {
      requests: number;
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens: number;
      fair_use_per_month: number | null;
      boven_grens: number;
      overage_price: number | null;
      overage_bedrag: number;
      minutes_saved_per_action: number | null;
      minutes_saved_basis: string | null;
      hourly_rate: number | null;
      hourly_rate_basis: string | null;
    };

    const perAgent = await Promise.all(
      (agents ?? []).map(async (a) => {
        const { data, error: fout } = await db.rpc("agent_month_summary", {
          _agent_id: a.id,
          _month_offset: 0,
        });
        if (fout) throw new Error(fout.message);
        const stand = ((data ?? []) as Stand[])[0] ?? null;
        return { agent: a, stand };
      }),
    );

    return perAgent;
  });

/** Wie er bij ons werkt: beheerders en support (fase 5). */
export const adminListMedewerkers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaf(context as Ctx);
    const [{ data: rollen }, { data: profielen }] = await Promise.all([
      context.supabase.from("user_roles").select("user_id, role"),
      context.supabase.from("profiles").select("id, name, email"),
    ]);
    const perId = new Map<string, string>();
    for (const r of (rollen ?? []) as Array<{ user_id: string; role: string }>) {
      if (r.role === "admin") perId.set(r.user_id, "Beheerder");
      else if (r.role === "support" && !perId.has(r.user_id)) perId.set(r.user_id, "Support");
    }
    return ((profielen ?? []) as Array<{ id: string; name: string; email: string }>)
      .filter((p) => perId.has(p.id))
      .map((p) => ({ ...p, rol: perId.get(p.id)! }));
  });

/**
 * Een support-medewerker toevoegen. Die ziet het overzicht in /admin en mag
 * meekijken, maar maakt geen klanten aan en wijzigt geen agents. Alleen de
 * beheerder kan dit.
 */
export const adminNodigMedewerkerUit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        naam: z.string().trim().min(1).max(100),
        email: z.string().trim().toLowerCase().email(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: {
        data: { name: data.naam },
        redirectTo: "https://zakelijkeaiagents.nl/reset-password",
      },
    });
    if (error || !link.user) throw new Error(error?.message ?? "Uitnodigen lukte niet");

    // 'support' staat pas na de migratie van fase 5 in de gegenereerde types.
    const { error: rolFout } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          insert: (r: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .from("user_roles")
      .insert({ user_id: link.user.id, role: "support" });
    if (rolFout) {
      await supabaseAdmin.auth.admin.deleteUser(link.user.id);
      throw new Error(rolFout.message);
    }

    const { esc, opmaak, stuurMail } = await import("@/lib/mail.server");
    await stuurMail({
      aan: [data.email],
      onderwerp: "Je account voor het beheer van Zakelijke AI Agents",
      html: opmaak(
        [
          `Hoi ${esc(data.naam)},`,
          "Je bent toegevoegd als support-medewerker. Je ziet welke agents er bij klanten draaien en kunt bij een storing meekijken. Wat je bij een klant bekijkt, ziet die klant terug in zijn toegangslog.",
          "Kies via de knop een wachtwoord. De link werkt één keer.",
        ],
        { tekst: "Wachtwoord kiezen", url: link.properties.action_link },
      ),
    });
    return { ok: true as const };
  });
