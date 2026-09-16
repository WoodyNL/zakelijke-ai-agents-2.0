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
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const row = {
      client_id: data.clientId,
      name: data.name,
      description: data.description,
      metric_label: data.metricLabel,
      score_label: data.scoreLabel,
      status: data.status,
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
