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

export const CATEGORIES = [
  "bedrijf",
  "agents",
  "prijzen",
  "veelgestelde vragen",
  "bezwaren",
  "proces",
  "overig",
] as const;

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data, error } = await context.supabase
      .from("knowledge_items")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        category: z.string().min(1),
        title: z.string().min(1),
        question: z.string().nullable().default(null),
        content: z.string().default(""),
        tags: z.array(z.string()).default([]),
        sortOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
        // Voor welke agent deze kennis is. Standaard onze eigen
        // website-assistent, zodat het beheerscherm werkt zoals het was.
        // Vanaf fase 2 kiest een klant hier zijn eigen agent.
        agentSlug: z.string().min(1).default("website-assistent"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const row = {
      category: data.category,
      title: data.title,
      question: data.question && data.question.trim() !== "" ? data.question : null,
      content: data.content,
      tags: data.tags,
      sort_order: data.sortOrder,
      is_active: data.isActive,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("knowledge_items")
        .update(row)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    // Nieuwe kennisitems horen bij onze eigen Website-assistent.
    // Bewust via de agents-tabel en niet via resolve_live_agent: die geeft
    // alleen live agents terug, en je moet kennis kunnen klaarzetten voor een
    // agent van een nieuwe klant die nog op setup staat.
    const { data: agent, error: agentError } = await context.supabase
      .from("agents")
      .select("id")
      .eq("slug", data.agentSlug)
      .maybeSingle();
    if (agentError) throw new Error(agentError.message);
    if (!agent) throw new Error("Agent 'website-assistent' niet gevonden");
    const { error } = await context.supabase
      .from("knowledge_items")
      .insert({ ...row, agent_id: agent.id as string });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { error } = await context.supabase.from("knowledge_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data, error } = await context.supabase
      .from("knowledge_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);

    const items = (data ?? []).map((i: any) => ({
      category: i.category,
      title: i.title,
      question: i.question ?? null,
      content: i.content,
      tags: i.tags ?? [],
    }));

    const byCategory = new Map<string, typeof items>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }

    const lines: string[] = [
      "# Zakelijke AI Agents — kennisbank voor AI agent training",
      `# Geëxporteerd: ${new Date().toISOString().slice(0, 10)}`,
      "",
    ];
    for (const [category, list] of byCategory) {
      lines.push(`## ${category.toUpperCase()}`, "");
      for (const item of list) {
        lines.push(`### ${item.title}`);
        if (item.question) lines.push(`Vraag: ${item.question}`);
        lines.push(item.content);
        if (item.tags.length > 0) lines.push(`Labels: ${item.tags.join(", ")}`);
        lines.push("");
      }
    }

    return { count: items.length, json: items, text: lines.join("\n") };
  });
