import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent } from "@/lib/agent-toegang";

/**
 * Teruglezen wat de chat-assistent met bezoekers besprak.
 *
 * Lezen gaat met de sessie van de gebruiker, dus de database bepaalt wat hij
 * ziet. En die laat hier minder toe dan elders: alleen de eigenaar en zijn
 * teamleden. Wij niet, support niet, en een meekijkende beheerder ook niet.
 *
 * Dat laatste is geen omissie. Een gesprek met een bezoeker is inhoud van de
 * klant — dezelfde afspraak als bij de kennisbank. Meekijken is er om een
 * scherm te kunnen uitleggen, niet om mee te lezen.
 */

// De tabellen staan pas in de gegenereerde types na de migratie.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ongetypt = { from: (t: string) => any };

export type GesprekRegel = {
  id: string;
  begonnen_op: string;
  laatste_op: string;
  beurten: number;
  pagina: string | null;
  lead_vastgelegd: boolean;
  /** De eerste vraag van de bezoeker; genoeg om het gesprek te herkennen. */
  opening: string;
};

export type Gesprekken = {
  gesprekken: GesprekRegel[];
  /** Staat het bewaren aan? Zo niet, dan blijft deze lijst altijd leeg. */
  bewaren: boolean;
  bewaartermijn: number;
};

export type GesprekBericht = {
  id: number;
  rol: "bezoeker" | "agent";
  tekst: string;
  op: string;
};

export const haalGesprekken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<Gesprekken> => {
    const sb = context.supabase as unknown as Ongetypt;
    // De instellingen erbij: het scherm hoort te vertellen hoe lang dit blijft
    // staan, anders is "we bewaren het" een loze mededeling.
    const { data: agent } = await sb
      .from("agents")
      .select("opties")
      .eq("id", data.agentId)
      .maybeSingle();
    const opties = ((agent as { opties?: Record<string, unknown> } | null)?.opties ?? {}) as Record<
      string,
      unknown
    >;
    const bewaren = opties["gesprekken_bewaren"] !== false;
    const bewaartermijn = Number(opties["bewaartermijn_dagen"] ?? 90);

    const { data: rijen, error } = await sb
      .from("chatgesprekken")
      .select("id, begonnen_op, laatste_op, beurten, pagina, lead_vastgelegd")
      .eq("agent_id", data.agentId)
      .order("laatste_op", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const gesprekken = (rijen ?? []) as Array<Omit<GesprekRegel, "opening">>;
    if (gesprekken.length === 0) return { gesprekken: [], bewaren, bewaartermijn };

    // De openingsvraag erbij in één extra query. Per gesprek apart zou honderd
    // rondjes naar de database kosten voor één lijstje.
    const { data: berichten } = await sb
      .from("chatberichten")
      .select("gesprek_id, tekst, op")
      .in(
        "gesprek_id",
        gesprekken.map((g) => g.id),
      )
      .eq("rol", "bezoeker")
      .order("op", { ascending: true });

    const eerste = new Map<string, string>();
    for (const b of (berichten ?? []) as Array<{ gesprek_id: string; tekst: string }>) {
      if (!eerste.has(b.gesprek_id)) eerste.set(b.gesprek_id, b.tekst);
    }

    return {
      gesprekken: gesprekken.map((g) => ({ ...g, opening: eerste.get(g.id) ?? "" })),
      bewaren,
      bewaartermijn,
    };
  });

export const haalGesprek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<GesprekBericht[]> => {
    const sb = context.supabase as unknown as Ongetypt;
    const { data: rijen, error } = await sb
      .from("chatberichten")
      .select("id, rol, tekst, op")
      .eq("gesprek_id", data.id)
      .order("op", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rijen ?? []) as GesprekBericht[];
  });

/**
 * Een gesprek wissen.
 *
 * Eerst eigendom controleren, net als overal waar iets verandert: lezen mag
 * ruimer dan wijzigen. Daarna doet de database het; de berichten gaan mee.
 */
export const verwijderGesprek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), agentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as { supabase: unknown; userId: string }, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const { error } = await sb.from("chatgesprekken").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * De vragen die de assistent niet kon beantwoorden, met de knop om ze in de
 * kennisbank te zetten. Dit is de goedkoopste manier om een assistent beter
 * te maken: elke vraag hier is er één die de volgende bezoeker wél
 * beantwoord krijgt.
 */
export type OnbeantwoordeVraag = {
  gesprek_id: string;
  vraag: string;
  antwoord: string;
  op: string;
};

export const haalOnbeantwoord = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<OnbeantwoordeVraag[]> => {
    const { data: rijen, error } = await (
      context.supabase as unknown as {
        rpc: (
          n: string,
          a: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("onbeantwoorde_vragen", { _agent_id: data.agentId, _limiet: 50 });
    if (error) return [];
    return (rijen ?? []) as OnbeantwoordeVraag[];
  });

export const zetInKennisbank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        vraag: z.string().trim().min(3).max(500),
        antwoord: z.string().trim().min(3).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as { supabase: unknown; userId: string }, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const { error } = await sb.from("knowledge_items").insert({
      agent_id: data.agentId,
      category: "veelgestelde vragen",
      title: data.vraag.slice(0, 200),
      question: data.vraag,
      content: data.antwoord,
      is_active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
