import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

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
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    return {
      id: context.userId,
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      isAdmin,
    };
  });

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: agents, error } = await context.supabase
      .from("agents")
      .select("*")
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

    return (agents ?? []).map((a: any) => {
      const rows = (stats ?? []).filter((s: any) => s.agent_id === a.id);
      const total = rows.reduce((sum: number, s: any) => sum + (s.output_count ?? 0), 0);
      const scored = rows.filter((s: any) => s.performance_score != null);
      const score = scored.length
        ? scored.reduce((sum: number, s: any) => sum + Number(s.performance_score), 0) /
          scored.length
        : null;
      return { ...a, total30: total, score30: score, series: rows };
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

export const adminListClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const [{ data: profiles }, { data: agents }] = await Promise.all([
      context.supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      context.supabase.from("agents").select("*").order("created_at", { ascending: true }),
    ]);
    return (profiles ?? []).map((p: any) => ({
      ...p,
      agents: (agents ?? []).filter((a: any) => a.client_id === p.id),
    }));
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
        kind: z
          .enum(["chat_assistent", "sales_assistent", "inbox_draft", "whatsapp_followup", "overig"])
          .optional(),

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
      .select("id, name, kind, status");
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
