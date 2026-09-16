import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CATEGORIES = [
  "bedrijf",
  "agents",
  "prijzen",
  "veelgestelde vragen",
  "bezwaren",
  "proces",
  "overig",
] as const;

/**
 * De kennisitems die deze gebruiker mag zien. Geen assertAdmin meer: RLS
 * bepaalt de grens. Een beheerder krijgt alles via "Admins manage knowledge",
 * een klant alleen de kennis van zijn eigen agents via "Clients manage
 * knowledge of own agents". Dat is strenger dan een controle in de code, want
 * hij geldt ook als deze functie ooit ergens anders wordt aangeroepen.
 */
export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
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
    // Geen rolcontrole: RLS laat een klant alleen schrijven naar kennis van zijn
    // eigen agents, en de agent-opzoeking hieronder valt onder dezelfde regels.
    // Een klant die de slug van een ander opgeeft, vindt niets.
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
    // RLS beslist of dit item van deze gebruiker is; een vreemd id raakt niets.
    const { error } = await context.supabase.from("knowledge_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("knowledge_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);

    type Rij = {
      category: string;
      title: string;
      question: string | null;
      content: string;
      tags: string[] | null;
    };

    const items = ((data ?? []) as Rij[]).map((i) => ({
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
